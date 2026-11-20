const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'school.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisified database helpers
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbExec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Initialize relational schema
const initDatabase = async () => {
  await dbRun('PRAGMA foreign_keys = ON;');

  const schema = `
    -- Users and Authentication (Admin, User, Parent)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'parent')),
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      child_student_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Terms (Academic Terms managed ONLY by Admin)
    CREATE TABLE IF NOT EXISTS terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_year TEXT NOT NULL,
      term_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Weeks (Managed ONLY by Admin, linked to Term)
    CREATE TABLE IF NOT EXISTS weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      week_title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_current INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Classes / Grades
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      room TEXT,
      class_teacher TEXT
    );

    -- Students
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT,
      class_grade TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      parent_email TEXT,
      address TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Subjects
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      class_grade TEXT NOT NULL,
      teacher_name TEXT
    );

    -- Module 1: Attendance (by week and term, with auto absent marking)
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
      remarks TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date)
    );

    -- Module 2: Grades and Reports (auto GPA, averages, rankings)
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      assignment_score REAL DEFAULT 0,
      quiz_score REAL DEFAULT 0,
      midterm_score REAL DEFAULT 0,
      exam_score REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      grade_letter TEXT,
      gpa_point REAL DEFAULT 0,
      teacher_comment TEXT,
      created_by TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, subject_id, term_id)
    );

    -- Module 3: Fee Structures (Only Admin can change fee amounts)
    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      category_name TEXT NOT NULL,
      amount REAL NOT NULL,
      class_grade TEXT DEFAULT 'ALL',
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 3 & 4: Fee Payments and Short Receipt Generation
    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      category_name TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card')),
      reference_code TEXT,
      total_due REAL NOT NULL,
      balance_after REAL NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      received_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 5: Timetable and Scheduling (Clash Detection)
    CREATE TABLE IF NOT EXISTS timetables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      class_grade TEXT NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_name TEXT NOT NULL,
      room TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 6: Notices and Messaging (Broadcasts)
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT NOT NULL CHECK(target_audience IN ('all', 'parents', 'students', 'staff')),
      priority TEXT NOT NULL CHECK(priority IN ('normal', 'urgent', 'announcement')),
      sent_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 7: Library Management (Stock, Issue, Return, Fines)
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      location_shelf TEXT,
      fine_rate_per_day REAL DEFAULT 1.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      fine_amount REAL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('issued', 'returned', 'overdue')),
      issued_by TEXT NOT NULL,
      received_by TEXT
    );

    -- Module 8: Exam Builder (Question banks, scheduling, auto grading)
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      class_grade TEXT NOT NULL,
      title TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      total_marks REAL NOT NULL DEFAULT 100,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice', 'true_false', 'short_answer')),
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct_answer TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS exam_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      total_possible REAL NOT NULL DEFAULT 0,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 9: Asset & Inventory Tracking
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      condition TEXT NOT NULL CHECK(condition IN ('good', 'fair', 'needs_repair', 'damaged')),
      custodian TEXT,
      purchase_date TEXT,
      estimated_value REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 10: Audit Log (Every Create, Update, Delete with who & when)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SYNC', 'RESOLVE_CONFLICT', 'RESEND_RECEIPT')),
      module TEXT NOT NULL,
      record_id TEXT,
      details TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Module 11: Offline Sync & Conflicts (Flagged for Admin review & resolution)
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_sync_id TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_data TEXT NOT NULL,
      server_data TEXT NOT NULL,
      conflict_reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved_local', 'resolved_server', 'resolved_merge')),
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- File uploads registry
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      module TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await dbExec(schema);
  console.log('Database tables and schema initialized successfully.');
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  dbExec,
  initDatabase,
};
