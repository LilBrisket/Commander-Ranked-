// import-cards.js
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

const colorMap = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
const unsupportedLayouts = ['token', 'emblem', 'scheme', 'art_series', 'vanguard', 'double_faced_token', 'augment', 'host', 'planar'];

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image, color, type)
  VALUES (?, ?, ?, ?, ?)
`);

console.log('🚀 Starting streaming import...');
console.time('⏱️ Import duration');

let imported = 0;
let skipped = 0;
const seenOracleIds = new Set();
const stats = {
  noImage: 0,
  notCommander: 0,
  notEnglish: 0,
  badLayout: 0,
  duplicate: 0
};

fs.createReadStream(path.join(__dirname, 'scryfall-cards.json'))
  .pipe(parser())
  .pipe(streamArray())
  .on('data', ({ value: card }) => {
    const isEnglish = card.lang === 'en';
    const isCommanderLegal = card.legalities?.commander === 'legal';
    const isLayoutSupported = !unsupportedLayouts.includes(card.layout);
    const oracleId = card.oracle_id;

    if (!isEnglish) return stats.notEnglish++, skipped++;
    if (!isCommanderLegal) return stats.notCommander++, skipped++;
    if (!isLayoutSupported) return stats.badLayout++, skipped++;
    if (seenOracleIds.has(oracleId)) return stats.duplicate++, skipped++;

    const imageCandidate =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      null;

    if (!imageCandidate?.startsWith('https://cards.scryfall.io/normal/')) {
      stats.noImage++; skipped++;
      return;
    }

    const id = card.id;
    const name = (card.name || '').trim();
    const color = Array.isArray(card.color_identity)
      ? card.color_identity.map(c => colorMap[c] || c).join(', ')
      : null;
    const type = card.type_line || null;

    if (id && name) {
      try {
        insert.run(id, name, imageCandidate, color, type);
        seenOracleIds.add(oracleId);
        imported++;
        if (imported % 500 === 0) {
          console.log(`📦 Imported ${imported} cards so far...`);
        }
      } catch (err) {
        console.error(`❌ Failed to insert "${name}":`, err.message);
        skipped++;
      }
    } else {
      skipped++;
    }
  })
  .on('end', () => {
    console.timeEnd('⏱️ Import duration');
    console.log(`✅ Imported: ${imported.toLocaleString()} cards`);
    console.log(`⚠️ Skipped: ${skipped.toLocaleString()}`);
    console.log(`   — ${stats.notEnglish} not in English`);
    console.log(`   — ${stats.notCommander} not Commander-legal`);
    console.log(`   — ${stats.badLayout} unsupported layout`);
    console.log(`   — ${stats.noImage} missing image`);
    console.log(`   — ${stats.duplicate} duplicate versions`);
  })
  .on('error', err => {
    console.error('❌ Import failed:', err);
  });







