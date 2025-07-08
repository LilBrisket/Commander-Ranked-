const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Update the database path to the persistent disk
const dbPath = '/DatabaseDisk/cards.db';  // Updated path

console.log('📂 Using database path:', dbPath);

// 🔒 Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ✅ Ensure the cards table exists
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

// 🧱 Ensure meta table exists for global stats
db.prepare(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
  )
`).run();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔀 Get 4 random cards
app.get('/api/cards/random', (req, res) => {
  try {
    const cards = db.prepare(`
      SELECT id, name, image
      FROM cards
      WHERE image IS NOT NULL AND image != ''
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

// 🧮 Accept ranking and apply custom points
app.post('/api/rankings', (req, res) => {
  const { ranking } = req.body;

  if (!Array.isArray(ranking)) {
    return res.status(400).json({ error: "Ranking must be an array." });
  }

  if (ranking.length !== 4) {
    return res.status(400).json({ error: "Ranking must contain exactly 4 cards." });
  }

  for (let i = 0; i < ranking.length; i++) {
    const entry = ranking[i];
    if (!entry || typeof entry !== 'object') {
      return res.status(400).json({ error: `Entry at index ${i} is not a valid object.` });
    }

    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      return res.status(400).json({ error: `Entry at index ${i} is missing a valid 'id'.` });
    }

    if (typeof entry.score !== 'number' || isNaN(entry.score)) {
      return res.status(400).json({ error: `Entry at index ${i} is missing a valid 'score' number.` });
    }
  }

  // ✅ Updated to increment seen
  const stmt = db.prepare(`
    INSERT INTO cards (id, name, points, seen)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET 
      points = points + excluded.points,
      seen = seen + 1
  `);

  console.log('📩 Received ranking:', ranking);

  for (const { id, score } of ranking) {
    try {
      const row = db.prepare(`SELECT name FROM cards WHERE id = ?`).get(id);
      if (row) {
        stmt.run(id, row.name, score);
        console.log(`✅ Updated ${row.name} (${id}) with ${score} pts`);
      } else {
        console.warn(`⚠️ Card not found: ${id}`);
      }
    } catch (err) {
      console.error(`❌ Error updating card ${id}:`, err.message);
    }
  }

  // ✅ Keep meta total increment (optional)
  db.prepare(`
    INSERT INTO meta (key, value)
    VALUES ('rankings_submitted', 1)
    ON CONFLICT(key) DO UPDATE SET value = value + 1
  `).run();

  res.json({ message: 'Thanks for ranking!' });
});

// 🏆 Leaderboard with filtering, pagination, and sorting
app.get('/api/leaderboard', (req, res) => {
  try {
    const maxLimit = 30000;
    const limit = Math.min(parseInt(req.query.limit) || 100, maxLimit);
    const offset = parseInt(req.query.offset) || 0;

    const name = req.query.name?.trim();
    const color = req.query.color?.trim();
    const type = req.query.type?.trim();
    const sort = req.query.sort?.trim().toLowerCase(); // asc or desc

    let whereClause = `WHERE points != 0 AND image IS NOT NULL AND image != ''`;
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
      SELECT id AS cardId, name AS cardName, image AS cardImage, points
      FROM cards
      ${whereClause}
      ORDER BY points ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const paginatedCards = db.prepare(dataQuery).all(...values, limit, offset);

    res.json({
      total,
      cards: paginatedCards
    });
  } catch (err) {
    console.error('❌ Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// 📊 ✅ Updated to use SUM(seen) from cards
app.get('/api/stats', (req, res) => {
  try {
    const { total } = db.prepare(`SELECT SUM(seen) as total FROM cards`).get();
    res.json({ totalRankings: total || 0 });
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to get stats.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});



















