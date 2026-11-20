const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

// GET /api/notices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { term_id, week_id } = req.query;

    let query = `
      SELECT n.*, t.term_name, t.session_year, w.week_number, w.week_title
      FROM notices n
      LEFT JOIN terms t ON n.term_id = t.id
      LEFT JOIN weeks w ON n.week_id = w.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by role: Parent sees 'all' and 'parents'
    if (req.user.role === 'parent') {
      query += ` AND (n.target_audience = 'all' OR n.target_audience = 'parents')`;
    } else if (req.user.role === 'user') {
      query += ` AND (n.target_audience = 'all' OR n.target_audience = 'staff')`;
    }

    if (term_id) {
      query += ' AND n.term_id = ?';
      params.push(term_id);
    }
    if (week_id) {
      query += ' AND n.week_id = ?';
      params.push(week_id);
    }

    query += ' ORDER BY n.created_at DESC';

    const notices = await dbAll(query, params);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notices/templates (Pre-configured short SMS / WhatsApp templates)
router.get('/templates', authenticateToken, async (req, res) => {
  res.json([
    {
      id: 'fee_reminder',
      name: 'Fee Payment Reminder',
      template: '*GREENWOOD ACADEMY FEE REMINDER*\nDear Parent of {student_name}, this is a gentle reminder that an outstanding fee balance of ${balance} remains for {term_name}. Please make payment promptly.\nSchool Accounts Office.',
      variables: ['{student_name}', '{balance}', '{term_name}']
    },
    {
      id: 'attendance_alert',
      name: 'Daily Attendance Alert',
      template: '*GREENWOOD ACADEMY ATTENDANCE ALERT*\nDear Parent of {student_name}, your child was recorded as {status} on {date}. If unexpected, please contact the class teacher.\nGreenwood Administration.',
      variables: ['{student_name}', '{status}', '{date}']
    },
    {
      id: 'exam_schedule',
      name: 'Examination Schedule Notice',
      template: '*GREENWOOD ACADEMY EXAM NOTICE*\nDear Parent, Midterm & final assessments for {term_name} (Week {week_number}) will commence on {date}. Please ensure your child is prepared.\nAcademic Dean.',
      variables: ['{term_name}', '{week_number}', '{date}']
    },
    {
      id: 'general_announcement',
      name: 'General School Notice',
      template: '*GREENWOOD ACADEMY NOTICE*\n{title}\n{content}\nDate: {date}',
      variables: ['{title}', '{content}', '{date}']
    }
  ]);
});

// POST /api/notices (Admin ONLY can broadcast notices - one way only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, week_id, title, content, target_audience = 'all', priority = 'normal' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const result = await dbRun(`
      INSERT INTO notices (term_id, week_id, title, content, target_audience, priority, sent_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [term_id || null, week_id || null, title.trim(), content.trim(), target_audience, priority, req.user.full_name || req.user.username]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Notices',
      result.lastID,
      `Broadcast notice: "${title}" to audience: ${target_audience}`
    );

    res.status(201).json({ message: 'Broadcast notice published successfully.', id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notices/:id (Admin ONLY)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const noticeId = req.params.id;
    await dbRun('DELETE FROM notices WHERE id = ?', [noticeId]);
    await logAudit(req.user.id, req.user.username, req.user.role, 'DELETE', 'Notices', noticeId, `Admin removed notice ID ${noticeId}`);
    res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
