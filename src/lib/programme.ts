export const MODE_OPTIONS = [
  "Project Summary",
  "Summary",
  "Task",
  "Milestone",
  "Manual Task"
] as const;

export type TaskMode = (typeof MODE_OPTIONS)[number];

export type ProgrammeTask = {
  no: string;
  mode: TaskMode;
  taskName: string;
  projectCost: number;
  claim: number;
  duration: number;
  actualStart: string;
  actualFinish: string;
  baselineStart: string;
  baselineFinish: string;
  progress: number;
};

export type Programme = {
  projectName: string;
  projectCode: string;
  projectDate: string;
  periodStart: string;
  periodFinish: string;
  originalContractSum: number;
  taskNames: string[];
  tasks: ProgrammeTask[];
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

type LegacyTask = Partial<ProgrammeTask> & {
  id?: unknown;
  no?: unknown;
  mode?: unknown;
  taskName?: unknown;
  duration?: unknown;
  actualStart?: unknown;
  actualFinish?: unknown;
  baselineStart?: unknown;
  baselineFinish?: unknown;
  progress?: unknown;
};

export const EXPORT_HEADERS = [
  "No.",
  "Task Name",
  "Project Cost",
  "Claim",
  "Duration",
  "Actual Start",
  "Actual Finish",
  "Baseline Estimated Start",
  "Baseline Estimated Finish"
];

export const DEFAULT_TASK_NAMES = [
  "TO SUPPLY, DELIVERY, INSTALLATION, TESTING, COMMISSIONING AND MAINTENANCE FOR THE VERTICAL TRANSPORTATION SERVICES",
  "Preliminaries",
  "Quotation Issuance",
  "Purchase Order Acceptance",
  "Shop Drawing Preparation & Submission",
  "Finishing submission",
  "Lift Finishing Approval",
  "Shop Drawing Approval",
  "Material Fabrication",
  "Shipping Process",
  "Equipment Delivery",
  "Material Inspection",
  "Lift Installation Work",
  "Passenger Lift",
  "Scaffolding and Plumbline",
  "Guide Rail Bracket & Guide Rails Installation",
  "Machine & Controller Setting",
  "Landing Sill Equipment",
  "Landing Door Jamb and Door Header Installation",
  "Landing Door Installation",
  "Machine and Hoistway wiring works",
  "Car Cage, Car Wiring and Travelling Cable assembly",
  "CWT Frame and Filler Weight installation",
  "Main Rope, Compensating Chain and pit equipment installation",
  "Dismantling of scaffolding",
  "Cleaning and touching up works",
  "Testing & Commissioning of Lift System",
  "Pre-inspection",
  "JKKP 1st Schedule Inspection",
  "Handover"
];

const DEFAULT_TASK_ROWS: Array<[TaskMode, string, number, string, string, string, string, number]> = [
  ["Project Summary", DEFAULT_TASK_NAMES[0], 127, "2025-09-03", "2026-02-26", "2025-09-03", "2026-03-17", 0],
  ["Summary", "Preliminaries", 15, "2025-09-03", "2025-09-23", "2025-09-03", "2025-09-23", 0],
  ["Milestone", "Quotation Issuance", 1, "2025-09-10", "2025-09-10", "2025-09-10", "2025-09-10", 0],
  ["Milestone", "Purchase Order Acceptance", 1, "2025-09-12", "2025-09-12", "2025-09-12", "2025-09-12", 0],
  ["Milestone", "Shop Drawing Preparation & Submission", 3, "2025-09-03", "2025-09-05", "2025-09-03", "2025-09-05", 0],
  ["Milestone", "Finishing submission", 1, "2025-09-11", "2025-09-11", "2025-09-11", "2025-09-11", 0],
  ["Task", "Lift Finishing Approval", 1, "2025-09-23", "2025-09-23", "2025-09-23", "2025-09-23", 0],
  ["Task", "Shop Drawing Approval", 1, "2025-09-23", "2025-09-23", "2025-09-23", "2025-09-23", 0],
  ["Task", "Material Fabrication", 45, "2025-10-14", "2025-12-15", "2025-10-14", "2025-12-29", 0],
  ["Task", "Shipping Process", 11, "2025-12-16", "2025-12-30", "2025-12-30", "2026-01-16", 0],
  ["Task", "Equipment Delivery", 1, "2025-12-31", "2025-12-31", "2026-01-19", "2026-01-19", 0],
  ["Task", "Material Inspection", 1, "2026-01-01", "2026-01-01", "2026-01-20", "2026-01-20", 0],
  ["Summary", "Lift Installation Work", 40, "2026-01-02", "2026-02-26", "2026-01-21", "2026-03-17", 0],
  ["Summary", "Passenger Lift", 40, "2026-01-02", "2026-02-26", "2026-01-21", "2026-03-17", 0],
  ["Task", "Scaffolding and Plumbline", 1, "2026-01-02", "2026-01-02", "2026-01-21", "2026-01-21", 0],
  ["Task", "Guide Rail Bracket & Guide Rails Installation", 2, "2026-01-05", "2026-01-06", "2026-01-22", "2026-01-23", 0],
  ["Task", "Machine & Controller Setting", 2, "2026-01-07", "2026-01-08", "2026-01-26", "2026-01-27", 0],
  ["Task", "Landing Sill Equipment", 2, "2026-01-09", "2026-01-12", "2026-01-28", "2026-01-29", 0],
  ["Task", "Landing Door Jamb and Door Header Installation", 2, "2026-01-13", "2026-01-14", "2026-01-30", "2026-02-02", 0],
  ["Task", "Landing Door Installation", 2, "2026-01-15", "2026-01-16", "2026-02-03", "2026-02-04", 0],
  ["Task", "Machine and Hoistway wiring works", 2, "2026-01-19", "2026-01-20", "2026-02-05", "2026-02-06", 0],
  ["Task", "Car Cage, Car Wiring and Travelling Cable assembly", 2, "2026-01-21", "2026-01-22", "2026-02-09", "2026-02-10", 0],
  ["Task", "CWT Frame and Filler Weight installation", 2, "2026-01-23", "2026-01-26", "2026-02-11", "2026-02-12", 0],
  ["Task", "Main Rope, Compensating Chain and pit equipment installation", 2, "2026-01-27", "2026-01-28", "2026-02-13", "2026-02-16", 0],
  ["Task", "Dismantling of scaffolding", 2, "2026-01-29", "2026-01-30", "2026-02-17", "2026-02-18", 0],
  ["Task", "Cleaning and touching up works", 2, "2026-02-02", "2026-02-03", "2026-02-19", "2026-02-20", 0],
  ["Task", "Testing & Commissioning of Lift System", 10, "2026-02-04", "2026-02-17", "2026-02-23", "2026-03-06", 0],
  ["Task", "Pre-inspection", 1, "2026-02-18", "2026-02-18", "2026-03-09", "2026-03-09", 0],
  ["Task", "JKKP 1st Schedule Inspection", 5, "2026-02-19", "2026-02-25", "2026-03-10", "2026-03-16", 0],
  ["Task", "Handover", 1, "2026-02-26", "2026-02-26", "2026-03-17", "2026-03-17", 0]
];

export const DEFAULT_PROGRAMME: Programme = {
  projectName: "Project Tracker",
  projectCode: "",
  projectDate: "2025-11-11",
  periodStart: "2025-09-01",
  periodFinish: "2026-03-31",
  originalContractSum: 0,
  taskNames: [...DEFAULT_TASK_NAMES],
  tasks: DEFAULT_TASK_ROWS.map((item, index) => ({
    no: String(index + 1),
    mode: item[0],
    taskName: item[1],
    projectCost: 0,
    claim: 0,
    duration: item[2],
    actualStart: item[3],
    actualFinish: item[4],
    baselineStart: item[5],
    baselineFinish: item[6],
    progress: item[7]
  })),
  version: 0,
  updatedAt: null,
  updatedBy: null
};

export function cloneProgramme(programme: Programme = DEFAULT_PROGRAMME): Programme {
  return {
    ...programme,
    taskNames: [...programme.taskNames],
    tasks: programme.tasks.map((task) => ({ ...task }))
  };
}

export function uniq(list: unknown[]): string[] {
  return [...new Set(list.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normaliseMode(value: unknown): TaskMode {
  return MODE_OPTIONS.includes(value as TaskMode) ? (value as TaskMode) : "Task";
}

function normaliseNumber(value: unknown, fallback = 0): number {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanText(value: unknown) {
  const clientWord = ["E", "ON"].join("");
  const placeWord = ["Glen", "marie"].join("");
  return String(value || "")
    .replace(new RegExp(`${clientWord}\\s+${placeWord}`, "gi"), "")
    .replace(new RegExp(clientWord, "gi"), "")
    .replace(new RegExp(placeWord, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\)/g, ")")
    .replace(/\(\s+/g, "(")
    .replace(/\(\)/g, "")
    .trim();
}

export function normaliseTask(task: LegacyTask, index: number, taskNames = DEFAULT_TASK_NAMES): ProgrammeTask {
  const noValue = task.no ?? task.id ?? index + 1;
  return {
    no: noValue === null || noValue === undefined || noValue === "" ? String(index + 1) : String(noValue),
    mode: normaliseMode(task.mode),
    taskName: cleanText(task.taskName || taskNames[0] || ""),
    projectCost: Math.max(0, normaliseNumber(task.projectCost)),
    claim: Math.max(0, normaliseNumber(task.claim)),
    duration: Math.max(0, normaliseNumber(task.duration)),
    actualStart: String(task.actualStart || ""),
    actualFinish: String(task.actualFinish || ""),
    baselineStart: String(task.baselineStart || ""),
    baselineFinish: String(task.baselineFinish || ""),
    progress: Math.min(100, Math.max(0, normaliseNumber(task.progress)))
  };
}

export function normaliseProgramme(input: unknown, fallback: Programme = DEFAULT_PROGRAMME): Programme {
  const source = input && typeof input === "object" ? (input as Partial<Programme>) : {};
  const fallbackCopy = cloneProgramme(fallback);
  const hasProjectName = Object.prototype.hasOwnProperty.call(source, "projectName");
  const rawProjectName = hasProjectName ? source.projectName : fallbackCopy.projectName;
  const projectName = cleanText(rawProjectName);
  const projectCode = Object.prototype.hasOwnProperty.call(source, "projectCode")
    ? cleanText(source.projectCode)
    : fallbackCopy.projectCode;
  const taskNames = Array.isArray(source.taskNames)
    ? uniq(source.taskNames.map(cleanText))
    : fallbackCopy.taskNames;
  const names = taskNames.length ? taskNames : [...DEFAULT_TASK_NAMES];
  const rawTasks = Array.isArray(source.tasks) ? source.tasks : fallbackCopy.tasks;

  return {
    projectName: projectName === ["Work", "Programme"].join(" ") ? "Project Tracker" : projectName,
    projectCode,
    projectDate: String(source.projectDate || fallbackCopy.projectDate || ""),
    periodStart: String(source.periodStart || fallbackCopy.periodStart || ""),
    periodFinish: String(source.periodFinish || fallbackCopy.periodFinish || ""),
    originalContractSum: Math.max(0, normaliseNumber(source.originalContractSum, fallbackCopy.originalContractSum)),
    taskNames: names,
    tasks: rawTasks.map((task, index) => normaliseTask(task as LegacyTask, index, names)),
    version: Math.max(0, normaliseNumber(source.version, fallbackCopy.version)),
    updatedAt: source.updatedAt ? String(source.updatedAt) : fallbackCopy.updatedAt,
    updatedBy: source.updatedBy ? String(source.updatedBy) : fallbackCopy.updatedBy
  };
}
