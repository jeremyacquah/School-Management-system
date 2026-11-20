const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

// Helper to check if two time ranges overlap
// Times in "HH:MM" format (24-hour)
const timesOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

// GET /api/timetable (Users and Parents view only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { term_id, class_grade, teacher_name, room, day_of_week } = req.query;

    let query = `
      SELECT tt.*, s.name as subject_name, s.code as subject_code, s.class_grade as subject_class_grade,
             t.term_name, t.session_year,
             w.week_number, w.week_title
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN terms t ON tt.term_id = t.id
      LEFT JOIN weeks w ON tt.week_id = w.id
      WHERE 1=1
    `;
    const params = [];

    // Parent sees timetable for their child's class
    if (req.user.role === 'parent' && req.user.child_student_id) {
      const child = await dbGet('SELECT class_grade FROM students WHERE id = ?', [req.user.child_student_id]);
      if (child) {
        query += ' AND tt.class_grade = ?';
        params.push(child.class_grade);
      }
    } else if (class_grade && class_grade.toLowerCase() !== 'all') {
      query += ' AND tt.class_grade = ?';
      params.push(class_grade);
    }

    if (term_id) {
      query += ' AND tt.term_id = ?';
      params.push(term_id);
    }
    if (teacher_name) {
      query += ' AND tt.teacher_name = ?';
      params.push(teacher_name);
    }
    if (room) {
      query += ' AND tt.room = ?';
      params.push(room);
    }
    if (day_of_week && day_of_week.toLowerCase() !== 'all') {
      query += ' AND tt.day_of_week = ?';
      params.push(day_of_week);
    }

    query += ' ORDER BY CASE tt.day_of_week WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 ELSE 6 END, tt.start_time ASC';

    const slots = await dbAll(query, params);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable (Admin ONLY: assigns teachers, subjects, rooms without clashes)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, week_id, class_grade, subject_id, teacher_name, room, day_of_week, start_time, end_time } = req.body;
    if (!term_id || !class_grade || !subject_id || !teacher_name || !room || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'All timetable slot fields are required.' });
    }

    // CLASH DETECTION 1: Check Teacher Clash on the same day and overlapping time
    const teacherSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.teacher_name = ?
    `, [term_id, day_of_week, teacher_name]);

    for (const slot of teacherSlots) {
      if (timesOverlap(start_time, end_time, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Teacher Clash: ${teacher_name} is already assigned to ${slot.class_grade} (${slot.subject_name}) in ${slot.room} from ${slot.start_time} to ${slot.end_time} on ${day_of_week}.`
        });
      }
    }

    // CLASH DETECTION 2: Check Room Clash on the same day and overlapping time
    const roomSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.room = ?
    `, [term_id, day_of_week, room]);

    for (const slot of roomSlots) {
      if (timesOverlap(start_time, end_time, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Room Clash: ${room} is already occupied by ${slot.class_grade} (${slot.subject_name}) taught by ${slot.teacher_name} from ${slot.start_time} to ${slot.end_time} on ${day_of_week}.`
        });
      }
    }

    // CLASH DETECTION 3: Check Class Clash (same class having 2 subjects at once)
    const classSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.class_grade = ?
    `, [term_id, day_of_week, class_grade]);

    for (const slot of classSlots) {
      if (timesOverlap(start_time, end_time, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Class Clash: ${class_grade} already has a lesson (${slot.subject_name}) scheduled from ${slot.start_time} to ${slot.end_time} on ${day_of_week}.`
        });
      }
    }

    // All clash checks passed, insert slot
    const result = await dbRun(`
      INSERT INTO timetables (term_id, week_id, class_grade, subject_id, teacher_name, room, day_of_week, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [term_id, week_id || null, class_grade, subject_id, teacher_name.trim(), room.trim(), day_of_week, start_time, end_time]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Timetable',
      result.lastID,
      `Scheduled ${class_grade} on ${day_of_week} ${start_time}-${end_time} in ${room} with ${teacher_name} (Clash checks passed)`
    );

    res.status(201).json({ message: 'Timetable slot created with zero clashes.', id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/:id (Admin ONLY)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slotId = Number(req.params.id);
    const { term_id, week_id, class_grade, subject_id, teacher_name, room, day_of_week, start_time, end_time } = req.body;

    const existing = await dbGet('SELECT * FROM timetables WHERE id = ?', [slotId]);
    if (!existing) {
      return res.status(404).json({ error: 'Timetable slot not found.' });
    }

    const tId = term_id || existing.term_id;
    const cGrade = class_grade || existing.class_grade;
    const sId = subject_id || existing.subject_id;
    const tName = teacher_name ? teacher_name.trim() : existing.teacher_name;
    const rRoom = room ? room.trim() : existing.room;
    const day = day_of_week || existing.day_of_week;
    const sTime = start_time || existing.start_time;
    const eTime = end_time || existing.end_time;

    // CLASH DETECTION 1: Check Teacher Clash
    const teacherSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.teacher_name = ? AND tt.id != ?
    `, [tId, day, tName, slotId]);

    for (const slot of teacherSlots) {
      if (timesOverlap(sTime, eTime, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Teacher Clash: ${tName} is already assigned to ${slot.class_grade} (${slot.subject_name}) in ${slot.room} from ${slot.start_time} to ${slot.end_time} on ${day}.`
        });
      }
    }

    // CLASH DETECTION 2: Check Room Clash
    const roomSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.room = ? AND tt.id != ?
    `, [tId, day, rRoom, slotId]);

    for (const slot of roomSlots) {
      if (timesOverlap(sTime, eTime, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Room Clash: ${rRoom} is already occupied by ${slot.class_grade} (${slot.subject_name}) taught by ${slot.teacher_name} from ${slot.start_time} to ${slot.end_time} on ${day}.`
        });
      }
    }

    // CLASH DETECTION 3: Check Class Clash
    const classSlots = await dbAll(`
      SELECT tt.*, s.name as subject_name
      FROM timetables tt
      JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.term_id = ? AND tt.day_of_week = ? AND tt.class_grade = ? AND tt.id != ?
    `, [tId, day, cGrade, slotId]);

    for (const slot of classSlots) {
      if (timesOverlap(sTime, eTime, slot.start_time, slot.end_time)) {
        return res.status(409).json({
          error: `Class Clash: ${cGrade} already has a lesson (${slot.subject_name}) scheduled from ${slot.start_time} to ${slot.end_time} on ${day}.`
        });
      }
    }

    await dbRun(`
      UPDATE timetables
      SET term_id = ?, week_id = ?, class_grade = ?, subject_id = ?, teacher_name = ?, room = ?, day_of_week = ?, start_time = ?, end_time = ?
      WHERE id = ?
    `, [tId, week_id || existing.week_id, cGrade, sId, tName, rRoom, day, sTime, eTime, slotId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Timetable',
      slotId,
      `Updated timetable slot ${slotId} for ${cGrade} on ${day} ${sTime}-${eTime}`
    );

    res.json({ message: 'Timetable slot updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/:id (Admin ONLY)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slotId = req.params.id;
    await dbRun('DELETE FROM timetables WHERE id = ?', [slotId]);
    await logAudit(req.user.id, req.user.username, req.user.role, 'DELETE', 'Timetable', slotId, `Admin removed timetable slot ${slotId}`);
    res.json({ message: 'Timetable slot deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
