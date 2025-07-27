const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📡 ${req.method} ${req.path} from ${req.ip} | forwarded: ${req.headers['x-forwarded-for'] || 'none'}`);
  }
  next();
});

// Choose DB path based on env or fallback

const dbPath =
  process.env.DATABASE_PATH ||
  (process.env.RENDER_PERSISTENT_DIR
    ? path.join(process.env.RENDER_PERSISTENT_DIR, 'cards.db')
    : path.join('.', 'cards.db'));

console.log('📂 Using database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Make sure tables exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT,
    image TEXT,
    image_back TEXT,
    points INTEGER DEFAULT 0,
    seen INTEGER DEFAULT 0,
    color TEXT,
    type TEXT,
    active INTEGER DEFAULT 1
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
  )
`).run();

app.set('trust proxy', 1); // ✅ Enable IP detection for rate-limiting (esp. behind Render or proxies)

app.use(cors());
app.use(express.json());
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 4, // limit each IP to 4 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },

  keyGenerator: (req) => {
    const key = ipKeyGenerator(req);
    const ip = typeof key === 'string' ? key : req.ip;

    // ✅ Only log in non-production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 Rate limit key used: ${ip}`);
    }

    return ip;
  },

  handler: (req, res, next, options) => {
    if (process.env.NODE_ENV !== 'production') {
  console.log(`⛔ Rate limit triggered for IP: ${req.ip}`);
}
    res
      .status(options.statusCode)
      .setHeader("Content-Type", "application/json")
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .json(options.message);
  }
});

app.use(express.static('public'));

// 🃏 Get random cards
app.get('/api/cards/random', (req, res) => {
  try {
    const cards = db.prepare(`
  SELECT id, name, image, image_back
  FROM cards
  WHERE active=1 AND image IS NOT NULL AND image != ''
  ORDER BY RANDOM()
  LIMIT 4
`).all();

    if (!cards.length) {
      return res.status(404).json({ message: 'No cards found in database.' });
    }

    res.json(cards);
  } catch (err) {
    console.error('❌ Error fetching random cards:', err);
    res.status(500).json({ error: 'Server error fetching random cards.' });
  }
});

// 📩 Submit rankings (with limiter applied directly)
app.post('/api/rankings', limiter, (req, res) => {
  const { ranking } = req.body;

  if (!Array.isArray(ranking) || ranking.length !== 4) {
    return res.status(400).json({ error: "Ranking must be an array of 4 cards." });
  }

  const stmt = db.prepare(`
    INSERT INTO cards (id, name, points, seen)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET 
      points = points + excluded.points,
      seen = seen + 1
  `);

if (process.env.NODE_ENV !== 'production') {
  console.log('📩 Received ranking:', ranking);
}

for (const { id, score } of ranking) {
  if (typeof score !== 'number') {
    return res.status(400).json({ error: `Invalid score for card ${id}. Must be a number.` });
  }

  try {
    const row = db.prepare(`SELECT name FROM cards WHERE id = ?`).get(id);
    if (row) {
      stmt.run(id, row.name, score);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Updated ${row.name} (${id}) with ${score} pts`);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Card not found: ${id}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error updating card ${id}:`, err.message);
  }
}

 const count = ranking.length;
db.prepare(`
  INSERT INTO meta (key, value)
  VALUES ('rankings_submitted', ?)
  ON CONFLICT(key) DO UPDATE SET value = value + ?
`).run(count, count);

  res.json({ message: 'Thanks for ranking!' });
});

// 🏆 Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const maxLimit = 30000;
    const limit = Math.min(parseInt(req.query.limit) || 100, maxLimit);
    const offset = parseInt(req.query.offset) || 0;

    const name = req.query.name?.trim();
    const color = req.query.color?.trim();
    const type = req.query.type?.trim();
    const sort = (req.query.sort || '').trim().toLowerCase();

    if ((name?.length || 0) > 50 || (color?.length || 0) > 50 || (type?.length || 0) > 50) {
  return res.status(400).json({ error: "Filter values must be under 50 characters." });
}

    let whereClause = `WHERE active=1 AND points != 0 AND image IS NOT NULL AND image != ''`;
    const filters = [];
    const values = [];

    if (name) {
      filters.push(`LOWER(name) LIKE ?`);
      values.push(`%${name.toLowerCase()}%`);
    }

    if (color) {
      const colorLower = color.toLowerCase();
      if (colorLower === 'multicolor' || colorLower === 'multicolored') {
        filters.push(`color LIKE '%,%'`);
      } else if (colorLower === 'colorless') {
        filters.push(`(color IS NULL OR color = '' OR LOWER(color) = 'colorless')`);
      } else {
        filters.push(`LOWER(color) = ?`);
        values.push(colorLower);
      }
    }

    if (type) {
      filters.push(`LOWER(type) LIKE ?`);
      values.push(`%${type.toLowerCase()}%`);
    }

    if (filters.length) {
      whereClause += ' AND ' + filters.join(' AND ');
    }

    const countQuery = `SELECT COUNT(*) AS total FROM cards ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...values);

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT id AS cardId, name AS cardName, image AS cardImage, image_back AS cardImageBack, points
      FROM cards
      ${whereClause}
      ORDER BY points ${sortOrder}
    `;
    const allCards = db.prepare(dataQuery).all(...values);

    // 🥇 Competition ranking with ascending count down if needed
    let rank = (sort === 'asc') ? total : 1;
    let lastPoints = null;
    let lastRank = rank;
    let tieCount = 0;

    allCards.forEach((card, index) => {
      if (index === 0) {
        card.rank = rank;
      } else {
        if (card.points === lastPoints) {
          card.rank = lastRank; // tie
          tieCount++;
        } else {
          if (sort === 'asc') {
            rank -= (tieCount + 1);
          } else {
            rank += (tieCount + 1);
          }
          card.rank = rank;
          lastRank = rank;
          tieCount = 0;
        }
      }
      lastPoints = card.points;
    });

    const paginatedCards = allCards.slice(offset, offset + limit);

    res.json({
      total,
      cards: paginatedCards
    });
  } catch (err) {
    console.error('❌ Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// 📈 Stats
app.get('/api/stats', (req, res) => {
  try {
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'rankings_submitted'`).get();
    const value = row ? row.value : 0;
    res.json({ totalRankings: value });
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to get stats.' });
  }
});

app.get('/api/progress', (req, res) => {
  try {
    const total = db.prepare(`
      SELECT COUNT(*) AS count
      FROM cards
      WHERE active = 1 AND image IS NOT NULL AND image != ''
    `).get().count;

    const ranked = db.prepare(`
  SELECT COUNT(*) AS count
  FROM cards
  WHERE active = 1 AND points != 0 AND image IS NOT NULL AND image != ''
`).get().count;

    res.json({ ranked, total });
  } catch (err) {
    console.error('❌ Error fetching progress data:', err);
    res.status(500).json({ error: 'Failed to fetch progress data.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});





























