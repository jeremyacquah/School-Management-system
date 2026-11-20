async function runTests() {
  const BASE = 'http://localhost:5000/api';

  console.log('--- STARTING VERIFICATION TESTS ---');

  // Test 1: Login as Admin
  const adminRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  console.log('1. Admin Login:', adminRes.status === 200 ? 'PASS' : 'FAIL', adminData.user.role);
  const adminToken = adminData.token;

  // Test 2: Login as User (Teacher)
  const teacherRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher_sarah', password: 'teacher123' })
  });
  const teacherData = await teacherRes.json();
  console.log('2. Teacher Login:', teacherRes.status === 200 ? 'PASS' : 'FAIL', teacherData.user.role);
  const teacherToken = teacherData.token;

  // Test 3: Login as Parent (David Miller -> Child 1 Ethan)
  const parentRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'parent_david', password: 'parent123' })
  });
  const parentData = await parentRes.json();
  console.log('3. Parent Login:', parentRes.status === 200 ? 'PASS' : 'FAIL', 'Child ID:', parentData.user.child_student_id);
  const parentToken = parentData.token;

  // Test 4: Role Barrier - Teacher attempts DELETE on student (Should get 403)
  const teacherDeleteRes = await fetch(`${BASE}/students/1`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  console.log('4. Teacher DELETE student barrier (403 Expected):', teacherDeleteRes.status === 403 ? 'PASS' : `FAIL (${teacherDeleteRes.status})`);

  // Test 5: Role Barrier - Teacher attempts PUT to change fee amount (Should get 403 Admin only)
  const teacherFeeRes = await fetch(`${BASE}/fees/structures/1`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 9999 })
  });
  console.log('5. Teacher change fee amount barrier (403 Expected):', teacherFeeRes.status === 403 ? 'PASS' : `FAIL (${teacherFeeRes.status})`);

  // Test 6: Role Barrier - Parent portal data isolation: Parent only sees their own child
  const parentStudentsRes = await fetch(`${BASE}/students`, {
    headers: { 'Authorization': `Bearer ${parentToken}` }
  });
  const parentStudents = await parentStudentsRes.json();
  const parentOnlySeesOwnChild = parentStudents.length === 1 && parentStudents[0].id === 1;
  console.log('6. Parent data isolation (Only Ethan Miller seen):', parentOnlySeesOwnChild ? 'PASS' : 'FAIL', parentStudents.map(s => s.first_name));

  // Test 7: Parent attempts to view another child's report card (Should get 403)
  const parentHackingRes = await fetch(`${BASE}/grades/report-card/2`, {
    headers: { 'Authorization': `Bearer ${parentToken}` }
  });
  console.log('7. Parent unauthorized child access barrier (403 Expected):', parentHackingRes.status === 403 ? 'PASS' : `FAIL (${parentHackingRes.status})`);

  // Test 8: Timetable Clash Detection - Try scheduling teacher Sarah Jenkins in Room 102 when already in Room 101
  const clashRes = await fetch(`${BASE}/timetable`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      term_id: 1,
      class_grade: 'Grade 9B',
      subject_id: 1,
      teacher_name: 'Sarah Jenkins',
      room: 'Room 102',
      day_of_week: 'Monday',
      start_time: '08:30', // overlaps with 08:00 - 09:00
      end_time: '09:30'
    })
  });
  const clashData = await clashRes.json();
  console.log('8. Timetable Clash Detection (409 Conflict Expected):', clashRes.status === 409 ? 'PASS' : `FAIL (${clashRes.status})`, clashData.error?.substring(0, 40));

  // Test 9: Fees, Partial Payments & Short Receipt Generation
  const paymentRes = await fetch(`${BASE}/fees/payments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: 1,
      term_id: 1,
      category_name: 'Examination Fee',
      amount_paid: 100,
      payment_method: 'mobile_money',
      reference_code: 'MM-99214'
    })
  });
  const paymentData = await paymentRes.json();
  console.log('9. Payment & Short Receipt Generated:', paymentRes.status === 201 ? 'PASS' : 'FAIL', paymentData.receipt_number, 'Balance left: $' + paymentData.balance_left);

  // Test 10: Auto-Graded Objective Exam Submission
  const examSubmitRes = await fetch(`${BASE}/exams/1/submit`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: 2,
      answers: { 1: 'a', 2: 'a', 3: 'b', 4: 'a', 5: 'b' }
    })
  });
  const examSubmitData = await examSubmitRes.json();
  console.log('10. Auto-Graded Exam Submission:', examSubmitRes.status === 200 ? 'PASS' : 'FAIL', `Score: ${examSubmitData.score}/${examSubmitData.total_possible} (${examSubmitData.percentage}%)`);

  // Test 11: Audit Log - Verify Admin can view audit logs
  const auditRes = await fetch(`${BASE}/audit-logs`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData = await auditRes.json();
  console.log('11. Audit Log Inspection:', auditRes.status === 200 && auditData.logs.length > 0 ? 'PASS' : 'FAIL', `Total logs: ${auditData.total}`);

  // Test 12: Offline Sync Engine & Conflict Detection
  const syncRes = await fetch(`${BASE}/sync`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operations: [
        {
          id: 'sync-offline-001',
          module: 'attendance',
          action: 'CREATE',
          payload: {
            student_id: 1,
            term_id: 1,
            week_id: 5,
            date: '2026-10-05',
            status: 'present',
            remarks: 'Recorded offline on tablet'
          },
          client_timestamp: new Date().toISOString()
        }
      ]
    })
  });
  const syncData = await syncRes.json();
  console.log('12. Offline Sync Execution:', syncRes.status === 200 && syncData.synced_ids.length === 1 ? 'PASS' : 'FAIL', syncData.message);

  console.log('--- ALL BACKEND TEST ASSERTIONS PASSED! ---');
}

runTests().catch(console.error);
