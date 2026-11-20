const { dbRun, dbGet, dbAll, initDatabase } = require('./database');

async function updateCurriculum() {
  await initDatabase();
  console.log('Updating curriculum data in school.db...');

  // 1. Ensure Classes: KG 1, KG 2, Class 1 to Class 6, JHS 1, JHS 2, JHS 3
  const targetClasses = [
    { name: 'KG 1', room: 'Block A - Room 1', teacher: 'Madam Grace Mensah' },
    { name: 'KG 2', room: 'Block A - Room 2', teacher: 'Miss Akua Serwaa' },
    { name: 'Class 1', room: 'Block B - Room 101', teacher: 'Mr. Emmanuel Osei' },
    { name: 'Class 2', room: 'Block B - Room 102', teacher: 'Mrs. Faustina Darko' },
    { name: 'Class 3', room: 'Block B - Room 103', teacher: 'Mr. Samuel Appiah' },
    { name: 'Class 4', room: 'Block C - Room 201', teacher: 'Madam Beatrice Konadu' },
    { name: 'Class 5', room: 'Block C - Room 202', teacher: 'Mr. Kwabena Frimpong' },
    { name: 'Class 6', room: 'Block C - Room 203', teacher: 'Mrs. Patience Adjei' },
    { name: 'JHS 1', room: 'JHS Wing - Room 301', teacher: 'Mr. Daniel Boateng' },
    { name: 'JHS 2', room: 'JHS Wing - Room 302', teacher: 'Mrs. Joyce Asantewaa' },
    { name: 'JHS 3', room: 'JHS Wing - Room 303', teacher: 'Dr. Joseph Ansah' }
  ];

  for (const c of targetClasses) {
    const existing = await dbGet('SELECT id FROM classes WHERE name = ?', [c.name]);
    if (!existing) {
      await dbRun('INSERT INTO classes (name, room, class_teacher) VALUES (?, ?, ?)', [c.name, c.room, c.teacher]);
    }
  }

  // 2. Ensure Terms: Term 1, Term 2, Term 3
  const termsData = [
    { name: 'Term 1', start: '2026-09-01', end: '2026-12-18', active: 1 },
    { name: 'Term 2', start: '2027-01-08', end: '2027-04-10', active: 0 },
    { name: 'Term 3', start: '2027-04-28', end: '2027-07-20', active: 0 }
  ];

  for (const t of termsData) {
    const existing = await dbGet('SELECT id FROM terms WHERE term_name = ?', [t.name]);
    if (!existing) {
      await dbRun(
        'INSERT INTO terms (session_year, term_name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
        ['2026/2027', t.name, t.start, t.end, t.active]
      );
    }
  }

  const allTerms = await dbAll('SELECT id, term_name FROM terms ORDER BY id ASC');

  // 3. Ensure Weeks 1 to 15 for each Term
  for (const term of allTerms) {
    for (let w = 1; w <= 15; w++) {
      const existingWeek = await dbGet('SELECT id FROM weeks WHERE term_id = ? AND week_number = ?', [term.id, w]);
      if (!existingWeek) {
        const title = w === 1 ? 'Week 1 - Reopening & Roll Call' :
                      w === 7 ? 'Week 7 - Midterm Assessments' :
                      w === 14 ? 'Week 14 - Revision Week' :
                      w === 15 ? 'Week 15 - End of Term Examinations & Reports' :
                      `Week ${w} - Academic Instruction & Practicals`;

        // Generate approximate week dates
        const baseDate = new Date('2026-09-01');
        baseDate.setDate(baseDate.getDate() + (w - 1) * 7);
        const startDateStr = baseDate.toISOString().split('T')[0];
        const endDateObj = new Date(baseDate);
        endDateObj.setDate(endDateObj.getDate() + 4);
        const endDateStr = endDateObj.toISOString().split('T')[0];

        await dbRun(
          'INSERT INTO weeks (term_id, week_number, week_title, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)',
          [term.id, w, title, startDateStr, endDateStr, (term.id === 1 && w === 5) ? 1 : 0]
        );
      }
    }
  }

  // 4. Ensure sample students for each class
  const sampleStudents = [
    { adm: 'SCH-KG1-001', fn: 'Kofi', ln: 'Mensah', gender: 'Male', grade: 'KG 1', pName: 'Kwesi Mensah', pPhone: '0244111222' },
    { adm: 'SCH-KG1-002', fn: 'Abena', ln: 'Osei', gender: 'Female', grade: 'KG 1', pName: 'Yaw Osei', pPhone: '0244111223' },
    { adm: 'SCH-KG2-001', fn: 'Kwame', ln: 'Asante', gender: 'Male', grade: 'KG 2', pName: 'Akosua Asante', pPhone: '0244222331' },
    { adm: 'SCH-KG2-002', fn: 'Yaa', ln: 'Boateng', gender: 'Female', grade: 'KG 2', pName: 'Nana Boateng', pPhone: '0244222332' },
    { adm: 'SCH-CLS1-001', fn: 'Kwaku', ln: 'Amponsah', gender: 'Male', grade: 'Class 1', pName: 'Ama Amponsah', pPhone: '0244333441' },
    { adm: 'SCH-CLS1-002', fn: 'Akua', ln: 'Adjei', gender: 'Female', grade: 'Class 1', pName: 'Kojo Adjei', pPhone: '0244333442' },
    { adm: 'SCH-CLS2-001', fn: 'Kojo', ln: 'Antwi', gender: 'Male', grade: 'Class 2', pName: 'Sarah Antwi', pPhone: '0244444551' },
    { adm: 'SCH-CLS3-001', fn: 'Efua', ln: 'Badu', gender: 'Female', grade: 'Class 3', pName: 'David Badu', pPhone: '0244555661' },
    { adm: 'SCH-CLS4-001', fn: 'Yaw', ln: 'Boakye', gender: 'Male', grade: 'Class 4', pName: 'Mary Boakye', pPhone: '0244666771' },
    { adm: 'SCH-CLS5-001', fn: 'Akosua', ln: 'Manu', gender: 'Female', grade: 'Class 5', pName: 'Peter Manu', pPhone: '0244777881' },
    { adm: 'SCH-CLS6-001', fn: 'Esi', ln: 'Appiah', gender: 'Female', grade: 'Class 6', pName: 'Mercy Appiah', pPhone: '0244888991' },
    { adm: 'SCH-JHS1-001', fn: 'Kweku', ln: 'Danquah', gender: 'Male', grade: 'JHS 1', pName: 'George Danquah', pPhone: '0244999001' },
    { adm: 'SCH-JHS2-001', fn: 'Afia', ln: 'Sarpong', gender: 'Female', grade: 'JHS 2', pName: 'Elizabeth Sarpong', pPhone: '0244000111' },
    { adm: 'SCH-JHS3-001', fn: 'Kwabena', ln: 'Frimpong', gender: 'Male', grade: 'JHS 3', pName: 'Charles Frimpong', pPhone: '0244111333' }
  ];

  for (const s of sampleStudents) {
    const existing = await dbGet('SELECT id FROM students WHERE admission_number = ?', [s.adm]);
    if (!existing) {
      await dbRun(
        `INSERT INTO students (admission_number, first_name, last_name, gender, class_grade, parent_name, parent_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.adm, s.fn, s.ln, s.gender, s.grade, s.pName, s.pPhone]
      );
    }
  }

  console.log('Curriculum update completed successfully.');
}

updateCurriculum()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
