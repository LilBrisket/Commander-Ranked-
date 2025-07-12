const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

// ✅ Use correct database path
const dbPath = process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database at: ${dbPath}`);

const db = new Database(dbPath);
const update = db.prepare(`UPDATE cards SET image_back = ? WHERE id = ?`);
let updated = 0;

// ✅ Use correct Scryfall JSON path
const scryfallPath = process.env.SCRYFALL_JSON_PATH || '/DatabaseDisk/scryfall-cards.json';
console.log(`📄 Reading Scryfall JSON from: ${scryfallPath}`);

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
  console.log(`✅ Finished: updated ${updated} cards with back images`);
});

pipeline.on('error', (err) => {
  console.error('❌ Error during processing:', err);
});



