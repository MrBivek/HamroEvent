import path from "node:path";
import mongoose from "mongoose";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { env } from "./configurations/env.js";

type MigrationModule = {
  name: string;
  up: (conn: mongoose.Connection) => Promise<void>;
  down?: (conn: mongoose.Connection) => Promise<void>;
};

const MIGRATIONS_DIR = path.resolve("src/migrations");
const MIGRATIONS_COLLECTION = "migrations";

async function ensureMigrationsCollection(conn: mongoose.Connection) {
  await conn.createCollection(MIGRATIONS_COLLECTION).catch(() => {});
  await conn.collection(MIGRATIONS_COLLECTION).createIndex({ name: 1 }, { unique: true });
}

async function getApplied(conn: mongoose.Connection): Promise<Set<string>> {
  const docs = await conn
    .collection(MIGRATIONS_COLLECTION)
    .find({}, { projection: { name: 1 } })
    .toArray();
  return new Set(docs.map((d: any) => d.name));
}

async function listMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith(".ts")).sort();
}

async function loadMigration(file: string): Promise<MigrationModule> {
  const fullPath = path.join(MIGRATIONS_DIR, file);
  const mod = (await import(pathToFileURL(fullPath).href)) as Partial<MigrationModule>;
  if (!mod.name || !mod.up) throw new Error(`Invalid migration module: ${file}`);
  return mod as MigrationModule;
}

async function main() {
  const cmd = process.argv[2] ?? "status";

  await mongoose.connect(env.MONGO_URI);
  const conn = mongoose.connection;

  await ensureMigrationsCollection(conn);
  const applied = await getApplied(conn);
  const files = await listMigrationFiles();

  if (cmd === "status") {
    const rows = await Promise.all(
      files.map(async (f) => {
        const m = await loadMigration(f);
        return { file: f, name: m.name, applied: applied.has(m.name) };
      }),
    );
    console.table(rows);
    await mongoose.disconnect();
    return;
  }

  if (cmd === "up") {
    for (const f of files) {
      const m = await loadMigration(f);
      if (applied.has(m.name)) continue;

      console.log(`Applying: ${m.name}`);
      await m.up(conn);
      await conn
        .collection(MIGRATIONS_COLLECTION)
        .insertOne({ name: m.name, appliedAt: new Date() });
    }
    await mongoose.disconnect();
    return;
  }

  if (cmd === "down") {
    const appliedDocs = await conn
      .collection(MIGRATIONS_COLLECTION)
      .find({})
      .sort({ appliedAt: -1 })
      .limit(1)
      .toArray();

    if (appliedDocs.length === 0) {
      console.log("No migrations applied.");
      await mongoose.disconnect();
      return;
    }

    const lastName = appliedDocs[0].name as string;

    let lastFile: string | undefined;
    for (const f of files) {
      const m = await loadMigration(f);
      if (m.name === lastName) lastFile = f;
    }
    if (!lastFile) throw new Error(`Cannot find migration file for ${lastName}`);

    const m = await loadMigration(lastFile);
    if (!m.down) throw new Error(`Migration ${m.name} has no down()`);

    console.log(`Reverting: ${m.name}`);
    await m.down(conn);
    await conn.collection(MIGRATIONS_COLLECTION).deleteOne({ name: m.name });

    await mongoose.disconnect();
    return;
  }

  throw new Error(`Unknown Command: ${cmd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
