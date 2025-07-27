const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Setup DB path
const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log(`📂 Using database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Set all to inactive first
db.prepare(`UPDATE cards SET active = 0`).run();
console.log('🔄 Set all cards to active = 0');

// Load Scryfall data
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

const unsupportedLayouts = [
  'token', 'emblem', 'scheme', 'art_series', 'vanguard',
  'double_faced_token', 'augment', 'host', 'planar'
];

const validImage = (url) =>
  typeof url === 'string' && url.startsWith('https://cards.scryfall.io/normal/');

const seenOracleIds = new Set();
let reactivated = 0;

const stmt = db.prepare(`UPDATE cards SET active = 1 WHERE id = ?`);

for (const card of cards) {
  const isEnglish = card.lang === 'en';
  const isCommanderLegal = card.legalities?.commander === 'legal';
  const isLayoutSupported = !unsupportedLayouts.includes(card.layout);
  const oracleId = card.oracle_id;

  if (!isEnglish || !isCommanderLegal || !isLayoutSupported || seenOracleIds.has(oracleId)) {
    continue;
  }

  const imageFront =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const image = validImage(imageFront) ? imageFront : null;
  if (!image) continue;

  const id = card.id;
  const name = (card.name || '').trim();
  const type = card.type_line || '';

  if (id && name && type) {
    try {
      stmt.run(id);
      seenOracleIds.add(oracleId);
      reactivated++;
    } catch (err) {
      console.error(`❌ Failed to reactivate ${name}:`, err.message);
    }
  }
}

console.log(`✅ Reactivated ${reactivated} cards based on full import filter`);

// Manual deactivations
const stickerTypes = [
  '%sticker%', // fallback
  '%Sticker%', // proper type match
];

const nameExcludes = [
  'Wastes',
  'Snow-Covered Wastes'
];

const deactivatedStickers = db.prepare(`
  UPDATE cards SET active = 0
  WHERE LOWER(type) LIKE '%sticker%'
`).run().changes;

const deactivatedWastes = db.prepare(`
  UPDATE cards SET active = 0
  WHERE name IN (?, ?)
`).run(...nameExcludes).changes;

console.log(`🗑️ Manually deactivated ${deactivatedStickers} sticker cards`);
console.log(`🗑️ Manually deactivated ${deactivatedWastes} Wastes variants`);
console.log('✅ Done.');

