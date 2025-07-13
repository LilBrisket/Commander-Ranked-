const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const schema = require('./dbSchema');

const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.prepare('DELETE FROM cards').run();
console.log('🧼 Cleared existing cards');

schema.ensureCardsTable(db);

const scryfallPath =
  process.env.SCRYFALL_JSON_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'scryfall-cards.json')
    : './scryfall-cards.json');

const raw = fs.readFileSync(scryfallPath, 'utf-8');
const scryfallCards = JSON.parse(raw);

const insert = db.prepare(`
  INSERT INTO cards (id, name, image, image_back, color, type)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let added = 0;
const seenNames = new Set();

for (const card of scryfallCards) {
  const id = card.id;
  const name = card.name;

  if (seenNames.has(name)) continue;

  const imageFront =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const imageBack =
    card.card_faces?.[1]?.image_uris?.normal || null;

  const image = imageFront?.startsWith('https://cards.scryfall.io/normal/')
    ? imageFront
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

  if (
    card.lang !== 'en' ||
    card.legalities?.commander !== 'legal' ||
    !['core', 'expansion'].includes(card.set_type) ||
    !image ||
    type.includes('Basic Land')
  ) {
    continue;
  }

  insert.run(id, name, image, imageBack, color, type);
  seenNames.add(name);
  added++;
}

console.log(`🃏 Re-seeded ${added} unique Commander-legal, English cards`);




