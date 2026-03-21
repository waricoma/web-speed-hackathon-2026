import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { Sequelize } from "sequelize";

import { initModels } from "@web-speed-hackathon-2026/server/src/models";
import { DATABASE_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// Toggle: true = in-memory SQLite, false = file-based SQLite
const USE_MEMORY_DB = true;

let _sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!_sequelize) throw new Error("Sequelize not initialized");
  return _sequelize;
}

let _backupPath: string | null = null;

async function createIndexes(seq: Sequelize) {
  await seq.query("CREATE INDEX IF NOT EXISTS idx_posts_created ON Posts(createdAt DESC)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_posts_userid ON Posts(userId)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_posts_text ON Posts(text)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_comments_postid ON Comments(postId, createdAt ASC)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_dm_conversation ON DirectMessages(conversationId, createdAt ASC)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_dm_unread ON DirectMessages(senderId, isRead)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_dmconv_initiator ON DirectMessageConversations(initiatorId)");
  await seq.query("CREATE INDEX IF NOT EXISTS idx_dmconv_member ON DirectMessageConversations(memberId)");
}

async function applyPragmas(seq: Sequelize) {
  await seq.query("PRAGMA journal_mode=WAL");
  await seq.query("PRAGMA synchronous=OFF");
  await seq.query("PRAGMA mmap_size=268435456"); // 256MB mmap (file-based only, ignored for :memory:)
  await seq.query("PRAGMA cache_size=-32768"); // 32MB
  await seq.query("PRAGMA temp_store=MEMORY");
}

// --- In-memory mode helpers ---
async function copyDbToMemory(sourceStorage: string): Promise<Sequelize> {
  const source = new Sequelize({ dialect: "sqlite", logging: false, storage: sourceStorage });
  const mem = new Sequelize({ dialect: "sqlite", logging: false, storage: ":memory:" });
  await (mem as any).query(`ATTACH DATABASE '${sourceStorage}' AS src`);
  const tables = await source.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    { type: "SELECT" },
  ) as any[];
  for (const { name } of tables) {
    const [schema] = await source.query(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${name}'`,
    ) as any;
    if (schema?.[0]?.sql) {
      await mem.query(schema[0].sql);
      await mem.query(`INSERT INTO "${name}" SELECT * FROM src."${name}"`);
    }
  }
  await mem.query("DETACH DATABASE src");
  await source.close();
  return mem;
}

// --- File-based mode ---
async function createFileDb(): Promise<Sequelize> {
  const TEMP_PATH = path.resolve(
    await fs.mkdtemp(path.resolve(os.tmpdir(), "./wsh-")),
    "./database.sqlite",
  );
  if (_backupPath) {
    await fs.copyFile(_backupPath, TEMP_PATH);
  } else {
    await fs.copyFile(DATABASE_PATH, TEMP_PATH);
  }
  return new Sequelize({ dialect: "sqlite", logging: false, storage: TEMP_PATH });
}

export async function initializeSequelize() {
  const prevSequelize = _sequelize;
  _sequelize = null;
  await prevSequelize?.close();

  if (USE_MEMORY_DB) {
    // In-memory mode
    if (_backupPath) {
      _sequelize = await copyDbToMemory(_backupPath);
    } else {
      const TEMP_PATH = path.resolve(
        await fs.mkdtemp(path.resolve(os.tmpdir(), "./wsh-")),
        "./database.sqlite",
      );
      await fs.copyFile(DATABASE_PATH, TEMP_PATH);
      _sequelize = await copyDbToMemory(TEMP_PATH);
      initModels(_sequelize);
      await createIndexes(_sequelize);
      _backupPath = path.resolve(
        await fs.mkdtemp(path.resolve(os.tmpdir(), "./wsh-backup-")),
        "./database.sqlite",
      );
      await _sequelize.query(`VACUUM INTO '${_backupPath}'`);
      await applyPragmas(_sequelize);
      return;
    }
  } else {
    // File-based mode
    _sequelize = await createFileDb();
    if (!_backupPath) {
      initModels(_sequelize);
      await applyPragmas(_sequelize);
      await createIndexes(_sequelize);
      // Save indexed backup
      const storage = (_sequelize as any).options.storage;
      _backupPath = path.resolve(
        await fs.mkdtemp(path.resolve(os.tmpdir(), "./wsh-backup-")),
        "./database.sqlite",
      );
      await fs.copyFile(storage, _backupPath);
      return;
    }
  }

  initModels(_sequelize);
  await applyPragmas(_sequelize);
}
