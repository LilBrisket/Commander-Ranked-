// import-cards.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { chain } = require('stream-chain');

const dbPath = process.env.DATABASE_PATH || '/DatabaseDisk/cards.db';
console.log('📂 Using database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ✅ Make sure table exists
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

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image, color, type)
  VALUES (?, ?, ?, ?, ?)
`);

const colorMap = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
const unsupportedLayouts = [
  'token', 'emblem', 'scheme', 'art_series', 'vanguard',
  'double_faced_token', 'augment', 'host', 'planar'
];

const seenOracleIds = new Set();
const stats = {
  imported: 0, skipped: 0,
  notEnglish: 0, notCommander: 0,
  badLayout: 0, noImage: 0, duplicate: 0
};

console.log('🚀 Starting streaming import...');

const pipeline = chain([
  fs.createReadStream(path.join(__dirname, 'scryfall-cards.json')),
  parser(),
  streamArray()
]);

pipeline.on('data', ({ value: card }) => {
  try {
    if (card.lang !== 'en') return stats.notEnglish++, stats.skipped++;
    if (card.legalities?.commander !== 'legal') return stats.notCommander++, stats.skipped++;
    if (unsupportedLayouts.includes(card.layout)) return stats.badLayout++, stats.skipped++;
    if (seenOracleIds.has(card.oracle_id)) return stats.duplicate++, stats.skipped++;

    const image = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
    if (!image || !image.startsWith('https://cards.scryfall.io/normal/')) {
      return stats.noImage++, stats.skipped++;
    }

    const id = card.id;
    const name = (card.name || '').trim();
    const color = Array.isArray(card.color_identity)
      ? card.color_identity.map(c => colorMap[c] || c).join(', ')
      : null;
    const type = card.type_line || null;

    if (id && name) {
      insert.run(id, name, image, color, type);
      seenOracleIds.add(card.oracle_id);
      stats.imported++;
      if (stats.imported % 500 === 0) {
        console.log(`📦 Imported: ${stats.imported}`);
      }
    }
  } catch (err) {
    stats.skipped++;
    console.warn('⚠️ Error inserting card:', err.message);
  }
});

pipeline.on('end', () => {
  console.log(`\n✅ Imported: ${stats.imported.toLocaleString()} cards`);
  console.log(`⚠️ Skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`   — ${stats.notEnglish} not in English`);
  console.log(`   — ${stats.notCommander} not Commander-legal`);
  console.log(`   — ${stats.badLayout} unsupported layout`);
  console.log(`   — ${stats.noImage} missing image`);
  console.log(`   — ${stats.duplicate} duplicate versions`);
});









