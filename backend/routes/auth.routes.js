const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbAll, dbRun } = require('../database');
const { JWT_SECRET, authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, student_name } = req.body;
    const identifier = (username || student_name || '').trim();
    const loginPassword = (password || '').trim();

    if (!identifier || !loginPassword) {
      return res.status(400).json({ error: 'Username/Student name and password are required.' });
    }

    // 1. Try matching standard user (Admin, Staff, or direct user account)
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [identifier]);
    if (user && bcrypt.compareSync(loginPassword, user.password_hash)) {
      const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        child_student_id: user.child_student_id || null,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      await logAudit(user.id, user.username, user.role, 'LOGIN', 'Auth', user.id, `User logged in`);

      let childInfo = null;
      if (user.role === 'parent' && user.child_student_id) {
        childInfo = await dbGet('SELECT * FROM students WHERE id = ?', [user.child_student_id]);
      }

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          child_student_id: user.child_student_id,
          child: childInfo,
        },
      });
    }

    // 2. Try matching Student by Name or Admission Number + Unique Parent Password!
    const student = await dbGet(`
      SELECT * FROM students 
      WHERE (
        LOWER(admission_number) = LOWER(?) OR 
        LOWER(first_name || ' ' || last_name) = LOWER(?) OR 
        LOWER(last_name || ' ' || first_name) = LOWER(?) OR 
        LOWER(first_name) = LOWER(?)
      ) AND parent_access_code = ?
    `, [identifier, identifier, identifier, identifier, loginPassword]);

    if (student) {
      // Find or create parent account linked strictly to this child
      let parentUser = await dbGet('SELECT * FROM users WHERE role = "parent" AND child_student_id = ?', [student.id]);
      if (!parentUser) {
        const parentUsername = `parent_${student.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(loginPassword, salt);
        const resUser = await dbRun(
          'INSERT INTO users (username, password_hash, role, full_name, phone, child_student_id) VALUES (?, ?, ?, ?, ?, ?)',
          [parentUsername, passHash, 'parent', student.parent_name || `Parent of ${student.first_name}`, student.parent_phone || null, student.id]
        );
        parentUser = await dbGet('SELECT * FROM users WHERE id = ?', [resUser.lastID]);
      }

      // Generate JWT strictly containing child_student_id
      const payload = {
        id: parentUser.id,
        username: parentUser.username,
        role: 'parent',
        full_name: parentUser.full_name,
        child_student_id: student.id,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      await logAudit(parentUser.id, parentUser.username, 'parent', 'LOGIN', 'Auth', student.id, `Parent logged in for student: ${student.first_name} ${student.last_name} (${student.admission_number})`);

      return res.json({
        token,
        user: {
          id: parentUser.id,
          username: parentUser.username,
          role: 'parent',
          full_name: parentUser.full_name,
          email: parentUser.email,
          phone: parentUser.phone,
          child_student_id: student.id,
          child: student
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials. Please verify username/student name and password.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, role, full_name, email, phone, child_student_id FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let childInfo = null;
    if (user.role === 'parent' && user.child_student_id) {
      childInfo = await dbGet('SELECT * FROM students WHERE id = ?', [user.child_student_id]);
    }

    res.json({ ...user, child: childInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbAll(`
      SELECT u.id, u.username, u.role, u.full_name, u.email, u.phone, u.child_student_id, u.created_at,
             s.first_name as child_first_name, s.last_name as child_last_name, s.admission_number as child_admission
      FROM users u
      LEFT JOIN students s ON u.child_student_id = s.id
      ORDER BY u.id ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users (Admin only: create staff or parent account)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, full_name, email, phone, child_student_id } = req.body;
    if (!username || !password || !role || !full_name) {
      return res.status(400).json({ error: 'Username, password, role, and full_name are required.' });
    }

    if (!['admin', 'user', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, user, or parent.' });
    }

    if (role === 'parent' && !child_student_id) {
      return res.status(400).json({ error: 'Parent accounts must be linked to a child student ID.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = await dbRun(`
      INSERT INTO users (username, password_hash, role, full_name, email, phone, child_student_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [username.trim(), password_hash, role, full_name.trim(), email || null, phone || null, child_student_id || null]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'CREATE', 'Auth', result.lastID, `Created new ${role} account: ${username}`);

    res.status(201).json({
      id: result.lastID,
      username,
      role,
      full_name,
      email,
      phone,
      child_student_id,
      message: `${role} account created successfully.`
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
