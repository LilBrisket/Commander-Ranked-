// dbSchema.js

module.exports = {
  ensureCardsTable: (db) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  image_back TEXT,
  points INTEGER DEFAULT 0,
  seen INTEGER DEFAULT 0,
  color TEXT,
  type TEXT,
  active INTEGER DEFAULT 1
)
    `).run();

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_points ON cards(points)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_name ON cards(name)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_color ON cards(color)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_type ON cards(type)`).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
      )
    `).run();
  }
};
