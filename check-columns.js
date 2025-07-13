const path = require('path');
const Database = require('better-sqlite3');

const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);

const rows = db.prepare('SELECT name, color, type FROM cards LIMIT 5').all();
console.log(rows);
