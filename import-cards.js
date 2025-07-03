// import-cards.js

const fs = require('fs');
const path = require('path');
const db = require('./db');

console.log('🚀 Starting card import...');
console.time('⏱️ Import duration');

if (typeof db.prepare !== 'function') {
  console.error('❌ db.prepare is not a function. Did you export the DB instance correctly from db.js?');
  process.exit(1);
}

// 📖 Load scryfall-cards.json
const filePath = path.join(__dirname, 'scryfall-cards.json');
let raw;

try {
  raw = fs.readFileSync(filePath, 'utf-8');
} catch (err) {
  console.error('❌ Failed to read scryfall-cards.json:', err.message);
  process.exit(1);
}

let cards;
try {
  cards = JSON.parse(raw);
  console.log(`🔍 Total cards parsed: ${cards.length}`);
} catch (err) {
  console.error('❌ Failed to parse scryfall-cards.json:', err.message);
  process.exit(1);
}

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image)
  VALUES (?, ?, ?)
`);

const unsupportedLayouts = [
  'token', 'emblem', 'scheme', 'art_series', 'vanguard',
  'double_faced_token', 'augment', 'host', 'planar'
];

const seenOracleIds = new Set();
let imported = 0;
let skipped = 0;
let stats = {
  noImage: 0,
  notCommander: 0,
  notEnglish: 0,
  badLayout: 0,
  duplicate: 0
};

for (const card of cards) {
  const isEnglish = card.lang === 'en';
  const isCommanderLegal = card.legalities?.commander === 'legal';
  const isLayoutSupported = !unsupportedLayouts.includes(card.layout);
  const oracleId = card.oracle_id;

  if (!isEnglish) { stats.notEnglish++; skipped++; continue; }
  if (!isCommanderLegal) { stats.notCommander++; skipped++; continue; }
  if (!isLayoutSupported) { stats.badLayout++; skipped++; continue; }
  if (seenOracleIds.has(oracleId)) { stats.duplicate++; skipped++; continue; }

  const imageCandidate =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const image = imageCandidate?.startsWith('https://cards.scryfall.io/normal/')
    ? imageCandidate
    : null;

  if (!image) { stats.noImage++; skipped++; continue; }

  if (card.id && card.name) {
    try {
      insert.run(card.id, card.name, image);
      seenOracleIds.add(oracleId);
      imported++;
      console.log(`📥 Inserted: ${card.name} → ${image}`);
    } catch (err) {
      console.error(`❌ Failed to insert "${card.name}":`, err.message);
      skipped++;
    }
  } else {
    skipped++;
  }
}

console.timeEnd('⏱️ Import duration');
console.log(`✅ Successfully imported: ${imported.toLocaleString()} unique English Commander-legal cards`);
console.log(`⚠️ Skipped: ${skipped.toLocaleString()} total`);
console.log(`   — ${stats.notEnglish} not in English`);
console.log(`   — ${stats.notCommander} not Commander-legal`);
console.log(`   — ${stats.badLayout} unsupported layout`);
console.log(`   — ${stats.noImage} missing image`);
console.log(`   — ${stats.duplicate} duplicate versions`);





