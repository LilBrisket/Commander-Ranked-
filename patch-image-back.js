// patch-image-back.js
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('cards.db');

// 👇 Change here: use /DatabaseDisk/scryfall-cards.json
const scryfallPath = process.env.SCRYFALL_JSON_PATH || '/DatabaseDisk/scryfall-cards.json';
const scryfallCards = JSON.parse(fs.readFileSync(scryfallPath, 'utf-8'));

const update = db.prepare(`UPDATE cards SET image_back = ? WHERE id = ?`);
let updated = 0;

for (const card of scryfallCards) {
  const id = card.id;

  const imageCandidate =
    card.card_faces?.[1]?.image_uris?.normal ||
    null;

  if (imageCandidate) {
    const result = update.run(imageCandidate, id);
    if (result.changes > 0) updated++;
  }
}

console.log(`🔄 Updated ${updated} cards with back images`);

