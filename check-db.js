const Database = require('better-sqlite3');
const db = new Database('cards.db');

const count = db
  .prepare("SELECT COUNT(*) as total FROM cards WHERE image IS NOT NULL AND image != ''")
  .get();

console.log(`🧮 Cards with images in DB: ${count.total}`);
