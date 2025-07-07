// dbSchema.js

module.exports = {
  ensureCardsTable: db => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT,
        image TEXT,
        points INTEGER DEFAULT 0,
        seen INTEGER DEFAULT 0,
        color TEXT,
        type TEXT
      )
    `).run();
  }
};
