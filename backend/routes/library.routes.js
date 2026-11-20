const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// GET /api/library/books
router.get('/books', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY title ASC';

    const books = await dbAll(query, params);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/library/books (Admin ONLY manages stock)
router.post('/books', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isbn, title, author, category, total_copies = 1, location_shelf, fine_rate_per_day = 1.0 } = req.body;
    if (!isbn || !title || !author || !category) {
      return res.status(400).json({ error: 'ISBN, title, author, and category are required.' });
    }

    const copies = Number(total_copies) || 1;
    const result = await dbRun(`
      INSERT INTO books (isbn, title, author, category, total_copies, available_copies, location_shelf, fine_rate_per_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [isbn.trim(), title.trim(), author.trim(), category.trim(), copies, copies, location_shelf || null, Number(fine_rate_per_day) || 1.0]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Library',
      result.lastID,
      `Added book to catalog: "${title}" by ${author} (Qty: ${copies})`
    );

    res.status(201).json({ message: 'Book added to catalog successfully.', id: result.lastID });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A book with this ISBN already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/library/books/:id (Admin ONLY updates stock)
router.put('/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, category, total_copies, location_shelf, fine_rate_per_day } = req.body;

    const existing = await dbGet('SELECT * FROM books WHERE id = ?', [bookId]);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    let newAvailable = existing.available_copies;
    if (total_copies !== undefined) {
      const diff = Number(total_copies) - existing.total_copies;
      newAvailable = Math.max(0, existing.available_copies + diff);
    }

    await dbRun(`
      UPDATE books
      SET title = COALESCE(?, title),
          author = COALESCE(?, author),
          category = COALESCE(?, category),
          total_copies = COALESCE(?, total_copies),
          available_copies = ?,
          location_shelf = COALESCE(?, location_shelf),
          fine_rate_per_day = COALESCE(?, fine_rate_per_day)
      WHERE id = ?
    `, [title, author, category, total_copies !== undefined ? Number(total_copies) : null, newAvailable, location_shelf, fine_rate_per_day, bookId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Library',
      bookId,
      `Admin updated book ID ${bookId} stock`
    );

    res.json({ message: 'Book stock updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/library/loans
router.get('/loans', authenticateToken, async (req, res) => {
  try {
    const { student_id, status } = req.query;

    let query = `
      SELECT bl.*, b.title as book_title, b.isbn, b.author, b.fine_rate_per_day,
             s.first_name, s.last_name, s.admission_number, s.class_grade
      FROM book_loans bl
      JOIN books b ON bl.book_id = b.id
      JOIN students s ON bl.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // Parent restricted to child's book loans
    if (req.user.role === 'parent') {
      if (!req.user.child_student_id) return res.json([]);
      query += ' AND bl.student_id = ?';
      params.push(req.user.child_student_id);
    } else if (student_id) {
      query += ' AND bl.student_id = ?';
      params.push(student_id);
    }

    if (status) {
      query += ' AND bl.status = ?';
      params.push(status);
    }

    query += ' ORDER BY bl.issue_date DESC';

    const loans = await dbAll(query, params);
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/library/loans/issue (User and Admin can issue book)
router.post('/loans/issue', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { book_id, student_id, due_days = 14 } = req.body;
    if (!book_id || !student_id) {
      return res.status(400).json({ error: 'Book ID and student ID are required.' });
    }

    const book = await dbGet('SELECT * FROM books WHERE id = ?', [book_id]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'No copies available for issue. All copies currently on loan.' });
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(due_days));

    const issueDateStr = issueDate.toISOString().split('T')[0];
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const result = await dbRun(`
      INSERT INTO book_loans (book_id, student_id, issue_date, due_date, status, issued_by)
      VALUES (?, ?, ?, ?, 'issued', ?)
    `, [book_id, student_id, issueDateStr, dueDateStr, req.user.full_name || req.user.username]);

    // Decrement available copies
    await dbRun('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Library',
      result.lastID,
      `Issued "${book.title}" to student ID ${student_id} until ${dueDateStr}`
    );

    res.status(201).json({ message: 'Book issued successfully.', loan_id: result.lastID, due_date: dueDateStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/library/loans/return (User and Admin can return book and calculate fines)
router.post('/loans/return', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { loan_id } = req.body;
    if (!loan_id) {
      return res.status(400).json({ error: 'Loan ID is required.' });
    }

    const loan = await dbGet(`
      SELECT bl.*, b.title as book_title, b.fine_rate_per_day
      FROM book_loans bl
      JOIN books b ON bl.book_id = b.id
      WHERE bl.id = ?
    `, [loan_id]);

    if (!loan) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }
    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'This book has already been returned.' });
    }

    const returnDate = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date(loan.due_date);
    const returnDateObj = new Date(returnDate);

    let fine = 0;
    let finalStatus = 'returned';

    if (returnDateObj > dueDateObj) {
      const diffTime = Math.abs(returnDateObj - dueDateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = Number((diffDays * (loan.fine_rate_per_day || 1.0)).toFixed(2));
      finalStatus = 'returned'; // returned with fine
    }

    await dbRun(`
      UPDATE book_loans
      SET return_date = ?,
          fine_amount = ?,
          status = ?,
          received_by = ?
      WHERE id = ?
    `, [returnDate, fine, finalStatus, req.user.full_name || req.user.username, loan_id]);

    // Restore available copies
    await dbRun('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [loan.book_id]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Library',
      loan_id,
      `Returned book loan ID ${loan_id} ("${loan.book_title}"). Fine assessed: $${fine}`
    );

    res.json({
      message: 'Book returned successfully.',
      return_date: returnDate,
      overdue_fine: fine
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
