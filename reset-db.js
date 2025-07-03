const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('cards.db');

db.pragma('journal_mode = WAL');

// 🧹 Delete existing cards
db.prepare('DELETE FROM cards').run();
console.log('🧼 Cleared existing cards');

// ✅ Ensure cards table exists (if using standalone seed script)
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

// 🔄 Load Scryfall JSON
const raw = fs.readFileSync(path.join(__dirname, 'scryfall-cards.json'), 'utf-8');
const scryfallCards = JSON.parse(raw);

const insert = db.prepare(`
  INSERT INTO cards (id, name, image, color, type)
  VALUES (?, ?, ?, ?, ?)
`);

let added = 0;
const seenNames = new Set();

for (const card of scryfallCards) {
  const id = card.id;
  const name = card.name;

  // 🚫 Skip duplicate card names (only one printing per name)
  if (seenNames.has(name)) continue;

  const imageCandidate =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const image = imageCandidate?.startsWith('https://cards.scryfall.io/normal/')
    ? imageCandidate
    : null;

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

  const type = card.type_line || '';

  // ✅ Apply all filters
  if (
    card.lang !== 'en' || // English only
    card.legalities?.commander !== 'legal' || // Commander legal
    !['core', 'expansion'].includes(card.set_type) || // Base printings only
    !image || // Must have usable image
    type.includes('Basic Land') // ❌ Exclude Basic Lands
  ) {
    continue;
  }

  // ✅ Insert card and track the name
  insert.run(id, name, image, color, type);
  seenNames.add(name);
  added++;
}

console.log(`🃏 Re-seeded ${added} unique Commander-legal, English cards`);

