const { dbAll, dbRun } = require('./database');

async function seedAllClassTimetables() {
  console.log('--- SEEDING COMPREHENSIVE CLASH-FREE TIMETABLES FOR ALL CLASSES ---');

  const term = await dbAll('SELECT id FROM terms LIMIT 1');
  const termId = term.length > 0 ? term[0].id : 1;

  const week = await dbAll('SELECT id FROM weeks WHERE week_number = 5 LIMIT 1');
  const weekId = week.length > 0 ? week[0].id : null;

  // Retrieve all subjects grouped by class_grade
  const allSubjects = await dbAll('SELECT id, name, code, class_grade FROM subjects ORDER BY id ASC');
  const subjectsByGrade = {};
  for (const s of allSubjects) {
    if (!subjectsByGrade[s.class_grade]) subjectsByGrade[s.class_grade] = [];
    subjectsByGrade[s.class_grade].push(s);
  }

  // Delete existing timetable slots for the 11 classes (keep Grade 9A intact for legacy tests)
  const targetClasses = [
    'KG 1', 'KG 2', 'Class 1', 'Class 2', 'Class 3',
    'Class 4', 'Class 5', 'Class 6', 'JHS 1', 'JHS 2', 'JHS 3'
  ];

  for (const cls of targetClasses) {
    await dbRun('DELETE FROM timetables WHERE class_grade = ?', [cls]);
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const periods = [
    { start: '08:00', end: '08:45', label: 'Period 1' },
    { start: '08:45', end: '09:30', label: 'Period 2' },
    { start: '09:30', end: '10:15', label: 'Period 3' },
    // Morning Break: 10:15 - 10:45
    { start: '10:45', end: '11:30', label: 'Period 4' },
    { start: '11:30', end: '12:15', label: 'Period 5' },
    // Lunch Break: 12:15 - 13:00
    { start: '13:00', end: '13:45', label: 'Period 6' }
  ];

  const classConfigs = [
    {
      name: 'KG 1',
      room: 'Block A - Room 1',
      teacher: 'Madam Grace Mensah',
      periodsPerDay: 4 // Younger kids
    },
    {
      name: 'KG 2',
      room: 'Block A - Room 2',
      teacher: 'Miss Akua Serwaa',
      periodsPerDay: 4
    },
    {
      name: 'Class 1',
      room: 'Block B - Room 101',
      teacher: 'Mr. Emmanuel Osei',
      periodsPerDay: 5
    },
    {
      name: 'Class 2',
      room: 'Block B - Room 102',
      teacher: 'Mrs. Faustina Darko',
      periodsPerDay: 5
    },
    {
      name: 'Class 3',
      room: 'Block B - Room 103',
      teacher: 'Mr. Samuel Appiah',
      periodsPerDay: 5
    },
    {
      name: 'Class 4',
      room: 'Block C - Room 201',
      teacher: 'Madam Beatrice Konadu',
      periodsPerDay: 6
    },
    {
      name: 'Class 5',
      room: 'Block C - Room 202',
      teacher: 'Mr. Kwabena Frimpong',
      periodsPerDay: 6
    },
    {
      name: 'Class 6',
      room: 'Block C - Room 203',
      teacher: 'Mrs. Patience Adjei',
      periodsPerDay: 6
    },
    {
      name: 'JHS 1',
      room: 'JHS Wing - Room 301',
      teacher: 'Mr. Daniel Boateng',
      periodsPerDay: 6
    },
    {
      name: 'JHS 2',
      room: 'JHS Wing - Room 302',
      teacher: 'Mrs. Joyce Asantewaa',
      periodsPerDay: 6
    },
    {
      name: 'JHS 3',
      room: 'JHS Wing - Room 303',
      teacher: 'Dr. Joseph Ansah',
      periodsPerDay: 6
    }
  ];

  let totalInserted = 0;

  for (const cfg of classConfigs) {
    const classSubs = subjectsByGrade[cfg.name] || [];
    if (classSubs.length === 0) {
      console.warn(`No subjects found for ${cfg.name}, skipping`);
      continue;
    }

    let subIndex = 0;

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const day = days[dayIdx];
      const dailyPeriods = periods.slice(0, cfg.periodsPerDay);

      for (let pIdx = 0; pIdx < dailyPeriods.length; pIdx++) {
        const period = dailyPeriods[pIdx];
        const subject = classSubs[subIndex % classSubs.length];
        subIndex++;

        // Determine teacher and room
        let assignedTeacher = cfg.teacher;
        let assignedRoom = cfg.room;

        // Specialized assignments for JHS 3:
        if (cfg.name === 'JHS 3') {
          if (subject.name.includes('Math')) {
            assignedTeacher = 'Sarah Jenkins';
            // Note: On Monday period 1 (08:00-08:45), Sarah Jenkins in Room 101 is already covered by Grade 9A
            // Let's make Monday 08:00-08:45 in JHS Wing - Room 303 or teach here
            assignedRoom = 'JHS Wing - Room 303';
          } else if (subject.name.includes('English')) {
            assignedTeacher = 'Robert Smith';
            assignedRoom = 'JHS Wing - Room 303';
          } else if (subject.name.includes('Science')) {
            assignedTeacher = 'Dr. Williams';
            assignedRoom = 'Science Lab 1';
          } else if (subject.name.includes('Computing') || subject.name.includes('ICT')) {
            assignedTeacher = 'Alex Carter';
            assignedRoom = 'Computer Lab';
          } else if (subject.name.includes('Social')) {
            assignedTeacher = 'Mrs. Evans';
            assignedRoom = 'JHS Wing - Room 303';
          } else {
            assignedTeacher = 'Dr. Joseph Ansah';
            assignedRoom = 'JHS Wing - Room 303';
          }
        }

        // Avoid overlap with Sarah Jenkins on Monday 08:00 - 09:00
        if (assignedTeacher === 'Sarah Jenkins' && day === 'Monday' && period.start === '08:00') {
          // Put Dr. Joseph Ansah here instead to avoid double booking Sarah Jenkins
          assignedTeacher = 'Dr. Joseph Ansah';
        }
        if (assignedTeacher === 'Sarah Jenkins' && day === 'Wednesday' && period.start === '08:00') {
          assignedTeacher = 'Dr. Joseph Ansah';
        }

        await dbRun(`
          INSERT INTO timetables (term_id, week_id, class_grade, subject_id, teacher_name, room, day_of_week, start_time, end_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          termId,
          weekId,
          cfg.name,
          subject.id,
          assignedTeacher,
          assignedRoom,
          day,
          period.start,
          period.end
        ]);

        totalInserted++;
      }
    }
  }

  console.log(`Successfully seeded ${totalInserted} timetable slots across 11 classes!`);
}

module.exports = { seedAllClassTimetables };

if (require.main === module) {
  seedAllClassTimetables()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error seeding timetables:', err);
      process.exit(1);
    });
}
