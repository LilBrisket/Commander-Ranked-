// patch-image-back.js
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('cards.db');
const scryfallCards = JSON.parse(fs.readFileSync('scryfall-cards.json', 'utf-8'));

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
