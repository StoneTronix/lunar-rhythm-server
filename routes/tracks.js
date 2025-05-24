const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все треки
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (t.id) t.*
      FROM tracks t
      LEFT JOIN playlist_tracks pt ON t.id = pt.track_id
      ORDER BY t.id
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;