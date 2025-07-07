const Database = require('better-sqlite3');

// adjust the path if your DB is somewhere else
const db = new Database('cards.db');

const row = db.prepare("SELECT * FROM meta WHERE key = 'rankings_submitted'").get();
console.log(row);
