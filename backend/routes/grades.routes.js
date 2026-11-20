const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// Helper to calculate grade letter and GPA point
const calculateGradeDetails = (total) => {
  if (total >= 90) return { letter: 'A', gpa: 4.0, remark: 'Excellent' };
  if (total >= 80) return { letter: 'B', gpa: 3.0, remark: 'Very Good' };
  if (total >= 70) return { letter: 'C', gpa: 2.0, remark: 'Credit / Satisfactory' };
  if (total >= 60) return { letter: 'D', gpa: 1.0, remark: 'Pass' };
  return { letter: 'F', gpa: 0.0, remark: 'Fail / Needs Improvement' };
};

// GET /api/grades
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { term_id, class_grade, student_id, subject_id } = req.query;

    let query = `
      SELECT g.*, s.first_name, s.last_name, s.admission_number, s.class_grade,
             sub.name as subject_name, sub.code as subject_code,
             t.term_name, t.session_year,
             w.week_number, w.week_title
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN subjects sub ON g.subject_id = sub.id
      JOIN terms t ON g.term_id = t.id
      LEFT JOIN weeks w ON g.week_id = w.id
      WHERE 1=1
    `;
    const params = [];

    // Parent restricted strictly to child!
    if (req.user.role === 'parent') {
      if (!req.user.child_student_id) return res.json([]);
      query += ' AND g.student_id = ?';
      params.push(req.user.child_student_id);
    } else if (student_id) {
      query += ' AND g.student_id = ?';
      params.push(student_id);
    }

    if (term_id) {
      query += ' AND g.term_id = ?';
      params.push(term_id);
    }
    if (class_grade && class_grade !== 'all') {
      query += ' AND s.class_grade = ?';
      params.push(class_grade);
    }
    if (subject_id && subject_id !== 'all') {
      query += ' AND g.subject_id = ?';
      params.push(subject_id);
    }

    query += ' ORDER BY s.class_grade ASC, s.last_name ASC, sub.name ASC';

    const grades = await dbAll(query, params);
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/subjects
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const { class_grade } = req.query;
    let query = 'SELECT * FROM subjects';
    const params = [];
    if (class_grade && class_grade !== 'all') {
      query += ' WHERE class_grade = ?';
      params.push(class_grade);
    }
    query += ' ORDER BY class_grade ASC, code ASC';
    const subjects = await dbAll(query, params);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades/subjects (Add new school subject)
