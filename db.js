const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const schema = require('./dbSchema');

const dbDirectory = process.env.RENDER_PERSISTENT_DIR || path.join(__dirname, 'DatabaseDisk');

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'cards.db');
console.log('📂 Using database path:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Use the unified schema
schema.ensureCardsTable(db);

module.exports = db;




