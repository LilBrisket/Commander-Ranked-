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

const update = db.prepare(`
  UPDATE cards
  SET image_back = ?
  WHERE id = ?
`);

let updated = 0;

for (const card of scryfallCards) {
  const id = card.id;

  const backImageCandidate =
    card.card_faces?.[1]?.image_uris?.normal || null;

  if (!backImageCandidate) continue;

  const result = update.run(backImageCandidate, id);
  if (result.changes > 0) updated++;
}

console.log(`🔄 Updated ${updated} cards with back images.`);




