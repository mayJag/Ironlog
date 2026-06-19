import { useState, useEffect, useCallback } from 'react';
import { getAllCustomExercises } from '../store/db';

// Built-in master exercise library used for custom plans, quick workouts and pickers.
export const BASE_EXERCISES = [
  { name: 'Back Squat', muscleGroup: 'legs', category: 'compound', equipment: 'barbell' },
  { name: 'Bench Press', muscleGroup: 'chest', category: 'compound', equipment: 'barbell' },
  { name: 'Deadlift', muscleGroup: 'legs', category: 'compound', equipment: 'barbell' },
  { name: 'Overhead Press', muscleGroup: 'shoulders', category: 'compound', equipment: 'barbell' },
  { name: 'Barbell Row', muscleGroup: 'back', category: 'compound', equipment: 'barbell' },
  { name: 'Lat Pulldown', muscleGroup: 'back', category: 'compound', equipment: 'cable' },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', category: 'isolation', equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', category: 'compound', equipment: 'dumbbell' },
  { name: 'Cable Bicep Curl', muscleGroup: 'arms', category: 'isolation', equipment: 'cable' },
  { name: 'Triceps Pushdown', muscleGroup: 'arms', category: 'isolation', equipment: 'cable' },
  { name: 'Leg Press', muscleGroup: 'legs', category: 'compound', equipment: 'machine' },
  { name: 'Lying Leg Curl', muscleGroup: 'legs', category: 'isolation', equipment: 'machine' },
  { name: 'Leg Extension', muscleGroup: 'legs', category: 'isolation', equipment: 'machine' },
  { name: 'Romanian Deadlift', muscleGroup: 'legs', category: 'compound', equipment: 'barbell' },
  { name: 'Pull Up', muscleGroup: 'back', category: 'compound', equipment: 'bodyweight' },
  { name: 'Push Up', muscleGroup: 'chest', category: 'compound', equipment: 'bodyweight' },
  { name: 'Vertical Jump', muscleGroup: 'legs', category: 'plyometric', equipment: 'bodyweight' },
  { name: 'Depth Jump', muscleGroup: 'legs', category: 'plyometric', equipment: 'bodyweight' },
  { name: 'Broad Jump', muscleGroup: 'legs', category: 'plyometric', equipment: 'bodyweight' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'legs', category: 'compound', equipment: 'dumbbell' },
  { name: 'Tibialis Raise', muscleGroup: 'legs', category: 'isolation', equipment: 'bodyweight' },
  { name: 'Calf Raise', muscleGroup: 'legs', category: 'isolation', equipment: 'bodyweight' },
  { name: 'Plank', muscleGroup: 'core', category: 'core', equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', category: 'core', equipment: 'bodyweight' },
  { name: 'Russian Twist', muscleGroup: 'core', category: 'core', equipment: 'bodyweight' },
  { name: 'Face Pull', muscleGroup: 'shoulders', category: 'isolation', equipment: 'cable' },
  { name: 'Pogo Jumps', muscleGroup: 'legs', category: 'plyometric', equipment: 'bodyweight' },
  { name: 'Couch Stretch', muscleGroup: 'legs', category: 'mobility', equipment: 'bodyweight' },
  { name: "World's Greatest Stretch", muscleGroup: 'full_body', category: 'mobility', equipment: 'bodyweight' },
];

export const EX_CATEGORIES = ['compound', 'isolation', 'plyometric', 'core', 'mobility'];
export const EX_MUSCLES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body'];
export const EX_EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'];

/**
 * Returns the combined exercise library (built-in + user custom), loaded from
 * IndexedDB. Custom entries are tagged `custom: true`. Call reload() after adding.
 */
export function useExerciseLibrary() {
  const [customExercises, setCustomExercises] = useState([]);

  const reload = useCallback(async () => {
    try {
      const custom = await getAllCustomExercises();
      setCustomExercises(custom.map(c => ({ ...c, custom: true })));
    } catch (e) {
      console.error('Failed to load custom exercises:', e);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Custom first so user additions are easy to find; de-dupe by name.
  const seen = new Set();
  const exercises = [...customExercises, ...BASE_EXERCISES].filter(ex => {
    const key = ex.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { exercises, customExercises, reload };
}
