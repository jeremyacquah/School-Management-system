const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// GET /api/students
router.get('/', authenticateToken, async (req, res) => {
  try {
    // If parent, restrict strictly to their child!
    if (req.user.role === 'parent') {
      if (!req.user.child_student_id) {
        return res.json([]);
      }
      const student = await dbGet('SELECT * FROM students WHERE id = ?', [req.user.child_student_id]);
      return res.json(student ? [student] : []);
    }

    const { class_grade, search } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (class_grade) {
      query += ' AND class_grade = ?';
      params.push(class_grade);
    }
    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR admission_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY class_grade ASC, last_name ASC, first_name ASC';

    const students = await dbAll(query, params);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/classes
router.get('/classes', authenticateToken, async (req, res) => {
  try {
    const classes = await dbAll('SELECT * FROM classes ORDER BY name ASC');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    // Parent can only view their own child
    if (req.user.role === 'parent' && req.user.child_student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own child.' });
    }

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students (User and Admin can create)
router.post('/', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    let { admission_number, first_name, last_name, name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address } = req.body;

    // Support single 'name' field
    if (name && (!first_name || !last_name)) {
      const parts = name.trim().split(/\s+/);
      first_name = parts[0] || 'Student';
      last_name = parts.slice(1).join(' ') || parts[0];
    }

    if (!first_name || !class_grade) {
      return res.status(400).json({ error: 'Student Name and Class/Grade are required.' });
    }

    if (!last_name) {
      last_name = first_name;
    }

    // Auto-generate admission number if not provided
    if (!admission_number || !admission_number.trim()) {
      const cleanClass = class_grade.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      admission_number = `GW-${cleanClass}-${randomSuffix}`;
    }

    // Default contact details if not provided
    if (!parent_name || !parent_name.trim()) {
      parent_name = 'Parent / Guardian';
    }
    if (!parent_phone || !parent_phone.trim()) {
      parent_phone = '0240000000';
    }
    if (!gender) {
      gender = 'Other';
    }

    // Unique Parent Access Password / PIN
    const parentCode = (req.body.parent_access_code || Math.floor(100000 + Math.random() * 900000).toString()).trim();

    const result = await dbRun(`
      INSERT INTO students (admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address, parent_access_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [admission_number.trim(), first_name.trim(), last_name.trim(), gender, dob || null, class_grade, parent_name.trim(), parent_phone.trim(), parent_email || null, address || null, parentCode]);

    // Automatically create corresponding parent login user
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(parentCode, salt);
    const parentUsername = `parent_${admission_number.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await dbRun(
      'INSERT INTO users (username, password_hash, role, full_name, phone, child_student_id) VALUES (?, ?, ?, ?, ?, ?)',
      [parentUsername, passHash, 'parent', parent_name.trim() || `Parent of ${first_name}`, parent_phone.trim() || null, result.lastID]
    );

    const createdStudent = await dbGet('SELECT * FROM students WHERE id = ?', [result.lastID]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'CREATE', 'Students', result.lastID, `Created student: ${first_name} ${last_name} (${admission_number}) in ${class_grade} with Parent Code: ${parentCode}`);

    res.status(201).json({ id: result.lastID, student: createdStudent, parent_access_code: parentCode, message: `Student ${first_name} ${last_name} registered successfully with Parent Password: ${parentCode}` });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Admission number already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id (Admin ONLY can update)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address } = req.body;
    const studentId = req.params.id;

    await dbRun(`
      UPDATE students
      SET admission_number = COALESCE(?, admission_number),
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          gender = COALESCE(?, gender),
          dob = COALESCE(?, dob),
          class_grade = COALESCE(?, class_grade),
          parent_name = COALESCE(?, parent_name),
          parent_phone = COALESCE(?, parent_phone),
          parent_email = COALESCE(?, parent_email),
          address = COALESCE(?, address)
      WHERE id = ?
    `, [admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address, studentId]);

    await logAudit(req.user.id, req.user.username, req.user.role, 'UPDATE', 'Students', studentId, `Updated student record ID: ${studentId}`);

    res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id (Admin ONLY can delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    await dbRun('DELETE FROM students WHERE id = ?', [studentId]);
    await logAudit(req.user.id, req.user.username, req.user.role, 'DELETE', 'Students', studentId, `Deleted student ID: ${studentId}`);
    res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
