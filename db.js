// db.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// ✅ Use persistent directory on Render if available
const dbDirectory = process.env.RENDER_PERSISTENT_DIR || path.join(__dirname, 'DatabaseDisk');

// 📁 Ensure the directory exists
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

// 📂 Full path to cards.db
const dbPath = path.join(dbDirectory, 'cards.db');
console.log('📂 Using database path:', dbPath);

// 🛠️ Connect to database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 🧱 Create table if it doesn't exist
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

// 🎨 Color identity mapping
const colorMap = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

// 🌱 Seed Scryfall cards if table is empty
function seedCardsFromScryfall() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'scryfall-cards.json'), 'utf-8');
    const scryfallCards = JSON.parse(raw);

    const insert = db.prepare(`
      INSERT INTO cards (id, name, image, color, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    let added = 0;

    for (const card of scryfallCards) {
      const id = card.id;
      const name = (card.name || '').trim();

      const imageCandidate =
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        null;

      const image = imageCandidate?.startsWith('https://cards.scryfall.io/normal/')
        ? imageCandidate
        : null;

      const color = Array.isArray(card.color_identity)
        ? card.color_identity.map(c => colorMap[c] || c).join(', ')
        : null;

      const type = card.type_line || null;

      if (id && name && image) {
        insert.run(id, name, image, color, type);
        added++;
        if (added % 500 === 0) {
          console.log(`→ Inserted ${added} cards so far...`);
        }
      } else {
        console.log(`⚠️ Skipped: ${name || 'Unknown'} — missing image or ID.`);
      }
    }

    console.log(`✅ Finished seeding. Total cards inserted: ${added}`);
  } catch (err) {
    console.error('❌ Failed to load or insert Scryfall cards:', err);
  }
}

// 🔍 Check if seeding is needed
try {
  const existing = db.prepare(`SELECT COUNT(*) AS count FROM cards`).get();

  if (existing.count === 0) {
    seedCardsFromScryfall();
  } else {
    console.log(`📦 Database already contains ${existing.count} cards.`);
  }
} catch (err) {
  console.error('❌ Error checking card count:', err);
}

module.exports = db;

