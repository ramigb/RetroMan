import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "retroman.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'facilitator', 'member')),
      org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      product_area TEXT,
      team_lead_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS retro_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      categories TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retrospectives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sprint_cycle_name TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'grouping', 'voting', 'discussion', 'completed')),
      max_votes_per_user INTEGER NOT NULL DEFAULT 3,
      anonymous_mode INTEGER NOT NULL DEFAULT 1,
      template_id TEXT REFERENCES retro_templates(id) ON DELETE SET NULL,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      facilitator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
      vote_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback_items (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
      theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, theme_id)
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done')),
      theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL,
      retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discussion_notes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_retro ON feedback_items(retro_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_theme ON feedback_items(theme_id);
    CREATE INDEX IF NOT EXISTS idx_themes_retro ON themes(retro_id);
    CREATE INDEX IF NOT EXISTS idx_votes_retro ON votes(retro_id);
    CREATE INDEX IF NOT EXISTS idx_votes_theme ON votes(theme_id);
    CREATE INDEX IF NOT EXISTS idx_actions_retro ON action_items(retro_id);
    CREATE INDEX IF NOT EXISTS idx_actions_owner ON action_items(owner_id);
    CREATE INDEX IF NOT EXISTS idx_retros_team ON retrospectives(team_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
  `);

  migrateVotesAllowMultiplePerTheme();
}

function migrateVotesAllowMultiplePerTheme() {
  const indexes = db.prepare("PRAGMA index_list(votes)").all() as Array<{ name: string; unique: number; origin: string }>;
  const hasUserThemeUnique = indexes.some((index) => {
    if (!index.unique || index.origin !== "u") return false;
    const columns = db.prepare(`PRAGMA index_info(${index.name})`).all() as Array<{ name: string }>;
    return columns.map((column) => column.name).join(",") === "user_id,theme_id";
  });

  if (!hasUserThemeUnique) return;

  db.pragma("foreign_keys = OFF");
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_votes_retro;
      DROP INDEX IF EXISTS idx_votes_theme;

      ALTER TABLE votes RENAME TO votes_old;

      CREATE TABLE votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
        retro_id TEXT NOT NULL REFERENCES retrospectives(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO votes (id, user_id, theme_id, retro_id, created_at)
      SELECT id, user_id, theme_id, retro_id, created_at
      FROM votes_old;

      DROP TABLE votes_old;

      CREATE INDEX IF NOT EXISTS idx_votes_retro ON votes(retro_id);
      CREATE INDEX IF NOT EXISTS idx_votes_theme ON votes(theme_id);
    `);
  } finally {
    db.pragma("foreign_keys = ON");
  }
}
