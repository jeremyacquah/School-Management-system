const { dbRun, dbAll, initDatabase } = require('./database');
const bcrypt = require('bcryptjs');

async function migrate() {
  await initDatabase();
  console.log('Running migration: Add parent_access_code to students table...');

  // 1. Check if column exists
  const columns = await dbAll('PRAGMA table_info(students)');
  const hasCode = columns.some(c => c.name === 'parent_access_code');

  if (!hasCode) {
    console.log('Adding column parent_access_code to students table...');
    await dbRun('ALTER TABLE students ADD COLUMN parent_access_code TEXT');
  }

  // 2. Assign unique passwords to all existing students if missing
  const students = await dbAll('SELECT id, admission_number, first_name, last_name, class_grade, parent_name, parent_phone FROM students');

  for (const s of students) {
    // Generate unique 6-digit PIN
    const uniquePin = Math.floor(100000 + Math.random() * 900000).toString();
    await dbRun(
      'UPDATE students SET parent_access_code = COALESCE(parent_access_code, ?) WHERE id = ?',
      [uniquePin, s.id]
    );

    // Check or create parent user in users table
    const currentStudent = await dbAll('SELECT parent_access_code FROM students WHERE id = ?', [s.id]);
    const passCode = currentStudent[0].parent_access_code;

    const parentUser = await dbAll('SELECT id FROM users WHERE role = "parent" AND child_student_id = ?', [s.id]);
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(passCode, salt);
    const parentUsername = `parent_${s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (parentUser.length === 0) {
      await dbRun(
        'INSERT INTO users (username, password_hash, role, full_name, phone, child_student_id) VALUES (?, ?, ?, ?, ?, ?)',
        [parentUsername, passHash, 'parent', s.parent_name || `Parent of ${s.first_name}`, s.parent_phone || null, s.id]
      );
    } else {
      // Update password hash to match the parent_access_code
      await dbRun(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passHash, parentUser[0].id]
      );
    }
  }

  console.log('Parent passwords successfully assigned to all students.');
  const summary = await dbAll('SELECT id, first_name, last_name, class_grade, admission_number, parent_access_code FROM students');
  console.log('Students with unique Parent Passwords:', summary);
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
