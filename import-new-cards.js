const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// detect DB path
const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// detect Scryfall JSON path
const scryfallPath =
  process.env.SCRYFALL_JSON_PATH ||
  (fs.existsSync('/DatabaseDisk/scryfall-cards.json')
    ? '/DatabaseDisk/scryfall-cards.json'
    : './scryfall-cards.json');

console.log(`📄 Reading Scryfall JSON from: ${scryfallPath}`);
const scryfallCards = JSON.parse(fs.readFileSync(scryfallPath, 'utf-8'));

const insertOrIgnore = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image, color, type)
  VALUES (?, ?, ?, ?, ?)
`);

let added = 0;

for (const card of scryfallCards) {
  // filter unwanted cards
  if (
    card.lang !== 'en' ||
    card.legalities?.commander !== 'legal' ||
    !['core', 'expansion'].includes(card.set_type) ||
    (card.type_line || '').includes('Basic Land')
  ) {
    continue;
  }

  const id = card.id;
  const name = card.name;

  const imageCandidate =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const image = imageCandidate?.startsWith('https://cards.scryfall.io/normal/')
    ? imageCandidate
    : null;

  const color = Array.isArray(card.color_identity)
    ? card.color_identity
        .map(c => ({ W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }[c] || c))
        .join(', ')
    : null;

  const type = card.type_line || '';

  if (!image) continue;

  const result = insertOrIgnore.run(id, name, image, color, type);
  if (result.changes > 0) added++;
}

console.log(`✅ Added ${added} new cards to the database.`);
