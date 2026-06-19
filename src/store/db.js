import { openDB } from 'idb';

const DB_NAME = 'ironlog';
const DB_VERSION = 2;

// All stores that hold user data — used by backup/export/reset so new stores
// are picked up automatically.
export const DATA_STORES = [
  'settings', 'routines', 'workoutLogs', 'personalRecords', 'plans',
  'bodyMetrics', 'progressPhotos', 'customExercises',
];

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // --- v1 stores ---
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('routines')) {
        const store = db.createObjectStore('routines', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('workoutLogs')) {
        const store = db.createObjectStore('workoutLogs', { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('programId', 'programId');
      }
      if (!db.objectStoreNames.contains('personalRecords')) {
        db.createObjectStore('personalRecords', { keyPath: 'exerciseName' });
      }
      if (!db.objectStoreNames.contains('plans')) {
        const store = db.createObjectStore('plans', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }

      // --- v2 stores ---
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('bodyMetrics')) {
          // one entry per calendar date
          db.createObjectStore('bodyMetrics', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('progressPhotos')) {
          const store = db.createObjectStore('progressPhotos', { keyPath: 'id' });
          store.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('customExercises')) {
          db.createObjectStore('customExercises', { keyPath: 'name' });
        }
      }
    },
  });
}

// --- Settings helpers ---
export async function getSetting(key) {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// --- Routines CRUD ---
export async function getAllRoutines() {
  const db = await getDB();
  return db.getAllFromIndex('routines', 'createdAt');
}

export async function getRoutine(id) {
  const db = await getDB();
  return db.get('routines', id);
}

export async function saveRoutine(routine) {
  const db = await getDB();
  await db.put('routines', routine);
}

export async function deleteRoutine(id) {
  const db = await getDB();
  await db.delete('routines', id);
}

// --- Workout Logs ---
export async function getAllWorkoutLogs() {
  const db = await getDB();
  const logs = await db.getAllFromIndex('workoutLogs', 'date');
  return logs.reverse(); // newest first
}

export async function getWorkoutLog(id) {
  const db = await getDB();
  return db.get('workoutLogs', id);
}

export async function saveWorkoutLog(log) {
  const db = await getDB();
  await db.put('workoutLogs', log);
}

export async function deleteWorkoutLog(id) {
  const db = await getDB();
  await db.delete('workoutLogs', id);
}

export async function getWorkoutLogsByDate(dateStr) {
  const db = await getDB();
  return db.getAllFromIndex('workoutLogs', 'date', dateStr);
}

// --- Personal Records ---
export async function getPersonalRecord(exerciseName) {
  const db = await getDB();
  return db.get('personalRecords', exerciseName);
}

export async function savePersonalRecord(record) {
  const db = await getDB();
  await db.put('personalRecords', record);
}

export async function getAllPersonalRecords() {
  const db = await getDB();
  return db.getAll('personalRecords');
}

// --- Plans CRUD ---
export async function getAllPlans() {
  const db = await getDB();
  return db.getAllFromIndex('plans', 'createdAt');
}

export async function getPlan(id) {
  const db = await getDB();
  return db.get('plans', id);
}

export async function savePlan(plan) {
  const db = await getDB();
  await db.put('plans', plan);
}

export async function deletePlan(id) {
  const db = await getDB();
  await db.delete('plans', id);
}

// --- Body Metrics (bodyweight + measurements, keyed by date) ---
export async function getAllBodyMetrics() {
  const db = await getDB();
  const all = await db.getAll('bodyMetrics');
  return all.sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest first (for charts)
}

export async function saveBodyMetric(entry) {
  const db = await getDB();
  await db.put('bodyMetrics', entry);
}

export async function deleteBodyMetric(date) {
  const db = await getDB();
  await db.delete('bodyMetrics', date);
}

// --- Progress Photos ---
export async function getAllProgressPhotos() {
  const db = await getDB();
  const all = await db.getAllFromIndex('progressPhotos', 'date');
  return all.reverse(); // newest first
}

export async function saveProgressPhoto(photo) {
  const db = await getDB();
  await db.put('progressPhotos', photo);
}

export async function deleteProgressPhoto(id) {
  const db = await getDB();
  await db.delete('progressPhotos', id);
}

// --- Custom Exercises (user additions to the master library) ---
export async function getAllCustomExercises() {
  const db = await getDB();
  return db.getAll('customExercises');
}

export async function saveCustomExercise(exercise) {
  const db = await getDB();
  await db.put('customExercises', exercise);
}

export async function deleteCustomExercise(name) {
  const db = await getDB();
  await db.delete('customExercises', name);
}

// --- Utility: Generate unique ID ---
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
