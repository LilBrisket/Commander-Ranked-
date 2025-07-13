const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const schema = require('./dbSchema');

const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

schema.ensureCardsTable(db);

console.log('🚀 Starting card import...');
console.time('⏱️ Import duration');

const scryfallPath =
  process.env.SCRYFALL_JSON_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'scryfall-cards.json')
    : './scryfall-cards.json');

let raw;

try {
  raw = fs.readFileSync(scryfallPath, 'utf-8');
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

const colorMap = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green'
};

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards (id, name, image, image_back, color, type)
  VALUES (?, ?, ?, ?, ?, ?)
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

  const imageFront =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const imageBack =
    card.card_faces?.[1]?.image_uris?.normal || null;

  const image = imageFront?.startsWith('https://cards.scryfall.io/normal/')
    ? imageFront
    : null;

  if (!image) { stats.noImage++; skipped++; continue; }

  const id = card.id;
  const name = (card.name || '').trim();
  const color = Array.isArray(card.color_identity)
    ? card.color_identity.map(c => colorMap[c] || c).join(', ')
    : null;
  const type = card.type_line || null;

  if (id && name) {
    try {
      insert.run(id, name, image, imageBack, color, type);
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
}

console.timeEnd('⏱️ Import duration');
console.log(`✅ Successfully imported: ${imported.toLocaleString()} unique English Commander-legal cards`);
console.log(`⚠️ Skipped: ${skipped.toLocaleString()} total`);
console.log(`   — ${stats.notEnglish} not in English`);
console.log(`   — ${stats.notCommander} not Commander-legal`);
console.log(`   — ${stats.badLayout} unsupported layout`);
console.log(`   — ${stats.noImage} missing image`);
console.log(`   — ${stats.duplicate} duplicate versions`);














