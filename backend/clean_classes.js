const { dbRun, dbAll, initDatabase } = require('./database');

async function clean() {
  await initDatabase();
  await dbRun("UPDATE students SET class_grade = 'JHS 3' WHERE class_grade IN ('Grade 9A', 'Grade 9B', 'Grade 10A')");
  await dbRun("DELETE FROM classes WHERE name IN ('Grade 9A', 'Grade 9B', 'Grade 10A')");
  const classes = await dbAll('SELECT name FROM classes ORDER BY id ASC');
  console.log('Cleaned classes:', classes.map(c => c.name));
  const dist = await dbAll('SELECT class_grade, COUNT(*) as cnt FROM students GROUP BY class_grade');
  console.log('Student distribution:', dist);
}

clean().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