router.post('/subjects', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { code, name, class_grade, teacher_name } = req.body;
    if (!name || !class_grade) {
      return res.status(400).json({ error: 'Subject name and class are required.' });
    }

    const cleanName = name.trim();
    const cleanClass = class_grade.trim();
    const cleanCode = (code || `${cleanClass.replace(/\s+/g, '')}-${cleanName.substring(0, 3).toUpperCase()}`).trim();

    const result = await dbRun(
      'INSERT INTO subjects (code, name, class_grade, teacher_name) VALUES (?, ?, ?, ?)',
      [cleanCode, cleanName, cleanClass, teacher_name ? teacher_name.trim() : null]
    );

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Subjects',
      result.lastID,
      `Added new subject: ${cleanName} (${cleanCode}) for ${cleanClass}`
    );

    res.status(201).json({
      id: result.lastID,
      code: cleanCode,
      name: cleanName,
      class_grade: cleanClass,
      teacher_name: teacher_name || null,
      message: 'Subject added successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/grades/subjects/:id (Update school subject)
router.put('/subjects/:id', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { code, name, class_grade, teacher_name } = req.body;
    const { id } = req.params;

    const existing = await dbGet('SELECT * FROM subjects WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    await dbRun(
      'UPDATE subjects SET code = ?, name = ?, class_grade = ?, teacher_name = ? WHERE id = ?',
      [
        code ? code.trim() : existing.code,
        name ? name.trim() : existing.name,
        class_grade ? class_grade.trim() : existing.class_grade,
        teacher_name !== undefined ? (teacher_name ? teacher_name.trim() : null) : existing.teacher_name,
        id
      ]
    );

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Subjects',
      id,
      `Updated subject ${name || existing.name} (ID: ${id})`
    );

    res.json({ message: 'Subject updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/grades/subjects/:id (Delete school subject)
router.delete('/subjects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM subjects WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const linkedGrades = await dbGet('SELECT COUNT(*) as count FROM grades WHERE subject_id = ?', [id]);
    if (linkedGrades && linkedGrades.count > 0) {
      return res.status(400).json({ error: `Cannot delete: ${linkedGrades.count} recorded grade(s) exist for this subject.` });
    }

    await dbRun('DELETE FROM subjects WHERE id = ?', [id]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'DELETE',
      'Subjects',
      id,
      `Deleted subject ${existing.name} (ID: ${id})`
    );

    res.json({ message: 'Subject deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/rankings (Auto calculate averages, GPA, rankings)
router.get('/rankings', authenticateToken, async (req, res) => {
  try {
    const { term_id, class_grade } = req.query;
    if (!term_id || !class_grade) {
      return res.status(400).json({ error: 'Term ID and class grade are required.' });
    }

    const students = await dbAll(`
      SELECT s.id, s.admission_number, s.first_name, s.last_name, s.class_grade,
             COUNT(g.id) as subjects_count,
             AVG(g.total_score) as average_score,
             AVG(g.gpa_point) as gpa
      FROM students s
      LEFT JOIN grades g ON s.id = g.student_id AND g.term_id = ?
      WHERE s.class_grade = ?
      GROUP BY s.id
      ORDER BY average_score DESC, gpa DESC
    `, [term_id, class_grade]);

    // Assign ranking (1st, 2nd, 3rd, etc.)
    const rankedStudents = students.map((std, index) => ({
      ...std,
      average_score: std.average_score ? Number(Number(std.average_score).toFixed(2)) : 0,
      gpa: std.gpa ? Number(Number(std.gpa).toFixed(2)) : 0,
      rank: index + 1,
      rank_suffix: getOrdinalSuffix(index + 1)
    }));

    // If parent is viewing, find child's rank
    if (req.user.role === 'parent') {
      const childRank = rankedStudents.find(s => s.id === req.user.child_student_id);
      return res.json(childRank ? [childRank] : []);
    }

    res.json(rankedStudents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/report-card/:student_id
router.get('/report-card/:student_id', authenticateToken, async (req, res) => {
  try {
    const studentId = Number(req.params.student_id);
    const { term_id } = req.query;

    if (req.user.role === 'parent' && req.user.child_student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own child\'s report card.' });
    }

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const term = term_id 
      ? await dbGet('SELECT * FROM terms WHERE id = ?', [term_id])
      : await dbGet('SELECT * FROM terms WHERE is_active = 1 LIMIT 1');

    if (!term) {
      return res.status(404).json({ error: 'Term not found.' });
    }

    // Get subject grades
    const grades = await dbAll(`
      SELECT g.*, sub.name as subject_name, sub.code as subject_code
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = ? AND g.term_id = ?
      ORDER BY sub.name ASC
    `, [studentId, term.id]);

    // Calculate overall term average and GPA
    let totalScoreSum = 0;
    let gpaPointSum = 0;
    grades.forEach(g => {
      totalScoreSum += g.total_score || 0;
      gpaPointSum += g.gpa_point || 0;
    });

    const subjectCount = grades.length;
    const termAverage = subjectCount > 0 ? (totalScoreSum / subjectCount).toFixed(2) : 0;
    const termGpa = subjectCount > 0 ? (gpaPointSum / subjectCount).toFixed(2) : 0;

    // Get class ranking
    const classmates = await dbAll(`
      SELECT s.id, AVG(g.total_score) as avg_score
      FROM students s
      JOIN grades g ON s.id = g.student_id
      WHERE s.class_grade = ? AND g.term_id = ?
      GROUP BY s.id
      ORDER BY avg_score DESC
    `, [student.class_grade, term.id]);

    let rank = '-';
    let totalInClass = classmates.length;
    const classIdx = classmates.findIndex(c => c.id === studentId);
    if (classIdx !== -1) {
      rank = `${classIdx + 1}${getOrdinalSuffix(classIdx + 1)} out of ${totalInClass}`;
    }

    // Attendance summary for this student in this term
    const attStats = await dbGet(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
      FROM attendance
      WHERE student_id = ? AND term_id = ?
    `, [studentId, term.id]);

    const reportCard = {
      school_name: 'Greenwood International Academy',
      school_motto: 'Excellence, Integrity & Leadership',
      academic_session: term.session_year,
      term_name: term.term_name,
      student,
      grades,
      summary: {
        total_subjects: subjectCount,
        term_average: Number(termAverage),
        term_gpa: Number(termGpa),
        class_rank: rank,
        attendance: attStats || { total_days: 0, present_days: 0, absent_days: 0, late_days: 0 }
      },
      headmaster_remark: Number(termAverage) >= 80 ? 'Outstanding academic excellence. Keep it up!' : 'Good effort, encourage consistent study routines.',
      generated_at: new Date().toISOString()
    };

    res.json(reportCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/transcript/:student_id (Multi-term transcript)
router.get('/transcript/:student_id', authenticateToken, async (req, res) => {
  try {
    const studentId = Number(req.params.student_id);

    if (req.user.role === 'parent' && req.user.child_student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own child\'s transcript.' });
    }

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const terms = await dbAll('SELECT * FROM terms ORDER BY session_year ASC, term_name ASC');
    const termRecords = [];

    let overallSum = 0;
    let overallCount = 0;

    for (const t of terms) {
      const grades = await dbAll(`
        SELECT g.*, sub.name as subject_name, sub.code as subject_code
        FROM grades g
        JOIN subjects sub ON g.subject_id = sub.id
        WHERE g.student_id = ? AND g.term_id = ?
      `, [studentId, t.id]);

      if (grades.length > 0) {
        const avg = (grades.reduce((acc, g) => acc + g.total_score, 0) / grades.length).toFixed(2);
        const gpa = (grades.reduce((acc, g) => acc + g.gpa_point, 0) / grades.length).toFixed(2);
        overallSum += Number(gpa);
        overallCount++;

        termRecords.push({
          term: t,
          grades,
          term_average: Number(avg),
          term_gpa: Number(gpa)
        });
      }
    }

    const cumulativeGpa = overallCount > 0 ? (overallSum / overallCount).toFixed(2) : '0.00';

    res.json({
      student,
      cumulative_gpa: Number(cumulativeGpa),
      terms: termRecords,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades (User and Admin can input grades)
router.post('/', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { student_id, subject_id, term_id, week_id, assignment_score = 0, quiz_score = 0, midterm_score = 0, exam_score = 0, teacher_comment } = req.body;
    if (!student_id || !subject_id || !term_id) {
      return res.status(400).json({ error: 'Student, subject, and term are required.' });
    }

    const as = Number(assignment_score) || 0;
    const qz = Number(quiz_score) || 0;
    const mid = Number(midterm_score) || 0;
    const ex = Number(exam_score) || 0;
    const total = as + qz + mid + ex;
    const { letter, gpa } = calculateGradeDetails(total);

    const result = await dbRun(`
      INSERT INTO grades (student_id, subject_id, term_id, week_id, assignment_score, quiz_score, midterm_score, exam_score, total_score, grade_letter, gpa_point, teacher_comment, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(student_id, subject_id, term_id) DO UPDATE SET
        week_id = excluded.week_id,
        assignment_score = excluded.assignment_score,
        quiz_score = excluded.quiz_score,
        midterm_score = excluded.midterm_score,
        exam_score = excluded.exam_score,
        total_score = excluded.total_score,
        grade_letter = excluded.grade_letter,
        gpa_point = excluded.gpa_point,
        teacher_comment = excluded.teacher_comment,
        updated_at = datetime('now')
    `, [student_id, subject_id, term_id, week_id || null, as, qz, mid, ex, total, letter, gpa, teacher_comment || null, req.user.full_name || req.user.username]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Grades',
      result.lastID,
      `Entered grades for student ID ${student_id}, subject ${subject_id}: Total ${total} (${letter})`
    );

    res.status(201).json({
      message: 'Grade entered successfully.',
      total_score: total,
      grade_letter: letter,
      gpa_point: gpa
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/grades/:id (Admin ONLY can edit grades)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const gradeId = req.params.id;
    const { assignment_score, quiz_score, midterm_score, exam_score, teacher_comment } = req.body;

    const existing = await dbGet('SELECT * FROM grades WHERE id = ?', [gradeId]);
    if (!existing) {
      return res.status(404).json({ error: 'Grade record not found.' });
    }

    const as = assignment_score !== undefined ? Number(assignment_score) : existing.assignment_score;
    const qz = quiz_score !== undefined ? Number(quiz_score) : existing.quiz_score;
    const mid = midterm_score !== undefined ? Number(midterm_score) : existing.midterm_score;
    const ex = exam_score !== undefined ? Number(exam_score) : existing.exam_score;
    const total = as + qz + mid + ex;
    const { letter, gpa } = calculateGradeDetails(total);

    await dbRun(`
      UPDATE grades
      SET assignment_score = ?,
          quiz_score = ?,
          midterm_score = ?,
          exam_score = ?,
          total_score = ?,
          grade_letter = ?,
          gpa_point = ?,
          teacher_comment = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [as, qz, mid, ex, total, letter, gpa, teacher_comment !== undefined ? teacher_comment : existing.teacher_comment, gradeId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Grades',
      gradeId,
      `Admin updated grade ID ${gradeId}: Total adjusted to ${total} (${letter})`
    );

    res.json({ message: 'Grade record updated successfully by administrator.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/export-excel
router.get('/export-excel', authenticateToken, async (req, res) => {
  try {
    const { term_id, class_grade } = req.query;
    if (!term_id || !class_grade) {
      return res.status(400).json({ error: 'Term ID and class grade are required.' });
    }

    const rows = await dbAll(`
      SELECT s.admission_number, s.first_name, s.last_name, s.class_grade,
             sub.name as subject_name, sub.code as subject_code,
             g.assignment_score, g.quiz_score, g.midterm_score, g.exam_score,
             g.total_score, g.grade_letter, g.gpa_point, g.teacher_comment
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.term_id = ? AND s.class_grade = ?
      ORDER BY s.last_name ASC, sub.name ASC
    `, [term_id, class_grade]);

    const worksheetData = rows.map(r => ({
      'Admission No': r.admission_number,
      'Student Name': `${r.first_name} ${r.last_name}`,
      'Class': r.class_grade,
      'Subject Code': r.subject_code,
      'Subject Name': r.subject_name,
      'Assignment (20)': r.assignment_score,
      'Quiz (20)': r.quiz_score,
      'Midterm (20)': r.midterm_score,
      'Exam (40)': r.exam_score,
      'Total Score (100)': r.total_score,
      'Grade': r.grade_letter,
      'GPA Point': r.gpa_point,
      'Comments': r.teacher_comment || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Grades_${class_grade}_Term${term_id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades/import-excel
router.post('/import-excel', authenticateToken, enforceUserPermissions, upload.single('file'), async (req, res) => {
  try {
    if (!req.file && !req.body.jsonData) {
      return res.status(400).json({ error: 'Please upload an Excel file or provide JSON data.' });
    }

    let records = [];
    if (req.file) {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      records = JSON.parse(req.body.jsonData);
    }

    const { term_id } = req.body;
    if (!term_id) {
      return res.status(400).json({ error: 'Term ID is required for import.' });
    }

    let importedCount = 0;
    for (const r of records) {
      const adm = r['Admission No'] || r.admission_number;
      const subCode = r['Subject Code'] || r.subject_code;
      if (!adm || !subCode) continue;

      const student = await dbGet('SELECT id FROM students WHERE admission_number = ?', [String(adm).trim()]);
      const subject = await dbGet('SELECT id FROM subjects WHERE code = ?', [String(subCode).trim()]);
      if (!student || !subject) continue;

      const as = Number(r['Assignment (20)'] || r.assignment_score || 0);
      const qz = Number(r['Quiz (20)'] || r.quiz_score || 0);
      const mid = Number(r['Midterm (20)'] || r.midterm_score || 0);
      const ex = Number(r['Exam (40)'] || r.exam_score || 0);
      const total = as + qz + mid + ex;
      const { letter, gpa } = calculateGradeDetails(total);

      await dbRun(`
        INSERT INTO grades (student_id, subject_id, term_id, assignment_score, quiz_score, midterm_score, exam_score, total_score, grade_letter, gpa_point, teacher_comment, created_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(student_id, subject_id, term_id) DO UPDATE SET
          assignment_score = excluded.assignment_score,
          quiz_score = excluded.quiz_score,
          midterm_score = excluded.midterm_score,
          exam_score = excluded.exam_score,
          total_score = excluded.total_score,
          grade_letter = excluded.grade_letter,
          gpa_point = excluded.gpa_point,
          teacher_comment = excluded.teacher_comment,
          updated_at = datetime('now')
      `, [student.id, subject.id, term_id, as, qz, mid, ex, total, letter, gpa, r['Comments'] || r.teacher_comment || null, req.user.full_name || req.user.username]);

      importedCount++;
    }

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Grades',
      `Import-Term-${term_id}`,
      `Imported ${importedCount} grades from Excel spreadsheet`
    );

    res.json({ message: `Successfully imported ${importedCount} grade entries.`, count: importedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getOrdinalSuffix(i) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

module.exports = router;
