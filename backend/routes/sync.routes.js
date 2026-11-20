const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

// POST /api/sync (Sync batch of offline operations from desktop or mobile)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { operations = [] } = req.body;
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.json({ synced_ids: [], conflicts: [], message: 'No operations to sync.' });
    }

    const synced_ids = [];
    const conflicts = [];

    for (const op of operations) {
      const { id: clientSyncId, module: mod, action, record_id, payload, client_timestamp, base_version } = op;

      try {
        // CONFLICT DETECTION LOGIC
        let hasConflict = false;
        let serverCurrent = null;
        let conflictReason = '';

        if (action === 'UPDATE' && record_id) {
          if (mod === 'attendance') {
            serverCurrent = await dbGet('SELECT * FROM attendance WHERE id = ?', [record_id]);
          } else if (mod === 'grades') {
            serverCurrent = await dbGet('SELECT * FROM grades WHERE id = ?', [record_id]);
          } else if (mod === 'students') {
            serverCurrent = await dbGet('SELECT * FROM students WHERE id = ?', [record_id]);
          } else if (mod === 'assets') {
            serverCurrent = await dbGet('SELECT * FROM assets WHERE id = ?', [record_id]);
          }

          if (serverCurrent) {
            const serverUpdated = serverCurrent.updated_at || serverCurrent.created_at;
            if (serverUpdated && base_version && new Date(serverUpdated) > new Date(base_version)) {
              hasConflict = true;
              conflictReason = `Server version was modified on ${serverUpdated} after offline snapshot from ${base_version}.`;
            }
          }
        }

        if (hasConflict) {
          // Record conflict for Admin resolution
          const conflictRes = await dbRun(`
            INSERT INTO sync_conflicts (client_sync_id, module, record_id, local_data, server_data, conflict_reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `, [clientSyncId, mod, String(record_id), JSON.stringify(payload), JSON.stringify(serverCurrent), conflictReason]);

          conflicts.push({
            conflict_id: conflictRes.lastID,
            client_sync_id: clientSyncId,
            module: mod,
            record_id,
            reason: conflictReason
          });

          await logAudit(
            req.user.id,
            req.user.username,
            req.user.role,
            'SYNC',
            'SyncEngine',
            clientSyncId,
            `Conflict detected during offline sync for ${mod} (Record: ${record_id}). Flagged for Admin resolution.`
          );
          continue;
        }

        // Apply mutation if no conflict
        if (mod === 'attendance') {
          if (action === 'CREATE' || action === 'BATCH') {
            const { student_id, term_id, week_id, date, status, remarks } = payload;
            await dbRun(`
              INSERT INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(student_id, date) DO UPDATE SET
                status = excluded.status,
                remarks = excluded.remarks,
                updated_at = datetime('now')
            `, [student_id, term_id, week_id, date, status || 'present', remarks || null, req.user.full_name || req.user.username]);
          }
        } else if (mod === 'grades') {
          const { student_id, subject_id, term_id, assignment_score = 0, quiz_score = 0, midterm_score = 0, exam_score = 0, teacher_comment } = payload;
          const total = Number(assignment_score) + Number(quiz_score) + Number(midterm_score) + Number(exam_score);
          let letter = 'F', gpa = 0.0;
          if (total >= 90) { letter = 'A'; gpa = 4.0; }
          else if (total >= 80) { letter = 'B'; gpa = 3.0; }
          else if (total >= 70) { letter = 'C'; gpa = 2.0; }
          else if (total >= 60) { letter = 'D'; gpa = 1.0; }

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
          `, [student_id, subject_id, term_id, assignment_score, quiz_score, midterm_score, exam_score, total, letter, gpa, teacher_comment || null, req.user.full_name || req.user.username]);
        } else if (mod === 'payments') {
          const { student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, payment_date, notes } = payload;
          const year = new Date().getFullYear();
          const countRes = await dbGet('SELECT COUNT(*) as count FROM fee_payments');
          const seq = (countRes.count + 1).toString().padStart(5, '0');
          const receipt_number = `REC-${year}-${seq}`;

          await dbRun(`
            INSERT INTO fee_payments (receipt_number, student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, total_due, balance_after, payment_date, notes, received_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
          `, [receipt_number, student_id, term_id, week_id || null, category_name, Number(amount_paid), payment_method, reference_code || null, payment_date || new Date().toISOString().split('T')[0], notes || null, req.user.full_name || req.user.username]);
        } else if (mod === 'students') {
          const { admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address } = payload;
          await dbRun(`
            INSERT INTO students (admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [admission_number, first_name, last_name, gender || 'Other', dob || null, class_grade, parent_name, parent_phone, parent_email || null, address || null]);
        } else if (mod === 'assets') {
          const { asset_tag, item_name, category, location, quantity = 1, condition = 'good', custodian, purchase_date, estimated_value = 0 } = payload;
          await dbRun(`
            INSERT INTO assets (asset_tag, item_name, category, location, quantity, condition, custodian, purchase_date, estimated_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [asset_tag, item_name, category, location, quantity, condition, custodian || null, purchase_date || null, estimated_value]);
        }

        synced_ids.push(clientSyncId);

        await logAudit(
          req.user.id,
          req.user.username,
          req.user.role,
          'SYNC',
          mod,
          clientSyncId,
          `Successfully synchronized offline ${action} operation for ${mod}`
        );
      } catch (opErr) {
        console.error(`Sync error on operation ${clientSyncId}:`, opErr);
      }
    }

    res.json({
      message: `Sync completed: ${synced_ids.length} operations processed successfully, ${conflicts.length} conflicts flagged for admin review.`,
      synced_ids,
      conflicts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/conflicts (Admin ONLY: list pending sync conflicts)
router.get('/conflicts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const conflicts = await dbAll(`
      SELECT * FROM sync_conflicts
      WHERE status = ?
      ORDER BY created_at DESC
    `, [status]);

    const parsed = conflicts.map(c => ({
      ...c,
      local_data: JSON.parse(c.local_data || '{}'),
      server_data: JSON.parse(c.server_data || '{}')
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/conflicts/:id/resolve (Admin ONLY resolves conflict)
router.post('/conflicts/:id/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const conflictId = req.params.id;
    const { resolution, merged_data } = req.body;
    // resolution: 'keep_local' | 'keep_server' | 'merge'

    const conflict = await dbGet('SELECT * FROM sync_conflicts WHERE id = ?', [conflictId]);
    if (!conflict) {
      return res.status(404).json({ error: 'Conflict record not found.' });
    }

    const localData = JSON.parse(conflict.local_data || '{}');
    const dataToApply = resolution === 'keep_local' ? localData : (resolution === 'merge' ? merged_data : null);

    if (dataToApply) {
      if (conflict.module === 'attendance') {
        await dbRun(`
          UPDATE attendance
          SET status = ?, remarks = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [dataToApply.status, dataToApply.remarks, conflict.record_id]);
      } else if (conflict.module === 'grades') {
        await dbRun(`
          UPDATE grades
          SET assignment_score = ?, quiz_score = ?, midterm_score = ?, exam_score = ?, total_score = ?, grade_letter = ?, gpa_point = ?, teacher_comment = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [dataToApply.assignment_score, dataToApply.quiz_score, dataToApply.midterm_score, dataToApply.exam_score, dataToApply.total_score, dataToApply.grade_letter, dataToApply.gpa_point, dataToApply.teacher_comment, conflict.record_id]);
      } else if (conflict.module === 'students') {
        await dbRun(`
          UPDATE students
          SET first_name = ?, last_name = ?, class_grade = ?, parent_phone = ?
          WHERE id = ?
        `, [dataToApply.first_name, dataToApply.last_name, dataToApply.class_grade, dataToApply.parent_phone, conflict.record_id]);
      }
    }

    await dbRun(`
      UPDATE sync_conflicts
      SET status = ?,
          resolved_by = ?,
          resolved_at = datetime('now')
      WHERE id = ?
    `, [`resolved_${resolution}`, req.user.username, conflictId]);

    await logAudit(
      req.user.id,
      req.user.username,
      req.user.role,
      'RESOLVE_CONFLICT',
      conflict.module,
      conflict.record_id,
      `Admin resolved sync conflict ${conflictId} using strategy: ${resolution}`
    );

    res.json({ message: `Conflict ${conflictId} resolved successfully with strategy: ${resolution}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
