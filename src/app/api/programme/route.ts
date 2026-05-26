import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";

import { DEFAULT_PROGRAMME, Programme, normaliseProgramme } from "@/lib/programme";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LATEST_KEY = "work-programme:latest";
const BACKUP_INDEX_KEY = "work-programme:backups";
const BACKUP_PREFIX = "work-programme:backup:";
const MAX_BACKUPS = 30;
const LOCAL_DATA_DIR = path.join(process.cwd(), ".project-tracker-data");
const LOCAL_LATEST_PATH = path.join(LOCAL_DATA_DIR, "work-programme-latest.json");
const LOCAL_BACKUP_DIR = path.join(LOCAL_DATA_DIR, "backups");

function storageUnavailable() {
  return Response.json(
    {
      error: "Shared storage is not configured. For any-network access, deploy with Upstash Redis environment variables.",
      programme: normaliseProgramme(DEFAULT_PROGRAMME)
    },
    { status: 503 }
  );
}

function canUseLocalFileStorage() {
  return !process.env.VERCEL;
}

async function readLatest(): Promise<Programme> {
  const redis = getRedis();
  if (!redis) return readLocalLatest();

  const stored = await redis.get<Programme>(LATEST_KEY);
  return normaliseProgramme(stored || DEFAULT_PROGRAMME);
}

async function writeLatest(programme: Programme) {
  const redis = getRedis();
  if (redis) {
    await redis.set(LATEST_KEY, programme);
    return;
  }

  await mkdir(LOCAL_DATA_DIR, { recursive: true });
  await writeFile(LOCAL_LATEST_PATH, JSON.stringify(programme, null, 2), "utf8");
}

async function writeBackup(programme: Programme) {
  const redis = getRedis();
  if (!redis) {
    await writeLocalBackup(programme);
    return;
  }

  const backupKey = `${BACKUP_PREFIX}${programme.updatedAt || new Date().toISOString()}:v${programme.version}`;
  await redis.set(backupKey, programme);
  await redis.lpush(BACKUP_INDEX_KEY, backupKey);

  const staleKeys = (await redis.lrange<string>(BACKUP_INDEX_KEY, MAX_BACKUPS, -1)) || [];
  if (staleKeys.length) {
    await redis.del(...staleKeys);
  }
  await redis.ltrim(BACKUP_INDEX_KEY, 0, MAX_BACKUPS - 1);
}

async function readLocalLatest() {
  try {
    const stored = await readFile(LOCAL_LATEST_PATH, "utf8");
    return normaliseProgramme(JSON.parse(stored));
  } catch {
    return normaliseProgramme(DEFAULT_PROGRAMME);
  }
}

async function writeLocalBackup(programme: Programme) {
  await mkdir(LOCAL_BACKUP_DIR, { recursive: true });
  const stamp = (programme.updatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
  const backupPath = path.join(LOCAL_BACKUP_DIR, `work-programme-${stamp}-v${programme.version}.json`);
  await writeFile(backupPath, JSON.stringify(programme, null, 2), "utf8");

  const backups = (await readdir(LOCAL_BACKUP_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  await Promise.all(
    backups.slice(MAX_BACKUPS).map((name) => rm(path.join(LOCAL_BACKUP_DIR, name), { force: true }))
  );
}

export async function GET() {
  const redis = getRedis();
  if (!redis && !canUseLocalFileStorage()) return storageUnavailable();

  const programme = await readLatest();
  return Response.json(programme);
}

export async function PUT(request: NextRequest) {
  const redis = getRedis();
  if (!redis && !canUseLocalFileStorage()) return storageUnavailable();

  const body = await request.json().catch(() => null);
  const existing = await readLatest();
  const incoming = normaliseProgramme(body, existing);

  if (incoming.version < existing.version) {
    return Response.json(
      {
        error: "Another saved version is newer. Reloaded the latest shared programme.",
        programme: existing
      },
      { status: 409 }
    );
  }

  const nextProgramme: Programme = {
    ...incoming,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "Open link"
  };

  await writeLatest(nextProgramme);
  await writeBackup(nextProgramme);

  return Response.json(nextProgramme);
}
