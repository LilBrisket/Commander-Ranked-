// db.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('cards.db');

db.pragma('journal_mode = WAL');

// 🛠️ Ensure 'cards' table exists with required columns
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

// 🧪 Seed cards from Scryfall JSON if table is empty
try {
  const existing = db.prepare(`SELECT COUNT(*) AS count FROM cards`).get();
  if (existing.count === 0) {
    const raw = fs.readFileSync(path.join(__dirname, 'scryfall-cards.json'), 'utf-8');
    const scryfallCards = JSON.parse(raw);

    const insert = db.prepare(`
      INSERT INTO cards (id, name, image, color, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    let added = 0;

    for (const card of scryfallCards) {
      const id = card.id;
      const name = card.name;

      // 🎨 Get image from normal or front face
      const imageCandidate =
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        null;

      const image = imageCandidate?.startsWith('https://cards.scryfall.io/normal/')
        ? imageCandidate
        : null;

      // 🧠 Convert color identity codes to readable format
      const color = Array.isArray(card.color_identity)
        ? card.color_identity
            .map(c => ({
              W: 'White',
              U: 'Blue',
              B: 'Black',
              R: 'Red',
              G: 'Green'
            }[c] || c))
            .join(', ')
        : null;

      // 📜 Get type line
      const type = card.type_line || null;

      // ✅ Insert valid cards only
      if (id && name && image) {
        console.log(`→ Seeding: ${name} — ${image}`);
        insert.run(id, name, image, color, type);
        added++;
      }

      if (added >= 50) break; // Limit for development
    }

    console.log(`🃏 Inserted ${added} cards from Scryfall JSON.`);
  } else {
    console.log(`📦 Database already contains ${existing.count} cards.`);
  }
} catch (err) {
  console.error('❌ Failed to load or insert Scryfall cards:', err.message);
}

module.exports = db;