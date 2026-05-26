"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_PROGRAMME,
  EXPORT_HEADERS,
  Programme,
  ProgrammeTask,
  cloneProgramme,
  normaliseProgramme,
  uniq
} from "@/lib/programme";

const LOCAL_CACHE_KEY = "projectTrackerSharedCacheV2";

type Totals = {
  projectCost: number;
  claim: number;
};

type PendingConfirm =
  | { kind: "delete"; rowIndex: number; no: string; taskName: string }
  | { kind: "reset" };

export function WorkProgrammeApp() {
  const [programme, setProgramme] = useState<Programme>(() => cloneProgramme(DEFAULT_PROGRAMME));
  const latestRef = useRef(programme);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("Opening shared tracker...");
  const [toast, setToast] = useState("");
  const [showNames, setShowNames] = useState(false);
  const [taskNameList, setTaskNameList] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    latestRef.current = programme;
  }, [programme]);

  useEffect(() => {
    let active = true;

    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const cachedProgramme = normaliseProgramme(JSON.parse(cached));
        latestRef.current = cachedProgramme;
        setProgramme(cachedProgramme);
        setMessage("Showing last opened tracker while checking shared data...");
      }
    } catch {
      localStorage.removeItem(LOCAL_CACHE_KEY);
    }

    fetch("/api/programme", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) throw new Error(payload.error || "Shared tracker could not be loaded.");
        const loaded = normaliseProgramme(payload);
        latestRef.current = loaded;
        setProgramme(loaded);
        setDirty(false);
        setMessage(loaded.updatedAt ? `Loaded shared tracker version ${loaded.version}` : "Loaded starter tracker");
      })
      .catch((error: Error) => {
        if (active) setMessage(error.message || "Shared tracker could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(programme));
    } catch {
      // Local cache is optional; the shared API remains the source of truth.
    }
  }, [loading, programme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programme.tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => !query || task.taskName.toLowerCase().includes(query));
  }, [programme.tasks, search]);

  const allTotals = useMemo(() => calculateTotals(programme.tasks), [programme.tasks]);
  const visibleTotals = useMemo(() => calculateTotals(visibleRows.map(({ task }) => task)), [visibleRows]);
  const selectedTask = selectedRowIndex === null ? null : programme.tasks[selectedRowIndex] || null;

  function showToast(value: string) {
    setToast(value);
  }

  function updateProgramme(producer: (draft: Programme) => void) {
    setProgramme((current) => {
      const draft = cloneProgramme(current);
      producer(draft);
      const next = normaliseProgramme(draft, current);
      latestRef.current = next;
      return next;
    });
    setDirty(true);
  }

  function updateField<K extends keyof Programme>(key: K, value: Programme[K]) {
    updateProgramme((draft) => {
      draft[key] = value;
    });
  }

  function updateTask(index: number, producer: (task: ProgrammeTask) => void) {
    updateProgramme((draft) => {
      const task = draft.tasks[index];
      if (task) producer(task);
    });
  }

  function addRow() {
    updateProgramme((draft) => {
      const last = draft.tasks[draft.tasks.length - 1];
      const nextNo = draft.tasks.length ? Math.max(...draft.tasks.map((task) => Number(task.no) || 0)) + 1 : 1;
      const start = last?.actualFinish || isoDate(new Date());
      draft.tasks.push({
        no: String(nextNo),
        mode: "Task",
        taskName: draft.taskNames[0] || "New Task",
        projectCost: 0,
        claim: 0,
        duration: 1,
        actualStart: start,
        actualFinish: start,
        baselineStart: start,
        baselineFinish: start,
        progress: 0
      });
    });
    setSelectedRowIndex(programme.tasks.length);
    showToast("Task row added");
  }

  function updateDate(index: number, key: "actualStart" | "actualFinish" | "baselineStart" | "baselineFinish", value: string) {
    updateTask(index, (task) => {
      task[key] = value;
      if (key === "actualStart" && task.duration > 0) task.actualFinish = addDays(value, task.duration - 1);
      if (key === "baselineStart" && task.duration > 0) task.baselineFinish = addDays(value, task.duration - 1);
      if (key === "actualFinish" && task.actualStart) task.duration = inclusiveDays(task.actualStart, value);
    });
  }

  function updateDuration(index: number, value: string) {
    updateTask(index, (task) => {
      task.duration = Math.max(0, Number(value || 0));
      const add = Math.max(0, task.duration - 1);
      if (task.actualStart) task.actualFinish = addDays(task.actualStart, add);
      if (task.baselineStart) task.baselineFinish = addDays(task.baselineStart, add);
    });
  }

  function renumberRows() {
    updateProgramme((draft) => {
      draft.tasks = draft.tasks.map((task, index) => ({ ...task, no: String(index + 1) }));
    });
    showToast("Rows renumbered");
  }

  function clearFilter() {
    setSearch("");
    showToast(search ? "Filter cleared" : "No filter active");
  }

  function openTaskNames() {
    setTaskNameList(programme.taskNames.join("\n"));
    setShowNames(true);
  }

  function saveTaskNames() {
    const names = uniq(taskNameList.split(/\r?\n/));
    if (!names.length) {
      showToast("Keep at least one task name");
      return;
    }
    updateProgramme((draft) => {
      draft.taskNames = names;
      draft.tasks = draft.tasks.map((task) => ({
        ...task,
        taskName: names.includes(task.taskName) ? task.taskName : names[0]
      }));
    });
    setShowNames(false);
    showToast("Task list saved");
  }

  async function saveShared() {
    setSaving(true);
    setMessage("Saving shared tracker...");
    try {
      const response = await fetch("/api/programme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestRef.current)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Save failed");
      const saved = normaliseProgramme(payload, latestRef.current);
      latestRef.current = saved;
      setProgramme(saved);
      setDirty(false);
      setMessage(`Saved shared tracker version ${saved.version}`);
      showToast("Saved");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Save failed";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function syncShared() {
    if (dirty && !window.confirm("Reload latest saved data and discard unsaved changes?")) return;
    setLoading(true);
    setMessage("Syncing shared tracker...");
    try {
      const response = await fetch("/api/programme", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Sync failed");
      const loaded = normaliseProgramme(payload, latestRef.current);
      latestRef.current = loaded;
      setProgramme(loaded);
      setDirty(false);
      setMessage(loaded.updatedAt ? `Loaded shared tracker version ${loaded.version}` : "Loaded starter tracker");
      showToast("Synced");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    const html = buildExcelHtml(latestRef.current);
    downloadBlob(new Blob([html], { type: "application/vnd.ms-excel" }), `project-tracker-${fileDate()}.xls`);
    showToast("Excel exported");
  }

  function exportPdf() {
    const pdf = buildPdfReport(latestRef.current);
    downloadBlob(new Blob([pdf], { type: "application/pdf" }), `project-tracker-${fileDate()}.pdf`);
    showToast("PDF exported");
  }

  function printPage() {
    window.print();
  }

  function confirmAction() {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === "delete") {
      updateProgramme((draft) => {
        if (draft.tasks[pendingConfirm.rowIndex]?.no === pendingConfirm.no) draft.tasks.splice(pendingConfirm.rowIndex, 1);
      });
      setSelectedRowIndex(null);
      setPendingConfirm(null);
      showToast("Task row deleted");
      return;
    }
    const starter = cloneProgramme(DEFAULT_PROGRAMME);
    latestRef.current = starter;
    setProgramme(starter);
    setDirty(true);
    setSelectedRowIndex(null);
    setPendingConfirm(null);
    showToast("Starter tracker restored");
  }

  return (
    <main className="app-shell">
      <section className="top">
        <div className="title-wrap">
          <span className="small-label">Shared Tracker</span>
          <h1>
            <input
              aria-label="Project"
              value={programme.projectName}
              onChange={(event) => updateField("projectName", event.target.value)}
            />
          </h1>
          <div className="compact-meta">
            <MetaInput label="Project Code" value={programme.projectCode} onChange={(value) => updateField("projectCode", value)} />
            <MetaInput label="Date Created" type="date" value={programme.projectDate} onChange={(value) => updateField("projectDate", value)} />
            <MetaInput label="Period Start" type="date" value={programme.periodStart} onChange={(value) => updateField("periodStart", value)} />
            <MetaInput label="Period Finish" type="date" value={programme.periodFinish} onChange={(value) => updateField("periodFinish", value)} />
            <label className="meta-item sum-item">
              Original Contract Sum
              <AmountInput value={programme.originalContractSum} onChange={(value) => updateField("originalContractSum", parseAmount(value))} label="Original Contract Sum" />
            </label>
            <div className={`meta-item status ${dirty ? "dirty" : ""}`}>
              Status
              <strong>{dirty ? "Unsaved" : "Saved"}</strong>
            </div>
          </div>
        </div>

        <div className="top-actions">
          <button className="btn primary" type="button" onClick={addRow}>Add Row</button>
          <button className="btn" type="button" onClick={openTaskNames}>Task List</button>
          <button className="btn primary" type="button" onClick={saveShared} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          <button className="btn" type="button" onClick={syncShared} disabled={loading}>Sync</button>
          <button className="btn" type="button" onClick={exportExcel}>Excel</button>
          <button className="btn" type="button" onClick={exportPdf}>PDF</button>
          <button className="btn" type="button" onClick={printPage}>Print</button>
          <button className="btn danger" type="button" onClick={() => setPendingConfirm({ kind: "reset" })}>Reset</button>
        </div>
      </section>

      <section className="toolbar" aria-label="Tracker tools">
        <input aria-label="Search task names" placeholder="Search task name" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="btn" type="button" onClick={clearFilter}>Clear Filter</button>
        <button className="btn" type="button" onClick={renumberRows}>Renumber No.</button>
        <span className="selected-info">
          {selectedTask ? `Selected No. ${selectedTask.no}: ${selectedTask.taskName}` : "No row selected"}
        </span>
      </section>

      <section className="notice">
        <span>{message}</span>
        <span>No login required</span>
      </section>

      <section className="schedule-card">
        <div className="schedule-title">
          <strong>{displayDate(programme.periodStart)} - {displayDate(programme.periodFinish)}</strong>
          <span>
            Showing {visibleRows.length} of {programme.tasks.length} rows | Total Project Cost {formatAmount(visibleTotals.projectCost)} | Total Claim {formatAmount(visibleTotals.claim)}
          </span>
        </div>
        <div className="scroll-wrap">
          <div className="sheet">
            <div className="left-header">
              {["No.", "Task Name", "Project Cost", "Claim", "Duration", "Actual Start", "Actual Finish", "Baseline Estimated Start", "Baseline Estimated Finish", ""].map((label) => (
                <div className={`hcell ${label === "" ? "action-header" : ""}`} key={label || "action"}>{label}</div>
              ))}
            </div>
            <div className="left-body">
              {visibleRows.map(({ task, index }) => (
                <TaskRow
                  key={`${task.no}-${index}`}
                  task={task}
                  index={index}
                  selected={selectedRowIndex === index}
                  taskNames={programme.taskNames}
                  onSelect={() => setSelectedRowIndex(index)}
                  onDelete={() => setPendingConfirm({ kind: "delete", rowIndex: index, no: task.no, taskName: task.taskName })}
                  onCell={(key, value) => {
                    if (key === "duration") updateDuration(index, value);
                    else if (["actualStart", "actualFinish", "baselineStart", "baselineFinish"].includes(key)) updateDate(index, key as "actualStart", value);
                    else updateTask(index, (draft) => {
                      if (key === "no" || key === "taskName") draft[key] = value;
                      if (key === "projectCost" || key === "claim") draft[key] = parseAmount(value);
                    });
                  }}
                />
              ))}
              <TotalsRow totals={allTotals} visibleTotals={visibleTotals} filtered={visibleRows.length !== programme.tasks.length} />
            </div>
          </div>
        </div>
      </section>

      {showNames && (
        <Modal title="Task List" onClose={() => setShowNames(false)}>
          <textarea aria-label="Task names" value={taskNameList} onChange={(event) => setTaskNameList(event.target.value)} />
          <div className="modal-footer">
            <button className="btn" type="button" onClick={() => setShowNames(false)}>Cancel</button>
            <button className="btn primary" type="button" onClick={saveTaskNames}>Save List</button>
          </div>
        </Modal>
      )}

      {pendingConfirm && (
        <Modal title={pendingConfirm.kind === "delete" ? "Delete Row" : "Reset Tracker"} onClose={() => setPendingConfirm(null)}>
          <p>
            {pendingConfirm.kind === "delete"
              ? `Delete No. ${pendingConfirm.no}: ${pendingConfirm.taskName}?`
              : "Reset this browser to the starter tracker? Save after reset to replace the shared tracker."}
          </p>
          <div className="modal-footer">
            <button className="btn" type="button" onClick={() => setPendingConfirm(null)}>Cancel</button>
            <button className="btn danger" type="button" onClick={confirmAction}>{pendingConfirm.kind === "delete" ? "Delete" : "Reset"}</button>
          </div>
        </Modal>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}

function MetaInput({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="meta-item">
      {label}
      <input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TaskRow({
  task,
  index,
  selected,
  taskNames,
  onSelect,
  onDelete,
  onCell
}: {
  task: ProgrammeTask;
  index: number;
  selected: boolean;
  taskNames: string[];
  onSelect: () => void;
  onDelete: () => void;
  onCell: (key: keyof ProgrammeTask, value: string) => void;
}) {
  const isSummary = task.mode === "Summary" || task.mode === "Project Summary";
  return (
    <div className={`row left-row ${isSummary ? "summary-row" : ""} ${selected ? "selected" : ""}`} role="button" tabIndex={0} onClick={onSelect}>
      <Cell label="No."><input className="no-input" aria-label="No." value={task.no} onClick={stop} onChange={(event) => onCell("no", event.target.value)} /></Cell>
      <Cell label="Task Name" bold={isSummary}>
        <select aria-label="Task name" value={task.taskName} onClick={stop} onChange={(event) => onCell("taskName", event.target.value)}>
          {taskNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </Cell>
      <Cell label="Project Cost"><AmountInput label="Project Cost" value={task.projectCost} onChange={(value) => onCell("projectCost", value)} /></Cell>
      <Cell label="Claim"><AmountInput label="Claim" value={task.claim} onChange={(value) => onCell("claim", value)} /></Cell>
      <Cell label="Duration"><input aria-label="Duration" type="number" min="0" value={task.duration} onClick={stop} onChange={(event) => onCell("duration", event.target.value)} /></Cell>
      <DateCell label="Actual Start" value={task.actualStart} onChange={(value) => onCell("actualStart", value)} />
      <DateCell label="Actual Finish" value={task.actualFinish} onChange={(value) => onCell("actualFinish", value)} />
      <DateCell label="Baseline Estimated Start" value={task.baselineStart} onChange={(value) => onCell("baselineStart", value)} />
      <DateCell label="Baseline Estimated Finish" value={task.baselineFinish} onChange={(value) => onCell("baselineFinish", value)} />
      <Cell label="Delete">
        <button className="row-delete-btn" aria-label={`Delete row No. ${task.no}`} title="Delete row" type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
          <span className="bin-icon" aria-hidden="true" />
        </button>
      </Cell>
    </div>
  );
}

function Cell({ label, children, bold = false }: { label: string; children: React.ReactNode; bold?: boolean }) {
  return <div className={`cell ${bold ? "bold" : ""}`} data-label={label}>{children}</div>;
}

function DateCell({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Cell label={label}>
      <input aria-label={label} type="date" value={value} onClick={stop} onChange={(event) => onChange(event.target.value)} />
    </Cell>
  );
}

function TotalsRow({ totals, visibleTotals, filtered }: { totals: Totals; visibleTotals: Totals; filtered: boolean }) {
  const display = filtered ? visibleTotals : totals;
  return (
    <div className="row left-row totals-row">
      <Cell label="No."><strong /></Cell>
      <Cell label="Task Name"><strong>{filtered ? "Total Shown" : "Total"}</strong></Cell>
      <Cell label="Project Cost"><strong className="amount-total">{formatAmount(display.projectCost)}</strong></Cell>
      <Cell label="Claim"><strong className="amount-total">{formatAmount(display.claim)}</strong></Cell>
      <Cell label="Duration"><strong /></Cell>
      <Cell label="Actual Start"><strong /></Cell>
      <Cell label="Actual Finish"><strong /></Cell>
      <Cell label="Baseline Estimated Start"><strong /></Cell>
      <Cell label="Baseline Estimated Finish"><strong /></Cell>
      <Cell label="Delete"><strong /></Cell>
    </div>
  );
}

function AmountInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(amountInputValue(value));
  useEffect(() => setDraft(amountInputValue(value)), [value]);
  return (
    <input
      className="amount-input"
      aria-label={label}
      inputMode="decimal"
      value={draft}
      onClick={stop}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onBlur={() => setDraft(amountInputValue(parseAmount(draft)))}
    />
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal large" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function calculateTotals(tasks: ProgrammeTask[]): Totals {
  return tasks.reduce((totals, task) => ({
    projectCost: totals.projectCost + Number(task.projectCost || 0),
    claim: totals.claim + Number(task.claim || 0)
  }), { projectCost: 0, claim: 0 });
}

function parseAmount(value: string) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function amountInputValue(value: number) {
  return Number(value || 0) ? String(value) : "";
}

function formatAmount(value: number) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stop(event: React.MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function exportRows(programme: Programme) {
  const totals = calculateTotals(programme.tasks);
  return [
    ...programme.tasks.map((task) => [
      task.no,
      task.taskName,
      formatAmount(task.projectCost),
      formatAmount(task.claim),
      task.duration,
      task.actualStart,
      task.actualFinish,
      task.baselineStart,
      task.baselineFinish
    ]),
    ["", "Total", formatAmount(totals.projectCost), formatAmount(totals.claim), "", "", "", "", ""]
  ];
}

function buildExcelHtml(programme: Programme) {
  const header = EXPORT_HEADERS.map((value) => `<th>${escapeHtml(value)}</th>`).join("");
  const rows = exportRows(programme).map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><h1>${escapeHtml(programme.projectName || "Project Tracker")}</h1><p>Project Code: ${escapeHtml(programme.projectCode || "-")}</p><p>Date Created: ${escapeHtml(programme.projectDate)} | Period: ${escapeHtml(programme.periodStart)} to ${escapeHtml(programme.periodFinish)}</p><p>Original Contract Sum: ${escapeHtml(formatAmount(programme.originalContractSum))}</p><table border="1"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function buildPdfReport(programme: Programme) {
  const lines = [
    "Project Tracker",
    `Project: ${programme.projectName || "-"}`,
    `Project Code: ${programme.projectCode || "-"}`,
    `Date Created: ${programme.projectDate || "-"}    Period: ${programme.periodStart || "-"} to ${programme.periodFinish || "-"}`,
    `Original Contract Sum: ${formatAmount(programme.originalContractSum)}`,
    "",
    "No.  Task Name                         Cost       Claim      Dur Start      Finish",
    "---- -------------------------------- ---------- ---------- --- ---------- ----------",
    ...programme.tasks.map((task) => [
      fixedText(task.no, 4),
      fixedText(task.taskName, 32),
      fixedText(formatAmount(task.projectCost), 10, "left"),
      fixedText(formatAmount(task.claim), 10, "left"),
      fixedText(String(task.duration), 3, "left"),
      fixedText(task.actualStart, 10),
      fixedText(task.actualFinish, 10)
    ].join(" ")),
    "",
    `Total Project Cost: ${formatAmount(calculateTotals(programme.tasks).projectCost)}    Total Claim: ${formatAmount(calculateTotals(programme.tasks).claim)}`
  ];
  return createPdf(lines);
}

function createPdf(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 28;
  const startY = 804;
  const lineHeight = 11;
  const fontSize = 8;
  const maxRows = 62;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += maxRows) pages.push(lines.slice(index, index + maxRows));
  const objects: Array<{ id: number; body: string }> = [];
  const fontId = 3 + pages.length * 2;
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects.push({ id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" });
  objects.push({ id: 2, body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>` });
  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const content = pageLines
      .map((line, lineIndex) => `BT /F1 ${fontSize} Tf ${marginLeft} ${startY - lineIndex * lineHeight} Td (${escapePdfText(line)}) Tj ET`)
      .join("\n");
    objects.push({ id: pageId, body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>` });
    objects.push({ id: contentId, body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` });
  });
  objects.push({ id: fontId, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>" });
  objects.sort((left, right) => left.id - right.id);
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object) => {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) pdf += `${String(offsets[id] || 0).padStart(10, "0")} 00000 n \n`;
  return `${pdf}trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
}

function fixedText(value: unknown, width: number, align: "left" | "right" = "right") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const clipped = text.length > width ? `${text.slice(0, Math.max(0, width - 3))}...` : text;
  return align === "left" ? clipped.padStart(width) : clipped.padEnd(width);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function fileDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const date = parseDate(value);
  if (!date) return "";
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  return `${weekday} ${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getFullYear()).slice(-2)}`;
}

function addDays(iso: string, amount: number) {
  const date = parseDate(iso);
  if (!date) return "";
  date.setDate(date.getDate() + Number(amount || 0));
  return isoDate(date);
}

function inclusiveDays(start: string, finish: string) {
  const startDate = parseDate(start);
  const finishDate = parseDate(finish);
  if (!startDate || !finishDate) return 0;
  return Math.max(1, Math.round((finishDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
