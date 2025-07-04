const Database = require('better-sqlite3');

const db = new Database('cards.db');
const rows = db.prepare(`SELECT id, name, image FROM cards WHERE image IS NOT NULL AND image != '' LIMIT 10`).all();

console.log("🔍 Sample image URLs from database:");
rows.forEach(row => {
  console.log(`🖼️ ${row.name} (${row.id}): ${row.image}`);
});


