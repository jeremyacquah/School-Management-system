const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, enforceUserPermissions, logAudit } = require('../middleware/auth');

// Format short receipt text for SMS and WhatsApp
const generateShortReceiptText = ({ receipt_number, student_name, admission_number, amount_paid, payment_date, payment_method, category_name, balance_after }) => {
  return `*GREENWOOD ACADEMY RECEIPT*\n` +
         `Receipt: ${receipt_number}\n` +
         `Student: ${student_name} (${admission_number})\n` +
         `Paid: $${Number(amount_paid).toFixed(2)}\n` +
         `Date: ${payment_date}\n` +
         `Method: ${payment_method.toUpperCase().replace('_', ' ')}\n` +
         `For: ${category_name}\n` +
         `Balance Left: $${Number(balance_after).toFixed(2)}\n` +
         `Verified by Greenwood Accounts.`;
};

// GET /api/fees/structures (Only admin can change fee amounts, but everyone can view)
router.get('/structures', authenticateToken, async (req, res) => {
  try {
    const { term_id } = req.query;
    let query = `
      SELECT fs.*, t.term_name, t.session_year
      FROM fee_structures fs
      JOIN terms t ON fs.term_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (term_id) {
      query += ' AND fs.term_id = ?';
      params.push(term_id);
    }
    query += ' ORDER BY fs.amount DESC';
    const structures = await dbAll(query, params);
    res.json(structures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fees/structures (ONLY Admin can add fee structures)
router.post('/structures', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { term_id, category_name, amount, class_grade = 'ALL', description } = req.body;
    if (!term_id || !category_name || amount === undefined) {
      return res.status(400).json({ error: 'Term, category name, and amount are required.' });
    }

    const result = await dbRun(`
      INSERT INTO fee_structures (term_id, category_name, amount, class_grade, description)
      VALUES (?, ?, ?, ?, ?)
    `, [term_id, category_name.trim(), Number(amount), class_grade, description || null]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Fees',
      result.lastID,
      `Created fee structure: ${category_name} ($${amount}) for Term ${term_id}`
    );

    res.status(201).json({ id: result.lastID, message: 'Fee structure created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fees/structures/:id (ONLY Admin can change fee amounts)
router.put('/structures/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category_name, amount, class_grade, description } = req.body;
    const structureId = req.params.id;

    await dbRun(`
      UPDATE fee_structures
      SET category_name = COALESCE(?, category_name),
          amount = COALESCE(?, amount),
          class_grade = COALESCE(?, class_grade),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [category_name, amount !== undefined ? Number(amount) : null, class_grade, description, structureId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'UPDATE',
      'Fees',
      structureId,
      `Admin updated fee structure ID ${structureId} amount to: $${amount}`
    );

    res.json({ message: 'Fee amount updated successfully by administrator.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fees/balance/:student_id
router.get('/balance/:student_id', authenticateToken, async (req, res) => {
  try {
    const studentId = Number(req.params.student_id);

    if (req.user.role === 'parent' && req.user.child_student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own child\'s fee balance.' });
    }

    const { term_id } = req.query;
    const student = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const term = term_id 
      ? await dbGet('SELECT * FROM terms WHERE id = ?', [term_id])
      : await dbGet('SELECT * FROM terms WHERE is_active = 1 LIMIT 1');

    if (!term) {
      return res.status(404).json({ error: 'Active term not found.' });
    }

    // 1. Calculate Total Fees Assigned for this term
    const feeStructures = await dbAll(`
      SELECT SUM(amount) as total_due
      FROM fee_structures
      WHERE term_id = ? AND (class_grade = 'ALL' OR class_grade = ?)
    `, [term.id, student.class_grade]);

    // Add any library fines
    const libraryFines = await dbGet(`
      SELECT SUM(fine_amount) as total_fines
      FROM book_loans
      WHERE student_id = ?
    `, [studentId]);

    const baseFees = feeStructures[0]?.total_due || 0;
    const fines = libraryFines?.total_fines || 0;
    const totalDue = baseFees + fines;

    // 2. Calculate Total Amount Paid
    const paymentSum = await dbGet(`
      SELECT SUM(amount_paid) as total_paid
      FROM fee_payments
      WHERE student_id = ? AND term_id = ?
    `, [studentId, term.id]);

    const totalPaid = paymentSum?.total_paid || 0;
    const balance = Math.max(0, totalDue - totalPaid);

    res.json({
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      class_grade: student.class_grade,
      term_id: term.id,
      term_name: term.term_name,
      session_year: term.session_year,
      total_due: Number(totalDue.toFixed(2)),
      total_paid: Number(totalPaid.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      status: balance <= 0 ? 'Fully Paid' : (totalPaid > 0 ? 'Partial Payment' : 'Unpaid')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fees/payments
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const { student_id, term_id } = req.query;

    let query = `
      SELECT p.*, s.first_name, s.last_name, s.admission_number, s.class_grade, s.parent_phone,
             t.term_name, t.session_year
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      JOIN terms t ON p.term_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Parent restricted to child only!
    if (req.user.role === 'parent') {
      if (!req.user.child_student_id) return res.json([]);
      query += ' AND p.student_id = ?';
      params.push(req.user.child_student_id);
    } else if (student_id) {
      query += ' AND p.student_id = ?';
      params.push(student_id);
    }

    if (term_id) {
      query += ' AND p.term_id = ?';
      params.push(term_id);
    }

    query += ' ORDER BY p.created_at DESC';

    const payments = await dbAll(query, params);

    // Format short receipt text on each payment
    const enhanced = payments.map(p => ({
      ...p,
      receipt_text: generateShortReceiptText({
        receipt_number: p.receipt_number,
        student_name: `${p.first_name} ${p.last_name}`,
        admission_number: p.admission_number,
        amount_paid: p.amount_paid,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        category_name: p.category_name,
        balance_after: p.balance_after
      }),
      whatsapp_share_url: `https://wa.me/?text=${encodeURIComponent(
        generateShortReceiptText({
          receipt_number: p.receipt_number,
          student_name: `${p.first_name} ${p.last_name}`,
          admission_number: p.admission_number,
          amount_paid: p.amount_paid,
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          category_name: p.category_name,
          balance_after: p.balance_after
        })
      )}`
    }));

    res.json(enhanced);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fees/payments (User and Admin can record payments, auto generates short receipt)
router.post('/payments', authenticateToken, enforceUserPermissions, async (req, res) => {
  try {
    const { student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, payment_date, notes } = req.body;
    if (!student_id || !term_id || !category_name || !amount_paid || !payment_method) {
      return res.status(400).json({ error: 'Student, term, category, amount paid, and payment method are required.' });
    }

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [student_id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Calculate current total due and previous payments to determine new balance
    const feeStructures = await dbAll(`
      SELECT SUM(amount) as total_due
      FROM fee_structures
      WHERE term_id = ? AND (class_grade = 'ALL' OR class_grade = ?)
    `, [term_id, student.class_grade]);

    const libraryFines = await dbGet(`
      SELECT SUM(fine_amount) as total_fines
      FROM book_loans
      WHERE student_id = ?
    `, [student_id]);

    const totalDue = (feeStructures[0]?.total_due || 0) + (libraryFines?.total_fines || 0);

    const prevPayments = await dbGet(`
      SELECT SUM(amount_paid) as total_paid
      FROM fee_payments
      WHERE student_id = ? AND term_id = ?
    `, [student_id, term_id]);

    const previousPaid = prevPayments?.total_paid || 0;
    const newTotalPaid = previousPaid + Number(amount_paid);
    const balanceAfter = Math.max(0, totalDue - newTotalPaid);

    // Auto generate unique receipt number: REC-YYYY-XXXXX
    const year = new Date().getFullYear();
    const countRes = await dbGet('SELECT COUNT(*) as count FROM fee_payments');
    const seq = (countRes.count + 1).toString().padStart(5, '0');
    const receipt_number = `REC-${year}-${seq}`;

    const dateStr = payment_date || new Date().toISOString().split('T')[0];

    const result = await dbRun(`
      INSERT INTO fee_payments (receipt_number, student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, total_due, balance_after, payment_date, notes, received_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      receipt_number,
      student_id,
      term_id,
      week_id || null,
      category_name,
      Number(amount_paid),
      payment_method,
      reference_code || null,
      totalDue,
      balanceAfter,
      dateStr,
      notes || null,
      req.user.full_name || req.user.username
    ]);

    const studentName = `${student.first_name} ${student.last_name}`;
    const receiptText = generateShortReceiptText({
      receipt_number,
      student_name: studentName,
      admission_number: student.admission_number,
      amount_paid: Number(amount_paid),
      payment_date: dateStr,
      payment_method,
      category_name,
      balance_after: balanceAfter
    });

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'CREATE',
      'Fees',
      receipt_number,
      `Recorded payment of $${amount_paid} for ${studentName} (${receipt_number}). Balance left: $${balanceAfter}`
    );

    res.status(201).json({
      message: 'Payment recorded and receipt generated successfully.',
      payment_id: result.lastID,
      receipt_number,
      amount_paid: Number(amount_paid),
      balance_left: balanceAfter,
      receipt_text: receiptText,
      whatsapp_share_url: `https://wa.me/?text=${encodeURIComponent(receiptText)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fees/receipts/:receipt_number/resend (Admin ONLY can resend receipts)
router.post('/receipts/:receipt_number/resend', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { receipt_number } = req.params;
    const payment = await dbGet(`
      SELECT p.*, s.first_name, s.last_name, s.admission_number, s.parent_phone
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.receipt_number = ?
    `, [receipt_number]);

    if (!payment) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    const studentName = `${payment.first_name} ${payment.last_name}`;
    const receiptText = generateShortReceiptText({
      receipt_number: payment.receipt_number,
      student_name: studentName,
      admission_number: payment.admission_number,
      amount_paid: payment.amount_paid,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      category_name: payment.category_name,
      balance_after: payment.balance_after
    });

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'RESEND_RECEIPT',
      'Fees',
      receipt_number,
      `Admin resent receipt ${receipt_number} to parent phone ${payment.parent_phone}`
    );

    res.json({
      message: `Receipt ${receipt_number} prepared for resending via SMS / WhatsApp.`,
      receipt_text: receiptText,
      target_phone: payment.parent_phone,
      whatsapp_url: `https://wa.me/${payment.parent_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptText)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
