const { initDatabase, dbRun, dbGet, dbAll } = require('./database');

async function seedSubjects() {
  await initDatabase();
  console.log('Seeding comprehensive subjects for all classes...');

  const classes = [
    'KG 1', 'KG 2',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
    'JHS 1', 'JHS 2', 'JHS 3'
  ];

  // Update legacy Grade 9A subjects to JHS 3
  await dbRun("UPDATE subjects SET class_grade = 'JHS 3' WHERE class_grade = 'Grade 9A'");

  const templates = {
    kg: [
      { code: 'NUM', name: 'Numeracy & Mathematics', teacher: 'Madam Grace Mensah' },
      { code: 'LIT', name: 'Literacy & Phonics', teacher: 'Miss Akua Serwaa' },
      { code: 'ENV', name: 'Environmental Studies', teacher: 'Madam Grace Mensah' },
      { code: 'ART', name: 'Creative Arts & Craft', teacher: 'Miss Akua Serwaa' },
      { code: 'PHY', name: 'Physical Development', teacher: 'Madam Grace Mensah' }
    ],
    primary: [
      { code: 'ENG', name: 'English Language', teacher: 'Mr. Emmanuel Osei' },
      { code: 'MTH', name: 'Mathematics', teacher: 'Mr. Samuel Appiah' },
      { code: 'SCI', name: 'Integrated Science', teacher: 'Mrs. Faustina Darko' },
      { code: 'SOC', name: 'Social Studies', teacher: 'Madam Beatrice Konadu' },
      { code: 'ICT', name: 'Computing & ICT', teacher: 'Mr. Kwabena Frimpong' },
      { code: 'RME', name: 'Religious & Moral Education', teacher: 'Mrs. Patience Adjei' },
      { code: 'ART', name: 'Creative Arts', teacher: 'Mr. Samuel Appiah' },
      { code: 'FRN', name: 'French Language', teacher: 'Madame Claudine' }
    ],
    jhs: [
      { code: 'ENG', name: 'English Language', teacher: 'Mr. Daniel Boateng' },
      { code: 'MTH', name: 'Mathematics', teacher: 'Sarah Jenkins' },
      { code: 'SCI', name: 'Integrated Science', teacher: 'Dr. Joseph Ansah' },
      { code: 'SOC', name: 'Social Studies', teacher: 'Mrs. Joyce Asantewaa' },
      { code: 'ICT', name: 'Computing & ICT', teacher: 'Alex Carter' },
      { code: 'RME', name: 'Religious & Moral Education', teacher: 'Mrs. Joyce Asantewaa' },
      { code: 'BDT', name: 'Basic Design & Technology (BDT)', teacher: 'Mr. Daniel Boateng' },
      { code: 'FRN', name: 'French Language', teacher: 'Madame Claudine' }
    ]
  };

  for (const cls of classes) {
    let tList = [];
    if (cls.startsWith('KG')) tList = templates.kg;
    else if (cls.startsWith('Class')) tList = templates.primary;
    else if (cls.startsWith('JHS')) tList = templates.jhs;

    for (const t of tList) {
      const cleanClass = cls.replace(/\s+/g, '');
      const subCode = `${cleanClass}-${t.code}`;
      const existing = await dbGet('SELECT id FROM subjects WHERE code = ? OR (name = ? AND class_grade = ?)', [subCode, t.name, cls]);
      if (!existing) {
        await dbRun('INSERT INTO subjects (code, name, class_grade, teacher_name) VALUES (?, ?, ?, ?)', [subCode, t.name, cls, t.teacher]);
      }
    }
  }

  const count = await dbGet('SELECT COUNT(*) as c FROM subjects');
  console.log('Total subjects now in database:', count.c);
}

seedSubjects()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
