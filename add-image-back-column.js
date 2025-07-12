const db = require('better-sqlite3')('cards.db');
db.prepare(`ALTER TABLE cards ADD COLUMN image_back TEXT`).run();
console.log('✅ image_back column added.');
