-- =========================================================================
-- Greenwood Academy School Management System - Relational Database Schema
-- Compatible with PostgreSQL, MySQL 8+, and SQLite 3
-- =========================================================================

-- 1. Users Table with Role-Based Access Control (Admin, User, Parent)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'user', 'parent')),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  child_student_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Academic Terms (Managed strictly by Admin)
CREATE TABLE IF NOT EXISTS terms (
  id SERIAL PRIMARY KEY,
  session_year VARCHAR(50) NOT NULL,
  term_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. School Weeks (Linked to Term, managed strictly by Admin)
CREATE TABLE IF NOT EXISTS weeks (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_title VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Classes / Grades
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  room VARCHAR(50),
  class_teacher VARCHAR(150)
);

-- 5. Students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  dob DATE,
  class_grade VARCHAR(50) NOT NULL,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(50) NOT NULL,
  parent_email VARCHAR(150),
  address TEXT,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  class_grade VARCHAR(50) NOT NULL,
  teacher_name VARCHAR(150)
);

-- 7. Module 1: Attendance (by week and term, with auto absent marking)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  recorded_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);

-- 8. Module 2: Grades and Reports (auto GPA, averages, rankings)
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  assignment_score NUMERIC(5,2) DEFAULT 0,
  quiz_score NUMERIC(5,2) DEFAULT 0,
  midterm_score NUMERIC(5,2) DEFAULT 0,
  exam_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  grade_letter VARCHAR(5),
  gpa_point NUMERIC(3,2) DEFAULT 0,
  teacher_comment TEXT,
  created_by VARCHAR(150) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, subject_id, term_id)
);

-- 9. Module 3: Fee Structures (Only Admin can change fee amounts)
CREATE TABLE IF NOT EXISTS fee_structures (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  class_grade VARCHAR(50) DEFAULT 'ALL',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Module 3 & 4: Fee Payments and Short Receipt Generation
CREATE TABLE IF NOT EXISTS fee_payments (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  category_name VARCHAR(100) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card')),
  reference_code VARCHAR(100),
  total_due NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  received_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Module 5: Timetable and Scheduling (Clash Detection)
CREATE TABLE IF NOT EXISTS timetables (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  class_grade VARCHAR(50) NOT NULL,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_name VARCHAR(150) NOT NULL,
  room VARCHAR(50) NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Module 6: Notices and Messaging (Broadcasts)
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  term_id INTEGER REFERENCES terms(id) ON DELETE SET NULL,
  week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  target_audience VARCHAR(30) NOT NULL CHECK(target_audience IN ('all', 'parents', 'students', 'staff')),
  priority VARCHAR(20) NOT NULL CHECK(priority IN ('normal', 'urgent', 'announcement')),
  sent_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Module 7: Library Management (Stock, Issue, Return, Fines)
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  isbn VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  location_shelf VARCHAR(50),
  fine_rate_per_day NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_loans (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount NUMERIC(8,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK(status IN ('issued', 'returned', 'overdue')),
  issued_by VARCHAR(150) NOT NULL,
  received_by VARCHAR(150)
);

-- 14. Module 8: Exam Builder (Question banks, scheduling, auto grading)
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_grade VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  exam_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
  created_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL CHECK(question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer VARCHAR(50) NOT NULL,
  points NUMERIC(5,2) NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS exam_submissions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_possible NUMERIC(6,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Module 9: Asset & Inventory Tracking
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  location VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition VARCHAR(30) NOT NULL CHECK(condition IN ('good', 'fair', 'needs_repair', 'damaged')),
  custodian VARCHAR(150),
  purchase_date DATE,
  estimated_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Module 10: Audit Log (Every Create, Update, Delete with who & when)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  username VARCHAR(80) NOT NULL,
  role VARCHAR(20) NOT NULL,
  action VARCHAR(30) NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SYNC', 'RESOLVE_CONFLICT', 'RESEND_RECEIPT')),
  module VARCHAR(80) NOT NULL,
  record_id VARCHAR(50),
  details TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Module 11: Offline Sync & Conflicts (Flagged for Admin review & resolution)
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id SERIAL PRIMARY KEY,
  client_sync_id VARCHAR(100) NOT NULL,
  module VARCHAR(80) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  local_data TEXT NOT NULL,
  server_data TEXT NOT NULL,
  conflict_reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved_local', 'resolved_server', 'resolved_merge')),
  resolved_by VARCHAR(80),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. File Uploads Registry
CREATE TABLE IF NOT EXISTS uploaded_files (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  module VARCHAR(80) NOT NULL,
  uploaded_by VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
