// import-cards.js
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

console.log('🚀 Starting card import...');
console.time('⏱️ Import duration');

const filePath = path.join(__dirname, 'scryfall-cards.json');
if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

const colorMap = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green'
};

const unsupportedLayouts = new Set([
  'token', 'emblem', 'scheme', 'art_series', 'vanguard',
  'double_faced_token', 'augment', 'host', 'planar'
]);

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image, color, type)
  VALUES (?, ?, ?, ?, ?)
`);

const seenOracleIds = new Set();
let imported = 0;
let skipped = 0;
const stats = {
  noImage: 0, notCommander: 0, notEnglish: 0, badLayout: 0, duplicate: 0
};

const pipeline = fs.createReadStream(filePath)
  .pipe(parser())
  .pipe(streamArray());

pipeline.on('data', ({ value: card }) => {
  const isEnglish = card.lang === 'en';
  const isCommanderLegal = card.legalities?.commander === 'legal';
  const isLayoutSupported = !unsupportedLayouts.has(card.layout);
  const oracleId = card.oracle_id;

  if (!isEnglish) { stats.notEnglish++; skipped++; return; }
  if (!isCommanderLegal) { stats.notCommander++; skipped++; return; }
  if (!isLayoutSupported) { stats.badLayout++; skipped++; return; }
  if (seenOracleIds.has(oracleId)) { stats.duplicate++; skipped++; return; }

  const image = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
  if (!image || !image.startsWith('https://cards.scryfall.io/normal/')) {
    stats.noImage++; skipped++; return;
  }

  const id = card.id;
  const name = (card.name || '').trim();
  const color = Array.isArray(card.color_identity)
    ? card.color_identity.map(c => colorMap[c] || c).join(', ')
    : null;
  const type = card.type_line || null;

  try {
    insert.run(id, name, image, color, type);
    seenOracleIds.add(oracleId);
    imported++;
    if (imported % 500 === 0) {
      console.log(`📦 Imported ${imported} cards...`);
    }
  } catch (err) {
    console.error(`❌ Insert failed for ${name}:`, err.message);
    skipped++;
  }
});

pipeline.on('end', () => {
  console.timeEnd('⏱️ Import duration');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(stats);
});

pipeline.on('error', err => {
  console.error('🚨 Error during import:', err);
});








