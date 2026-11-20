const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// GET /api/attendance
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { term_id, week_id, date, class_grade, student_id } = req.query;

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.admission_number, s.class_grade,
             w.week_number, w.week_title, t.term_name, t.session_year
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN terms t ON a.term_id = t.id
      JOIN weeks w ON a.week_id = w.id
      WHERE 1=1
    `;
    const params = [];

    // Parent restricted to child only!
    if (req.user.role === 'parent') {
      if (!req.user.child_student_id) return res.json([]);
      query += ' AND a.student_id = ?';
      params.push(req.user.child_student_id);
    } else if (student_id) {
      query += ' AND a.student_id = ?';
      params.push(student_id);
    }

    if (term_id) {
      query += ' AND a.term_id = ?';
      params.push(term_id);
    }
    if (week_id) {
      query += ' AND a.week_id = ?';
      params.push(week_id);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (class_grade) {
      query += ' AND s.class_grade = ?';
      params.push(class_grade);
    }

    query += ' ORDER BY a.date DESC, s.last_name ASC, s.first_name ASC';

    const records = await dbAll(query, params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/stats (Summary for parent or teacher)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let studentId = req.query.student_id;
    if (req.user.role === 'parent') {
      studentId = req.user.child_student_id;
    }

    const { term_id } = req.query;
    let query = `
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
      FROM attendance
      WHERE 1=1
    `;
    const params = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    if (term_id) {
      query += ' AND term_id = ?';
      params.push(term_id);
    }

    const stats = await dbGet(query, params);
    const total = stats.total_days || 0;
    const present = (stats.present_count || 0) + (stats.late_count || 0);
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

    res.json({
      ...stats,
      percentage: Number(percentage)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/batch (User and Admin can input daily attendance with auto absent marking)
router.post('/batch', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { term_id, week_id, date, class_grade, records = [], auto_mark_absent = true } = req.body;
    if (!term_id || !week_id || !date || !class_grade) {
      return res.status(400).json({ error: 'Term, week, date, and class are required.' });
    }

    // Fetch all students in this class
    const classStudents = await dbAll('SELECT id, first_name, last_name FROM students WHERE class_grade = ?', [class_grade]);
    const recordedStudentIds = new Set(records.map(r => Number(r.student_id)));

    const allRecordsToSave = [...records];

    // Auto absent marking: Any student in class not marked gets marked absent
    if (auto_mark_absent) {
      for (const s of classStudents) {
        if (!recordedStudentIds.has(s.id)) {
          allRecordsToSave.push({
            student_id: s.id,
            status: 'absent',
            remarks: 'Auto-marked absent (unrecorded)'
          });
        }
      }
    }

    let insertedCount = 0;
    for (const rec of allRecordsToSave) {
      await dbRun(`
        INSERT INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(student_id, date) DO UPDATE SET
          status = excluded.status,
          remarks = excluded.remarks,
          recorded_by = excluded.recorded_by,
          updated_at = datetime('now')
      `, [rec.student_id, term_id, week_id, date, rec.status || 'present', rec.remarks || null, req.user.full_name || req.user.username]);
      insertedCount++;
    }

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Attendance',
      `${class_grade}-${date}`,
      `Recorded attendance for ${insertedCount} students in ${class_grade} on ${date} (Auto-absent: ${auto_mark_absent})`
    );

    res.status(201).json({
      message: `Attendance successfully saved for ${insertedCount} students.`,
      count: insertedCount,
      auto_marked_absent: auto_mark_absent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendance/:id (Admin ONLY can edit attendance records)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const attendanceId = req.params.id;

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Status must be present, absent, late, or excused.' });
    }

    await dbRun(`
      UPDATE attendance
      SET status = ?,
          remarks = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [status, remarks || null, attendanceId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Attendance',
      attendanceId,
      `Admin updated attendance ID ${attendanceId} status to: ${status}`
    );

    res.json({ message: 'Attendance record updated successfully by administrator.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
