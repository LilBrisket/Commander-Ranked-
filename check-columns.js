const Database = require('better-sqlite3');
const db = new Database('cards.db');

const rows = db.prepare('SELECT name, color, type FROM cards LIMIT 5').all();
console.log(rows);