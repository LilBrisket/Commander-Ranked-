const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const db = new Database('cards.db');
db.pragma('journal_mode = WAL');

// 🛠️ Create the cards table if it doesn't exist
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔀 Get 3 random cards
app.get('/api/cards/random', (req, res) => {
  try {
    const cards = db.prepare(`
      SELECT id, name, image
      FROM cards
      WHERE image IS NOT NULL AND image != ''
      ORDER BY RANDOM()
      LIMIT 3
    `).all();

    if (cards.length === 0) {
      return res.status(404).json({ message: 'No cards found in database.' });
    }

    res.json(cards);
  } catch (err) {
    console.error('❌ Error fetching cards:', err);
    res.status(500).json({ error: 'Server error fetching cards.' });
  }
});

// 🧮 Accept ranking and apply points
app.post('/api/rankings', (req, res) => {
  const { ranking } = req.body;
  const pointsPerRank = [1, 0, -1];

  const stmt = db.prepare(`
    INSERT INTO cards (id, name, points)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET points = points + excluded.points
  `);

  console.log("📩 Received ranking:", ranking);

  ranking.forEach((cardId, index) => {
    const points = pointsPerRank[index] ?? 0;
    const row = db.prepare(`SELECT name FROM cards WHERE id = ?`).get(cardId);

    if (row) {
      stmt.run(cardId, row.name, points);
      console.log(`✅ Updated ${row.name} (${cardId}) with ${points} pts`);
    } else {
      console.warn(`❌ Tried to rank nonexistent card: ${cardId}`);
    }
  });

  res.json({ message: 'Thanks for ranking!' });
});

// 🏆 Leaderboard with smart color/type filters
app.get('/api/leaderboard', (req, res) => {
  try {
    const maxLimit = 30000;
    const limit = Math.min(parseInt(req.query.limit) || 100, maxLimit);
    const offset = parseInt(req.query.offset) || 0;

    const name = req.query.name?.trim();
    const color = req.query.color?.trim();
    const type = req.query.type?.trim();

    let query = `
      SELECT id AS cardId, name AS cardName, image AS cardImage, points
      FROM cards
      WHERE points != 0 AND image IS NOT NULL AND image != ''
    `;
    const filters = [];
    const values = [];

    if (name) {
      filters.push('LOWER(name) LIKE ?');
      values.push(`%${name.toLowerCase()}%`);
    }

    if (color) {
      const colorLower = color.toLowerCase();
      if (colorLower === 'multicolor' || colorLower === 'multicolored') {
        filters.push("color LIKE '%,%'");
      } else if (colorLower === 'colorless') {
        filters.push("(color IS NULL OR color = '' OR LOWER(color) = 'colorless')");
      } else {
        filters.push('LOWER(color) = ?');
        values.push(colorLower);
      }
    }

    if (type) {
      filters.push('LOWER(type) LIKE ?');
      values.push(`%${type.toLowerCase()}%`);
    }

    if (filters.length > 0) {
      query += ' AND ' + filters.join(' AND ');
    }

    query += ' ORDER BY points DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const leaderboard = db.prepare(query).all(...values);
    res.json(leaderboard);
  } catch (err) {
    console.error('❌ Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});