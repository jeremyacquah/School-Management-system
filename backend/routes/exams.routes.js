const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// GET /api/exams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { term_id, class_grade, subject_id } = req.query;

    let query = `
      SELECT e.*, s.name as subject_name, s.code as subject_code,
             t.term_name, t.session_year, w.week_number, w.week_title,
             COUNT(q.id) as total_questions
      FROM exams e
      JOIN subjects s ON e.subject_id = s.id
      JOIN terms t ON e.term_id = t.id
      LEFT JOIN weeks w ON e.week_id = w.id
      LEFT JOIN exam_questions q ON e.id = q.exam_id
      WHERE 1=1
    `;
    const params = [];

    // Parent sees exams for their child's class
    if (req.user.role === 'parent' && req.user.child_student_id) {
      const child = await dbGet('SELECT class_grade FROM students WHERE id = ?', [req.user.child_student_id]);
      if (child) {
        query += ' AND e.class_grade = ?';
        params.push(child.class_grade);
      }
    } else if (class_grade) {
      query += ' AND e.class_grade = ?';
      params.push(class_grade);
    }

    if (term_id) {
      query += ' AND e.term_id = ?';
      params.push(term_id);
    }
    if (subject_id) {
      query += ' AND e.subject_id = ?';
      params.push(subject_id);
    }

    query += ' GROUP BY e.id ORDER BY e.exam_date DESC';

    const exams = await dbAll(query, params);
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id (Includes question bank)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const examId = req.params.id;
    const exam = await dbGet(`
      SELECT e.*, s.name as subject_name, s.code as subject_code,
             t.term_name, t.session_year, w.week_number, w.week_title
      FROM exams e
      JOIN subjects s ON e.subject_id = s.id
      JOIN terms t ON e.term_id = t.id
      LEFT JOIN weeks w ON e.week_id = w.id
      WHERE e.id = ?
    `, [examId]);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    // Question bank
    const questions = await dbAll(`
      SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY question_number ASC
    `, [examId]);

    // If parent is viewing, don't show correct answers in question bank if uncompleted!
    const sanitizedQuestions = req.user.role === 'parent' 
      ? questions.map(q => ({ ...q, correct_answer: undefined }))
      : questions;

    // Submissions check
    let submission = null;
    if (req.user.role === 'parent' && req.user.child_student_id) {
      submission = await dbGet(`
        SELECT * FROM exam_submissions WHERE exam_id = ? AND student_id = ?
      `, [examId, req.user.child_student_id]);
    }

    res.json({
      ...exam,
      questions: sanitizedQuestions,
      submission: submission ? {
        ...submission,
        answers: JSON.parse(submission.answers_json || '{}')
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams (User and Admin can create exam schedule)
router.post('/', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { term_id, week_id, subject_id, class_grade, title, exam_date, duration_minutes = 60, total_marks = 100 } = req.body;
    if (!term_id || !subject_id || !class_grade || !title || !exam_date) {
      return res.status(400).json({ error: 'Term, subject, class, title, and exam date are required.' });
    }

    const result = await dbRun(`
      INSERT INTO exams (term_id, week_id, subject_id, class_grade, title, exam_date, duration_minutes, total_marks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [term_id, week_id || null, subject_id, class_grade, title.trim(), exam_date, Number(duration_minutes), Number(total_marks), req.user.full_name || req.user.username]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Exams',
      result.lastID,
      `Created exam "${title}" for ${class_grade} on ${exam_date}`
    );

    res.status(201).json({ message: 'Exam created successfully.', id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams/:id/questions (Add question to exam builder)
router.post('/:id/questions', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const examId = req.params.id;
    const { question_number, question_text, question_type = 'multiple_choice', option_a, option_b, option_c, option_d, correct_answer, points = 1.0 } = req.body;

    if (!question_text || !correct_answer) {
      return res.status(400).json({ error: 'Question text and correct answer are required.' });
    }

    const countRes = await dbGet('SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?', [examId]);
    const qNum = question_number || (countRes.count + 1);

    const result = await dbRun(`
      INSERT INTO exam_questions (exam_id, question_number, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [examId, qNum, question_text.trim(), question_type, option_a || null, option_b || null, option_c || null, option_d || null, String(correct_answer).trim().toLowerCase(), Number(points) || 1.0]);

    res.status(201).json({ message: 'Question added to exam successfully.', id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams/:id/submit (Auto-grading for objective questions)
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const examId = req.params.id;
    let { student_id, answers = {} } = req.body;

    // If parent role, force child_student_id
    if (req.user.role === 'parent') {
      student_id = req.user.child_student_id;
    }

    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required.' });
    }

    const questions = await dbAll('SELECT * FROM exam_questions WHERE exam_id = ?', [examId]);
    if (!questions.length) {
      return res.status(400).json({ error: 'This exam has no questions.' });
    }

    // AUTO-GRADING ENGINE
    let earnedScore = 0;
    let totalPossible = 0;
    const itemizedResults = [];

    for (const q of questions) {
      const qPts = q.points || 1.0;
      totalPossible += qPts;

      const studentAns = (answers[q.id] || answers[q.question_number] || '').toString().trim().toLowerCase();
      const correctAns = (q.correct_answer || '').toString().trim().toLowerCase();

      const isCorrect = studentAns === correctAns;
      if (isCorrect) {
        earnedScore += qPts;
      }

      itemizedResults.push({
        question_id: q.id,
        question_number: q.question_number,
        student_answer: studentAns,
        correct_answer: correctAns,
        is_correct: isCorrect,
        points_awarded: isCorrect ? qPts : 0,
        max_points: qPts
      });
    }

    // Save or update submission
    await dbRun(`
      INSERT INTO exam_submissions (exam_id, student_id, answers_json, score, total_possible, submitted_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        answers_json = excluded.answers_json,
        score = excluded.score,
        total_possible = excluded.total_possible,
        submitted_at = datetime('now')
    `, [examId, student_id, JSON.stringify(answers), earnedScore, totalPossible]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Exams',
      examId,
      `Exam ID ${examId} auto-graded for student ID ${student_id}: Score ${earnedScore}/${totalPossible} (${((earnedScore/totalPossible)*100).toFixed(1)}%)`
    );

    res.json({
      message: 'Exam submitted and auto-graded successfully!',
      student_id,
      score: earnedScore,
      total_possible: totalPossible,
      percentage: Number(((earnedScore / totalPossible) * 100).toFixed(1)),
      itemized_results: itemizedResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
