const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('cards.db');

db.pragma('journal_mode = WAL');

db.prepare('DELETE FROM cards').run();
console.log('🧼 Cleared existing cards');

db.prepare(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT,
    image TEXT,
    image_back TEXT,
    points INTEGER DEFAULT 0,
    seen INTEGER DEFAULT 0,
    color TEXT,
    type TEXT
  )
`).run();

const raw = fs.readFileSync(path.join(__dirname, 'scryfall-cards.json'), 'utf-8');
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


