const bcrypt = require('bcryptjs');
const { dbRun, dbGet, dbAll, initDatabase } = require('./database');

async function seed() {
  await initDatabase();

  const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    console.log('Database already contains data, skipping seed.');
    return;
  }

  console.log('Seeding initial data...');

  // 1. Password hashes
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const userPass = bcrypt.hashSync('teacher123', salt);
  const parentPass = bcrypt.hashSync('parent123', salt);

  // 2. Terms
  await dbRun(`
    INSERT INTO terms (session_year, term_name, start_date, end_date, is_active)
    VALUES 
      ('2026/2027', 'Term 1', '2026-09-01', '2026-12-18', 1),
      ('2026/2027', 'Term 2', '2027-01-08', '2027-04-10', 0),
      ('2026/2027', 'Term 3', '2027-04-28', '2027-07-20', 0)
  `);

  const activeTerm = await dbGet('SELECT id FROM terms WHERE is_active = 1');
  const termId = activeTerm.id;

  // 3. Weeks for Term 1 (Admin managed)
  const weeksData = [
    { num: 1, title: 'Week 1 - Orientation & Setup', start: '2026-09-01', end: '2026-09-05', curr: 0 },
    { num: 2, title: 'Week 2 - Unit 1 Foundations', start: '2026-09-08', end: '2026-09-12', curr: 0 },
    { num: 3, title: 'Week 3 - Lab Practical & Quiz 1', start: '2026-09-15', end: '2026-09-19', curr: 0 },
    { num: 4, title: 'Week 4 - Group Research Projects', start: '2026-09-22', end: '2026-09-26', curr: 0 },
    { num: 5, title: 'Week 5 - Midterm Exams', start: '2026-09-29', end: '2026-10-03', curr: 1 },
    { num: 6, title: 'Week 6 - Post-Midterm Review', start: '2026-10-06', end: '2026-10-10', curr: 0 },
    { num: 7, title: 'Week 7 - Unit 2 Exploration', start: '2026-10-13', end: '2026-10-17', curr: 0 },
    { num: 8, title: 'Week 8 - Mid-Semester Workshops', start: '2026-10-20', end: '2026-10-24', curr: 0 },
    { num: 9, title: 'Week 9 - Continuous Assessment 2', start: '2026-10-27', end: '2026-10-31', curr: 0 },
    { num: 10, title: 'Week 10 - Science Fair & Arts Exhibition', start: '2026-11-03', end: '2026-11-07', curr: 0 },
    { num: 11, title: 'Week 11 - Revision Week', start: '2026-11-10', end: '2026-11-14', curr: 0 },
    { num: 12, title: 'Week 12 - Final Exams & Graduations', start: '2026-11-17', end: '2026-11-21', curr: 0 }
  ];

  for (const w of weeksData) {
    await dbRun(
      `INSERT INTO weeks (term_id, week_number, week_title, start_date, end_date, is_current)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [termId, w.num, w.title, w.start, w.end, w.curr]
    );
  }

  // 4. Classes
  await dbRun(`INSERT INTO classes (name, room, class_teacher) VALUES ('Grade 9A', 'Room 101', 'Mrs. Sarah Jenkins')`);
  await dbRun(`INSERT INTO classes (name, room, class_teacher) VALUES ('Grade 9B', 'Room 102', 'Mr. Robert Thompson')`);
  await dbRun(`INSERT INTO classes (name, room, class_teacher) VALUES ('Grade 10A', 'Room 201', 'Dr. Williams')`);

  // 5. Students
  const students = [
    {
      adm: 'SCH-2026-001',
      fn: 'Ethan',
      ln: 'Miller',
      gender: 'Male',
      dob: '2011-04-12',
      grade: 'Grade 9A',
      pName: 'David Miller',
      pPhone: '+1-555-0192',
      pEmail: 'david.miller@example.com',
      addr: '14 Elm Street, Springfield'
    },
    {
      adm: 'SCH-2026-002',
      fn: 'Zainab',
      ln: 'Al-Mansoor',
      gender: 'Female',
      dob: '2011-09-23',
      grade: 'Grade 9A',
      pName: 'Fatima Al-Mansoor',
      pPhone: '+1-555-0193',
      pEmail: 'fatima.mansoor@example.com',
      addr: '88 Horizon Drive, Springfield'
    },
    {
      adm: 'SCH-2026-003',
      fn: 'Liam',
      ln: 'Johnson',
      gender: 'Male',
      dob: '2011-01-30',
      grade: 'Grade 9A',
      pName: 'Robert Johnson',
      pPhone: '+1-555-0194',
      pEmail: 'robert.j@example.com',
      addr: '23 Birch Road, Springfield'
    },
    {
      adm: 'SCH-2026-004',
      fn: 'Sophia',
      ln: 'Chen',
      gender: 'Female',
      dob: '2011-06-18',
      grade: 'Grade 9A',
      pName: 'Mei-Ling Chen',
      pPhone: '+1-555-0195',
      pEmail: 'chen.family@example.com',
      addr: '7 Oak Avenue, Springfield'
    },
    {
      adm: 'SCH-2026-005',
      fn: 'Marcus',
      ln: 'Okonjo',
      gender: 'Male',
      dob: '2011-11-05',
      grade: 'Grade 9A',
      pName: 'Ngozi Okonjo',
      pPhone: '+1-555-0196',
      pEmail: 'okonjo.ngozi@example.com',
      addr: '45 Sunset Blvd, Springfield'
    }
  ];

  for (const s of students) {
    await dbRun(`
      INSERT INTO students (admission_number, first_name, last_name, gender, dob, class_grade, parent_name, parent_phone, parent_email, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [s.adm, s.fn, s.ln, s.gender, s.dob, s.grade, s.pName, s.pPhone, s.pEmail, s.addr]);
  }

  // 6. Users: Admin, Teacher (User), and Parents
  await dbRun(`
    INSERT INTO users (username, password_hash, role, full_name, email, phone)
    VALUES ('admin', ?, 'admin', 'Principal Arthur Vance', 'admin@greenwood.edu', '+1-555-0100')
  `, [adminPass]);

  await dbRun(`
    INSERT INTO users (username, password_hash, role, full_name, email, phone)
    VALUES ('teacher_sarah', ?, 'user', 'Sarah Jenkins', 'sjenkins@greenwood.edu', '+1-555-0101')
  `, [userPass]);

  // Parent 1 (David Miller -> Child Ethan Miller, student_id = 1)
  await dbRun(`
    INSERT INTO users (username, password_hash, role, full_name, email, phone, child_student_id)
    VALUES ('parent_david', ?, 'parent', 'David Miller', 'david.miller@example.com', '+1-555-0192', 1)
  `, [parentPass]);

  // Parent 2 (Fatima Al-Mansoor -> Child Zainab Al-Mansoor, student_id = 2)
  await dbRun(`
    INSERT INTO users (username, password_hash, role, full_name, email, phone, child_student_id)
    VALUES ('parent_fatima', ?, 'parent', 'Fatima Al-Mansoor', 'fatima.mansoor@example.com', '+1-555-0193', 2)
  `, [parentPass]);

  // 7. Subjects
  const subjects = [
    { code: 'MATH101', name: 'Mathematics', grade: 'Grade 9A', teacher: 'Sarah Jenkins' },
    { code: 'ENG101', name: 'English Language & Literature', grade: 'Grade 9A', teacher: 'Robert Smith' },
    { code: 'SCI101', name: 'Integrated Science', grade: 'Grade 9A', teacher: 'Dr. Williams' },
    { code: 'SOC101', name: 'Social Studies & Civics', grade: 'Grade 9A', teacher: 'Mrs. Evans' },
    { code: 'ICT101', name: 'Computer Science & ICT', grade: 'Grade 9A', teacher: 'Alex Carter' }
  ];

  for (const sub of subjects) {
    await dbRun(
      `INSERT INTO subjects (code, name, class_grade, teacher_name) VALUES (?, ?, ?, ?)`,
      [sub.code, sub.name, sub.grade, sub.teacher]
    );
  }

  // 8. Attendance seed (Weeks 1 to 5)
  const currentWeek = await dbGet('SELECT id FROM weeks WHERE week_number = 5');
  const week5Id = currentWeek ? currentWeek.id : 5;

  const dates = [
    { date: '2026-09-29', wId: week5Id },
    { date: '2026-09-30', wId: week5Id },
    { date: '2026-10-01', wId: week5Id },
    { date: '2026-10-02', wId: week5Id }
  ];

  for (const d of dates) {
    // Ethan: Present
    await dbRun(`
      INSERT OR REPLACE INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by)
      VALUES (1, ?, ?, ?, 'present', 'On time', 'Sarah Jenkins')
    `, [termId, d.wId, d.date]);

    // Zainab: Present
    await dbRun(`
      INSERT OR REPLACE INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by)
      VALUES (2, ?, ?, ?, 'present', 'Active in class', 'Sarah Jenkins')
    `, [termId, d.wId, d.date]);

    // Liam: Present except 10-01 late
    const liamStatus = d.date === '2026-10-01' ? 'late' : 'present';
    await dbRun(`
      INSERT OR REPLACE INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by)
      VALUES (3, ?, ?, ?, ?, 'Bus delay', 'Sarah Jenkins')
    `, [termId, d.wId, d.date, liamStatus]);

    // Sophia: Present
    await dbRun(`
      INSERT OR REPLACE INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by)
      VALUES (4, ?, ?, ?, 'present', 'Excellent participation', 'Sarah Jenkins')
    `, [termId, d.wId, d.date]);

    // Marcus: Absent on 10-02
    const marcusStatus = d.date === '2026-10-02' ? 'absent' : 'present';
    await dbRun(`
      INSERT OR REPLACE INTO attendance (student_id, term_id, week_id, date, status, remarks, recorded_by)
      VALUES (5, ?, ?, ?, ?, 'Flu', 'Sarah Jenkins')
    `, [termId, d.wId, d.date, marcusStatus]);
  }

  // 9. Grades (Auto GPA, rankings)
  // Grading scale:
  // >= 90: A (4.0), >= 80: B (3.0), >= 70: C (2.0), >= 60: D (1.0), < 60: F (0.0)
  const calcGrade = (total) => {
    if (total >= 90) return { letter: 'A', gpa: 4.0 };
    if (total >= 80) return { letter: 'B', gpa: 3.0 };
    if (total >= 70) return { letter: 'C', gpa: 2.0 };
    if (total >= 60) return { letter: 'D', gpa: 1.0 };
    return { letter: 'F', gpa: 0.0 };
  };

  const sampleGrades = [
    // Ethan Miller (Student 1)
    { sId: 1, subId: 1, as: 18, qz: 17, mid: 19, ex: 37, cmt: 'Outstanding mathematical reasoning' },
    { sId: 1, subId: 2, as: 16, qz: 16, mid: 17, ex: 33, cmt: 'Strong essay writing' },
    { sId: 1, subId: 3, as: 19, qz: 18, mid: 18, ex: 38, cmt: 'Exceptional in practical experiments' },
    { sId: 1, subId: 4, as: 17, qz: 15, mid: 16, ex: 34, cmt: 'Good historical analysis' },
    { sId: 1, subId: 5, as: 20, qz: 19, mid: 20, ex: 39, cmt: 'Top performance in coding' },

    // Zainab Al-Mansoor (Student 2)
    { sId: 2, subId: 1, as: 20, qz: 20, mid: 19, ex: 39, cmt: 'Brilliant problem solving' },
    { sId: 2, subId: 2, as: 19, qz: 19, mid: 19, ex: 38, cmt: 'Eloquent and insightful' },
    { sId: 2, subId: 3, as: 19, qz: 18, mid: 19, ex: 37, cmt: 'Very dedicated in science labs' },
    { sId: 2, subId: 4, as: 18, qz: 18, mid: 18, ex: 36, cmt: 'Great critical perspective' },
    { sId: 2, subId: 5, as: 19, qz: 19, mid: 18, ex: 38, cmt: 'High technical aptitude' },

    // Liam Johnson (Student 3)
    { sId: 3, subId: 1, as: 14, qz: 13, mid: 15, ex: 28, cmt: 'Needs more practice with equations' },
    { sId: 3, subId: 2, as: 15, qz: 14, mid: 14, ex: 30, cmt: 'Satisfactory work' },
    { sId: 3, subId: 3, as: 13, qz: 12, mid: 14, ex: 29, cmt: 'Capable of higher marks' },
    { sId: 3, subId: 4, as: 16, qz: 15, mid: 15, ex: 32, cmt: 'Active during debates' },
    { sId: 3, subId: 5, as: 15, qz: 16, mid: 15, ex: 31, cmt: 'Good computing practicals' }
  ];

  for (const g of sampleGrades) {
    const total = g.as + g.qz + g.mid + g.ex;
    const { letter, gpa } = calcGrade(total);
    await dbRun(`
      INSERT INTO grades (student_id, subject_id, term_id, week_id, assignment_score, quiz_score, midterm_score, exam_score, total_score, grade_letter, gpa_point, teacher_comment, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sarah Jenkins')
    `, [g.sId, g.subId, termId, week5Id, g.as, g.qz, g.mid, g.ex, total, letter, gpa, g.cmt]);
  }

  // 10. Fee structures (Only Admin can set fee amounts)
  const feeStructures = [
    { cat: 'School Tuition Fee', amt: 650.00, desc: 'Term 1 Tuition and classroom instruction' },
    { cat: 'School Development Dues', amt: 75.00, desc: 'Campus maintenance and development fund' },
    { cat: 'Examination Fee', amt: 65.00, desc: 'Midterm and final examination materials' },
    { cat: 'Science & ICT Lab Fee', amt: 50.00, desc: 'Lab chemicals, apparatus, and high-speed internet' }
  ];

  for (const fee of feeStructures) {
    await dbRun(`
      INSERT INTO fee_structures (term_id, category_name, amount, class_grade, description)
      VALUES (?, ?, ?, 'ALL', ?)
    `, [termId, fee.cat, fee.amt, fee.desc]);
  }

  // Total Term 1 Fees = 650 + 75 + 65 + 50 = $840.00
  // 11. Payments & Short Receipts
  // Ethan Miller (Student 1): Paid $500 cash partial payment. Balance = 840 - 500 = $340.00
  await dbRun(`
    INSERT INTO fee_payments (receipt_number, student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, total_due, balance_after, payment_date, notes, received_by)
    VALUES ('REC-2026-0001', 1, ?, ?, 'School Tuition Fee', 500.00, 'cash', 'CSH-98102', 840.00, 340.00, '2026-09-02', 'Partial payment received in cash', 'Admin Arthur Vance')
  `, [termId, week5Id]);

  // Zainab Al-Mansoor (Student 2): Full payment via Mobile Money. Balance = $0.00
  await dbRun(`
    INSERT INTO fee_payments (receipt_number, student_id, term_id, week_id, category_name, amount_paid, payment_method, reference_code, total_due, balance_after, payment_date, notes, received_by)
    VALUES ('REC-2026-0002', 2, ?, ?, 'Full Term 1 Fee Package', 840.00, 'mobile_money', 'MOMO-774921', 840.00, 0.00, '2026-09-03', 'Full payment via Mobile Money', 'Admin Arthur Vance')
  `, [termId, week5Id]);

  // 12. Timetable (Clash-free scheduling)
  const scheduleSlots = [
    { grade: 'Grade 9A', subId: 1, teacher: 'Sarah Jenkins', room: 'Room 101', day: 'Monday', start: '08:00', end: '09:00' },
    { grade: 'Grade 9A', subId: 2, teacher: 'Robert Smith', room: 'Room 101', day: 'Monday', start: '09:15', end: '10:15' },
    { grade: 'Grade 9A', subId: 3, teacher: 'Dr. Williams', room: 'Lab 3', day: 'Monday', start: '10:45', end: '11:45' },
    { grade: 'Grade 9A', subId: 5, teacher: 'Alex Carter', room: 'Computer Lab', day: 'Tuesday', start: '08:00', end: '09:00' },
    { grade: 'Grade 9A', subId: 4, teacher: 'Mrs. Evans', room: 'Room 101', day: 'Tuesday', start: '09:15', end: '10:15' },
    { grade: 'Grade 9A', subId: 1, teacher: 'Sarah Jenkins', room: 'Room 101', day: 'Wednesday', start: '08:00', end: '09:00' },
    { grade: 'Grade 9A', subId: 3, teacher: 'Dr. Williams', room: 'Lab 3', day: 'Thursday', start: '10:45', end: '11:45' },
    { grade: 'Grade 9A', subId: 2, teacher: 'Robert Smith', room: 'Room 101', day: 'Friday', start: '09:00', end: '10:00' }
  ];

  for (const slot of scheduleSlots) {
    await dbRun(`
      INSERT INTO timetables (term_id, week_id, class_grade, subject_id, teacher_name, room, day_of_week, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [termId, week5Id, slot.grade, slot.subId, slot.teacher, slot.room, slot.day, slot.start, slot.end]);
  }

  // Seed comprehensive timetable slots for all 11 school classes (KG 1 to JHS 3)
  const { seedAllClassTimetables } = require('./seed_timetable');
  await seedAllClassTimetables();

  // 13. Notices & Broadcasts
  await dbRun(`
    INSERT INTO notices (term_id, week_id, title, content, target_audience, priority, sent_by)
    VALUES 
      (?, ?, 'Welcome to Academic Year 2026/2027', 'Greenwood Academy warmly welcomes all new and returning students, teachers, and esteemed parents. Please review the updated term calendar.', 'all', 'announcement', 'Admin Arthur Vance'),
      (?, ?, 'Midterm Progress Reports & Parent Consultation', 'Dear Parents, Midterm grade sheets and attendance logs for Week 1 to 5 are now available in your Parent Portal. Parent-Teacher consultations will occur this Friday.', 'parents', 'normal', 'Admin Arthur Vance'),
      (?, ?, 'Reminder: Term 1 Outstanding Balance', 'Parents with pending fee balances are encouraged to settle payments through Mobile Money, Bank Transfer, or School Accounts Office.', 'parents', 'urgent', 'Admin Arthur Vance')
  `, [termId, week5Id, termId, week5Id, termId, week5Id]);

  // 14. Library Books & Loans
  const books = [
    { isbn: '978-0134015644', title: 'Calculus: Early Transcendentals', author: 'Stewart', cat: 'Mathematics', tot: 10, av: 9, shelf: 'A1-03' },
    { isbn: '978-0521183055', title: 'Cambridge IGCSE Physics Coursebook', author: 'David Sang', cat: 'Science', tot: 8, av: 7, shelf: 'B2-11' },
    { isbn: '978-0143127741', title: 'Things Fall Apart', author: 'Chinua Achebe', cat: 'Literature', tot: 15, av: 15, shelf: 'C1-04' },
    { isbn: '978-1593279288', title: 'Python Crash Course for Students', author: 'Eric Matthes', cat: 'Technology', tot: 12, av: 12, shelf: 'D3-09' }
  ];

  for (const b of books) {
    await dbRun(`
      INSERT INTO books (isbn, title, author, category, total_copies, available_copies, location_shelf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [b.isbn, b.title, b.author, b.cat, b.tot, b.av, b.shelf]);
  }

  // Ethan has borrowed Cambridge IGCSE Physics
  await dbRun(`
    INSERT INTO book_loans (book_id, student_id, issue_date, due_date, status, issued_by)
    VALUES (2, 1, '2026-09-18', '2026-10-02', 'issued', 'Sarah Jenkins')
  `);

  // 15. Exam Builder & Objective Questions with Auto-Grading
  await dbRun(`
    INSERT INTO exams (term_id, week_id, subject_id, class_grade, title, exam_date, duration_minutes, total_marks, created_by)
    VALUES (?, ?, 1, 'Grade 9A', 'Mathematics Midterm Objective Exam', '2026-10-02', 45, 50, 'Sarah Jenkins')
  `, [termId, week5Id]);

  const examId = 1;
  const questions = [
    {
      num: 1,
      text: 'What is the solution to the equation 3x + 15 = 45?',
      type: 'multiple_choice',
      a: 'x = 10', b: 'x = 12', c: 'x = 15', d: 'x = 20',
      ans: 'a', pts: 10
    },
    {
      num: 2,
      text: 'The square root of 256 is equal to 16.',
      type: 'true_false',
      a: 'True', b: 'False', c: null, d: null,
      ans: 'a', pts: 10
    },
    {
      num: 3,
      text: 'If a triangle has angles of 50 degrees and 60 degrees, what is the third angle?',
      type: 'multiple_choice',
      a: '60 degrees', b: '70 degrees', c: '80 degrees', d: '90 degrees',
      ans: 'b', pts: 10
    },
    {
      num: 4,
      text: 'A linear equation with one variable can have infinite solutions only if both sides are mathematically identical.',
      type: 'true_false',
      a: 'True', b: 'False', c: null, d: null,
      ans: 'a', pts: 10
    },
    {
      num: 5,
      text: 'Calculate the perimeter of a rectangle with length 12cm and width 8cm.',
      type: 'multiple_choice',
      a: '20 cm', b: '40 cm', c: '96 cm', d: '48 cm',
      ans: 'b', pts: 10
    }
  ];

  for (const q of questions) {
    await dbRun(`
      INSERT INTO exam_questions (exam_id, question_number, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [examId, q.num, q.text, q.type, q.a, q.b, q.c, q.d, q.ans, q.pts]);
  }

  // Ethan submitted this exam and auto-grading scored 50/50
  await dbRun(`
    INSERT INTO exam_submissions (exam_id, student_id, answers_json, score, total_possible)
    VALUES (?, 1, '{"1":"a","2":"a","3":"b","4":"a","5":"b"}', 50, 50)
  `, [examId]);

  // 16. Assets & Inventory
  const assets = [
    { tag: 'AST-LAB-001', name: 'Binocular Microscope Olympus CX23', cat: 'Lab Gear', loc: 'Science Lab 3', qty: 15, cond: 'good', cust: 'Dr. Williams', val: 4500.00 },
    { tag: 'AST-COM-014', name: 'Dell OptiPlex Core i7 Workstation', cat: 'IT Equipment', loc: 'Computer Lab', qty: 30, cond: 'good', cust: 'Alex Carter', val: 18000.00 },
    { tag: 'AST-FUR-102', name: 'Ergonomic Student Double Desk & Chairs', cat: 'Furniture', loc: 'Room 101', qty: 35, cond: 'good', cust: 'Mrs. Sarah Jenkins', val: 3200.00 },
    { tag: 'AST-SPT-045', name: 'Official Volleyball Net & Tournament Balls', cat: 'Sports', loc: 'Sports Complex', qty: 4, cond: 'good', cust: 'Coach Taylor', val: 650.00 }
  ];

  for (const a of assets) {
    await dbRun(`
      INSERT INTO assets (asset_tag, item_name, category, location, quantity, condition, custodian, estimated_value, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-08-15')
    `, [a.tag, a.name, a.cat, a.loc, a.qty, a.cond, a.cust, a.val]);
  }

  // 17. Initial Audit Log
  await dbRun(`
    INSERT INTO audit_logs (username, role, action, module, record_id, details)
    VALUES 
      ('admin', 'admin', 'CREATE', 'System', '0', 'System seeded with academic calendar 2026/2027, Term 1, Weeks 1-12, initial classes, and security credentials'),
      ('admin', 'admin', 'CREATE', 'Fees', 'REC-2026-0001', 'Processed initial tuition fee payment for Ethan Miller'),
      ('teacher_sarah', 'user', 'CREATE', 'Attendance', 'Grade 9A', 'Recorded Week 5 daily attendance for Grade 9A')
  `);

  console.log('Database seeded successfully with rich demo data.');
}

module.exports = { seed };

if (require.main === module) {
  seed().then(() => {
    console.log('Seed execution complete.');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
