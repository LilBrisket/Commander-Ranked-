const fs = require('fs');
const Database = require('better-sqlite3');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

const db = new Database('cards.db');

const update = db.prepare(`UPDATE cards SET image_back = ? WHERE id = ?`);
let updated = 0;

const scryfallPath = process.env.SCRYFALL_JSON_PATH || '/DatabaseDisk/scryfall-cards.json';

const pipeline = chain([
  fs.createReadStream(scryfallPath),
  parser(),
  streamArray(),
]);

pipeline.on('data', ({ value: card }) => {
  const id = card.id;

  const imageCandidate =
    card.card_faces?.[1]?.image_uris?.normal || null;

  if (imageCandidate) {
    const result = update.run(imageCandidate, id);
    if (result.changes > 0) updated++;
  }
});

pipeline.on('end', () => {
  console.log(`🔄 Updated ${updated} cards with back images`);
});

pipeline.on('error', (err) => {
  console.error('❌ Error during processing:', err);
});


