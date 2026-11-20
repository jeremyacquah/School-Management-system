const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, logAudit } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// GET /api/files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { module } = req.query;
    let query = 'SELECT * FROM uploaded_files';
    const params = [];
    if (module) {
      query += ' WHERE module = ?';
      params.push(module);
    }
    query += ' ORDER BY created_at DESC';
    const files = await dbAll(query, params);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/upload
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { module = 'general' } = req.body;
    const storedPath = `/uploads/${req.file.filename}`;

    const result = await dbRun(`
      INSERT INTO uploaded_files (original_name, stored_filename, file_path, file_size, mime_type, module, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.file.originalname, req.file.filename, storedPath, req.file.size, req.file.mimetype, module, req.user.username]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Files',
      result.lastID,
      `Uploaded file "${req.file.originalname}" (${(req.file.size/1024).toFixed(1)} KB) to ${module}`
    );

    res.status(201).json({
      id: result.lastID,
      original_name: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: storedPath,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      module
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/:id/download
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const file = await dbGet('SELECT * FROM uploaded_files WHERE id = ?', [req.params.id]);
    if (!file) {
      return res.status(404).json({ error: 'File record not found.' });
    }

    const fullPath = path.resolve(__dirname, '../../uploads', file.stored_filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File missing from storage disk.' });
    }

    res.download(fullPath, file.original_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
