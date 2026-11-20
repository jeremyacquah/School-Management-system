const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

// GET /api/terms (All authenticated users)
router.get('/terms', authenticateToken, async (req, res) => {
  try {
    const terms = await dbAll('SELECT * FROM terms ORDER BY session_year DESC, term_name ASC');
    res.json(terms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/terms/active
router.get('/terms/active', authenticateToken, async (req, res) => {
  try {
    const activeTerm = await dbGet('SELECT * FROM terms WHERE is_active = 1 LIMIT 1');
    res.json(activeTerm || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terms (ONLY Admin can create terms)
router.post('/terms', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { session_year, term_name, start_date, end_date, is_active } = req.body;
    if (!session_year || !term_name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Session year, term name, start date, and end date are required.' });
    }

    if (is_active) {
      await dbRun('UPDATE terms SET is_active = 0');
    }

    const result = await dbRun(`
      INSERT INTO terms (session_year, term_name, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [session_year, term_name, start_date, end_date, is_active ? 1 : 0]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'CREATE', 'Terms', result.lastID, `Created term: ${term_name} (${session_year})`);

    res.status(201).json({ id: result.lastID, message: 'Term created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/terms/:id (ONLY Admin can change terms)
router.put('/terms/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { session_year, term_name, start_date, end_date, is_active } = req.body;
    const termId = req.params.id;

    if (is_active) {
      await dbRun('UPDATE terms SET is_active = 0');
    }

    await dbRun(`
      UPDATE terms
      SET session_year = COALESCE(?, session_year),
          term_name = COALESCE(?, term_name),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [session_year, term_name, start_date, end_date, is_active !== undefined ? (is_active ? 1 : 0) : null, termId]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'UPDATE', 'Terms', termId, `Updated term settings for ID: ${termId}`);

    res.json({ message: 'Term updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weeks?term_id=... (All authenticated users)
router.get('/weeks', authenticateToken, async (req, res) => {
  try {
    const { term_id } = req.query;
    let query = 'SELECT * FROM weeks';
    const params = [];

    if (term_id) {
      query += ' WHERE term_id = ?';
      params.push(term_id);
    }
    query += ' ORDER BY week_number ASC';

    const weeks = await dbAll(query, params);
    res.json(weeks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weeks/current
router.get('/weeks/current', authenticateToken, async (req, res) => {
  try {
    const currentWeek = await dbGet('SELECT * FROM weeks WHERE is_current = 1 LIMIT 1');
    res.json(currentWeek || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weeks (ONLY Admin can create weeks)
router.post('/weeks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, week_number, week_title, start_date, end_date, is_current } = req.body;
    if (!term_id || !week_number || !week_title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Term ID, week number, title, start date, and end date are required.' });
    }

    if (is_current) {
      await dbRun('UPDATE weeks SET is_current = 0 WHERE term_id = ?', [term_id]);
    }

    const result = await dbRun(`
      INSERT INTO weeks (term_id, week_number, week_title, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [term_id, week_number, week_title, start_date, end_date, is_current ? 1 : 0]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'CREATE', 'Weeks', result.lastID, `Created week ${week_number} in Term ${term_id}`);

    res.status(201).json({ id: result.lastID, message: 'Week created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/weeks/:id (ONLY Admin can change weeks)
router.put('/weeks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { week_title, start_date, end_date, is_current, term_id } = req.body;
    const weekId = req.params.id;

    if (is_current && term_id) {
      await dbRun('UPDATE weeks SET is_current = 0 WHERE term_id = ?', [term_id]);
    }

    await dbRun(`
      UPDATE weeks
      SET week_title = COALESCE(?, week_title),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          is_current = COALESCE(?, is_current)
      WHERE id = ?
    `, [week_title, start_date, end_date, is_current !== undefined ? (is_current ? 1 : 0) : null, weekId]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'UPDATE', 'Weeks', weekId, `Updated week ID ${weekId}`);

    res.json({ message: 'Week updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
