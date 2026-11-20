// Offline Storage Manager for Greenwood SMS
// Uses localStorage / IndexedDB for offline data persistence and outbox sync queue

const OUTBOX_KEY = 'greenwood_sms_outbox';
const CACHE_PREFIX = 'greenwood_sms_cache_';

export const getOutbox = () => {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read outbox:', e);
    return [];
  }
};

export const saveOutbox = (outbox) => {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
    window.dispatchEvent(new CustomEvent('outbox_updated', { detail: { count: outbox.length } }));
  } catch (e) {
    console.error('Failed to save outbox:', e);
  }
};

export const queueOfflineOperation = (operation) => {
  const outbox = getOutbox();
  const newOp = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    client_timestamp: new Date().toISOString(),
    ...operation
  };
  outbox.push(newOp);
  saveOutbox(outbox);
  return newOp;
};

export const removeSyncedOperations = (syncedIds = []) => {
  const idSet = new Set(syncedIds);
  const outbox = getOutbox();
  const remaining = outbox.filter(op => !idSet.has(op.id));
  saveOutbox(remaining);
  return remaining;
};

export const clearOutbox = () => {
  localStorage.removeItem(OUTBOX_KEY);
  window.dispatchEvent(new CustomEvent('outbox_updated', { detail: { count: 0 } }));
};

// Cached Entity Storage for Offline Viewing
export const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
};

const SEED_FALLBACKS = {
  '/terms_': [
    { id: 1, session_year: '2026/2027', term_name: 'Term 1', start_date: '2026-09-01', end_date: '2026-12-18', is_active: 1 },
    { id: 2, session_year: '2026/2027', term_name: 'Term 2', start_date: '2027-01-08', end_date: '2027-04-10', is_active: 0 },
    { id: 3, session_year: '2026/2027', term_name: 'Term 3', start_date: '2027-04-28', end_date: '2027-07-20', is_active: 0 }
  ],
  '/weeks_': [
    { id: 1, term_id: 1, week_number: 1, week_title: 'Week 1 - Orientation & Setup', start_date: '2026-09-01', end_date: '2026-09-05', is_current: 0 },
    { id: 2, term_id: 1, week_number: 2, week_title: 'Week 2 - Unit 1 Foundations', start_date: '2026-09-08', end_date: '2026-09-12', is_current: 0 },
    { id: 3, term_id: 1, week_number: 3, week_title: 'Week 3 - Lab Practical & Quiz 1', start_date: '2026-09-15', end_date: '2026-09-19', is_current: 0 },
    { id: 4, term_id: 1, week_number: 4, week_title: 'Week 4 - Group Research Projects', start_date: '2026-09-22', end_date: '2026-09-26', is_current: 0 },
    { id: 5, term_id: 1, week_number: 5, week_title: 'Week 5 - Midterm Exams', start_date: '2026-09-29', end_date: '2026-10-03', is_current: 1 }
  ],
  '/students_': [
    { id: 1, admission_number: 'SCH-2026-001', first_name: 'Ethan', last_name: 'Miller', class_grade: 'Grade 9A', parent_name: 'David Miller', parent_phone: '+1-555-0192', gender: 'Male' },
    { id: 2, admission_number: 'SCH-2026-002', first_name: 'Zainab', last_name: 'Al-Mansoor', class_grade: 'Grade 9A', parent_name: 'Fatima Al-Mansoor', parent_phone: '+1-555-0193', gender: 'Female' },
    { id: 3, admission_number: 'SCH-2026-003', first_name: 'Liam', last_name: 'Johnson', class_grade: 'Grade 9A', parent_name: 'Robert Johnson', parent_phone: '+1-555-0194', gender: 'Male' },
    { id: 4, admission_number: 'SCH-2026-004', first_name: 'Sophia', last_name: 'Chen', class_grade: 'Grade 9A', parent_name: 'Mei-Ling Chen', parent_phone: '+1-555-0195', gender: 'Female' },
    { id: 5, admission_number: 'SCH-2026-005', first_name: 'Marcus', last_name: 'Okonjo', class_grade: 'Grade 9A', parent_name: 'Ngozi Okonjo', parent_phone: '+1-555-0196', gender: 'Male' }
  ]
};

export const getCachedData = (key) => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) return parsed.data;
    }
  } catch (e) {
    // ignore parse error and try fallback
  }

  // Fallback to initial seeds if specific endpoint key has a baseline
  if (SEED_FALLBACKS[key]) {
    return SEED_FALLBACKS[key];
  }
  const prefixKey = Object.keys(SEED_FALLBACKS).find(k => key.startsWith(k));
  if (prefixKey) {
    return SEED_FALLBACKS[prefixKey];
  }

  return null;
};
