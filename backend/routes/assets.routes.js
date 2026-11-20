const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// GET /api/assets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, condition, location, search } = req.query;

    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (condition) {
      query += ' AND condition = ?';
      params.push(condition);
    }
    if (location) {
      query += ' AND location = ?';
      params.push(location);
    }
    if (search) {
      query += ' AND (item_name LIKE ? OR asset_tag LIKE ? OR custodian LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY category ASC, item_name ASC';

    const assets = await dbAll(query, params);
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets (User and Admin can create assets)
router.post('/', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { asset_tag, item_name, category, location, quantity = 1, condition = 'good', custodian, purchase_date, estimated_value = 0 } = req.body;
    if (!asset_tag || !item_name || !category || !location) {
      return res.status(400).json({ error: 'Asset tag, item name, category, and location are required.' });
    }

    const result = await dbRun(`
      INSERT INTO assets (asset_tag, item_name, category, location, quantity, condition, custodian, purchase_date, estimated_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [asset_tag.trim(), item_name.trim(), category, location.trim(), Number(quantity) || 1, condition, custodian || null, purchase_date || null, Number(estimated_value) || 0]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Assets',
      result.lastID,
      `Added asset: ${item_name} (${asset_tag}) in ${location} (Qty: ${quantity})`
    );

    res.status(201).json({ message: 'Asset registered successfully.', id: result.lastID });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Asset tag already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/assets/:id (Admin ONLY can update assets)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const assetId = req.params.id;
    const { item_name, category, location, quantity, condition, custodian, purchase_date, estimated_value } = req.body;

    await dbRun(`
      UPDATE assets
      SET item_name = COALESCE(?, item_name),
          category = COALESCE(?, category),
          location = COALESCE(?, location),
          quantity = COALESCE(?, quantity),
          condition = COALESCE(?, condition),
          custodian = COALESCE(?, custodian),
          purchase_date = COALESCE(?, purchase_date),
          estimated_value = COALESCE(?, estimated_value)
      WHERE id = ?
    `, [item_name, category, location, quantity !== undefined ? Number(quantity) : null, condition, custodian, purchase_date, estimated_value !== undefined ? Number(estimated_value) : null, assetId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Assets',
      assetId,
      `Admin updated asset ID ${assetId} details`
    );

    res.json({ message: 'Asset updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assets/:id (Admin ONLY can delete assets)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const assetId = req.params.id;
    await dbRun('DELETE FROM assets WHERE id = ?', [assetId]);
    await logAudit(req.user.id, req.user.username, req.user.role, 'DELETE', 'Assets', assetId, `Admin deleted asset ID ${assetId}`);
    res.json({ message: 'Asset deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
