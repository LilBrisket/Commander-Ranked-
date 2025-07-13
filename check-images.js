const path = require('path');
const Database = require('better-sqlite3');

const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);

const rows = db.prepare(`SELECT id, name, image FROM cards WHERE image IS NOT NULL AND image != '' LIMIT 10`).all();

console.log("🔍 Sample image URLs from database:");
rows.forEach(row => {
  console.log(`🖼️ ${row.name} (${row.id}): ${row.image}`);
});


