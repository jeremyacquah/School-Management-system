const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/audit-logs (Admin ONLY can view)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { module, action, search, limit = 100 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (username LIKE ? OR details LIKE ? OR record_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY timestamp DESC, id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const logs = await dbAll(query, params);
    const countRes = await dbGet('SELECT COUNT(*) as total FROM audit_logs');

    res.json({
      total: countRes.total,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
