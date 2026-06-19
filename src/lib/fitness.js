/* ============================================================
   Pure fitness/analytics helpers shared across the app.
   No React, no DB — just data in, data out (easy to reason about).
   ============================================================ */

// --- Estimated 1RM (Epley formula) ---
export function estimate1RM(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

// Best estimated 1RM across a set list
export function best1RMFromSets(sets = []) {
  return sets.reduce((max, s) => {
    if (!s || s.completed === false) return max;
    const e = estimate1RM(s.weight, s.reps);
    return e > max ? e : max;
  }, 0);
}

// --- Volume of a single logged set list ---
export function volumeFromSets(sets = []) {
  return sets.reduce((v, s) => v + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0);
}

// --- Streak (consecutive days up to today/yesterday) ---
export function computeStreak(logs = []) {
  const dates = [...new Set(logs.map(l => l.date))].sort((a, b) => new Date(b) - new Date(a));
  if (dates.length === 0) return 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yStr = new Date(Date.now() - 864e5).toISOString().split('T')[0];
  if (dates[0] !== todayStr && dates[0] !== yStr) return 0;
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = Math.round((new Date(dates[i]) - new Date(dates[i + 1])) / 864e5);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// --- Aggregate stats from all logs ---
export function summarizeLogs(logs = []) {
  let totalVolume = 0;
  let totalSets = 0;
  let maxSetWeight = 0;
  for (const log of logs) {
    totalVolume += Number(log.totalVolume) || 0;
    for (const ex of (log.exercises || [])) {
      for (const s of (ex.sets || [])) {
        if (s.completed !== false) {
          totalSets += 1;
          if ((Number(s.weight) || 0) > maxSetWeight) maxSetWeight = Number(s.weight) || 0;
        }
      }
    }
  }
  return {
    totalWorkouts: logs.length,
    totalVolume,
    totalSets,
    maxSetWeight,
    streak: computeStreak(logs),
  };
}

// --- XP & Levels ---
// XP rewards consistency and work: volume, sets, completed workouts, PRs.
export function computeXP(logs = [], prCount = 0) {
  const s = summarizeLogs(logs);
  return Math.round(s.totalVolume / 50 + s.totalSets * 4 + s.totalWorkouts * 60 + prCount * 120);
}

const LEVEL_TITLES = [
  'Rookie', 'Novice', 'Apprentice', 'Lifter', 'Athlete',
  'Strong', 'Advanced', 'Elite', 'Beast', 'Champion', 'Legend',
];

// Level curve: XP needed to *reach* level n = 250 * (n-1)^1.6
function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(250 * Math.pow(level - 1, 1.6));
}

export function levelFromXP(xp = 0) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 999) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpInLevel = xp - base;
  const xpForNext = next - base;
  const progressPct = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 100;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  return { level, xp, xpInLevel, xpForNext, progressPct, title };
}

// --- Achievements ---
// Each achievement gets a stats object and returns unlocked + progress (0..1).
export function computeAchievements({ logs = [], prs = [], bodyMetrics = [] } = {}) {
  const s = summarizeLogs(logs);
  const prCount = prs.length;
  const hasHeavySet = s.maxSetWeight >= 100;
  const bodyLogged = bodyMetrics.length > 0;

  const defs = [
    { id: 'first-workout', name: 'First Steps', desc: 'Log your first workout', icon: 'Footprints', value: s.totalWorkouts, goal: 1 },
    { id: 'workouts-10', name: 'Getting Consistent', desc: 'Complete 10 workouts', icon: 'CalendarCheck', value: s.totalWorkouts, goal: 10 },
    { id: 'workouts-50', name: 'Committed', desc: 'Complete 50 workouts', icon: 'CalendarHeart', value: s.totalWorkouts, goal: 50 },
    { id: 'workouts-100', name: 'Century Sessions', desc: 'Complete 100 workouts', icon: 'Trophy', value: s.totalWorkouts, goal: 100 },
    { id: 'streak-7', name: 'On Fire', desc: 'Hit a 7-day streak', icon: 'Flame', value: s.streak, goal: 7 },
    { id: 'streak-30', name: 'Unstoppable', desc: 'Hit a 30-day streak', icon: 'Zap', value: s.streak, goal: 30 },
    { id: 'pr-1', name: 'Record Breaker', desc: 'Set your first personal record', icon: 'Medal', value: prCount, goal: 1 },
    { id: 'pr-10', name: 'PR Machine', desc: 'Set 10 personal records', icon: 'Award', value: prCount, goal: 10 },
    { id: 'vol-10k', name: 'Ton Lifted', desc: 'Lift 10,000 total volume', icon: 'Dumbbell', value: s.totalVolume, goal: 10000 },
    { id: 'vol-100k', name: 'Iron Mountain', desc: 'Lift 100,000 total volume', icon: 'Mountain', value: s.totalVolume, goal: 100000 },
    { id: 'vol-1m', name: 'Millionaire', desc: 'Lift 1,000,000 total volume', icon: 'Gem', value: s.totalVolume, goal: 1000000 },
    { id: 'heavy-100', name: 'Triple Digits', desc: 'Complete a set at 100+ on the bar', icon: 'TrendingUp', value: hasHeavySet ? 1 : 0, goal: 1 },
    { id: 'body-log', name: 'Know Thy Body', desc: 'Log a bodyweight entry', icon: 'Scale', value: bodyLogged ? 1 : 0, goal: 1 },
  ];

  return defs.map(d => ({
    ...d,
    unlocked: d.value >= d.goal,
    progress: Math.min(1, d.goal > 0 ? d.value / d.goal : 0),
  }));
}

// --- Smart progressive-overload suggestion for one exercise ---
// Given the most recent completed sets for an exercise, suggest the next target.
// Strategy: if all prescribed reps were hit at a given weight, nudge weight up;
// otherwise hold weight and aim to add reps.
export function suggestProgression(lastSets = [], { repTarget } = {}) {
  const completed = lastSets.filter(s => s && s.completed && (Number(s.weight) > 0 || Number(s.reps) > 0));
  if (completed.length === 0) return null;

  // Top set by weight, then reps
  const top = completed.reduce((b, s) => {
    if (Number(s.weight) > Number(b.weight)) return s;
    if (Number(s.weight) === Number(b.weight) && Number(s.reps) > Number(b.reps)) return s;
    return b;
  }, completed[0]);

  const w = Number(top.weight) || 0;
  const r = Number(top.reps) || 0;
  const target = Number(repTarget) || r;

  // bodyweight / unloaded → suggest +reps
  if (w === 0) {
    return { weight: 0, reps: r + 1, note: `Last: ${r} reps — try ${r + 1}` };
  }

  if (r >= target) {
    // hit the target reps → add a small increment
    const inc = w >= 60 ? 2.5 : w >= 20 ? 2.5 : 1;
    const nextW = Math.round((w + inc) * 2) / 2;
    return { weight: nextW, reps: target, note: `Hit ${r} reps @ ${w} — go ${nextW}` };
  }
  // didn't hit target reps → hold weight, chase reps
  return { weight: w, reps: Math.min(target, r + 1), note: `Build to ${target} reps @ ${w}` };
}

// --- Time-series helpers for charts ---
// Daily volume series across logs (sorted ascending by date).
export function dailyVolumeSeries(logs = []) {
  const map = new Map();
  for (const log of logs) {
    map.set(log.date, (map.get(log.date) || 0) + (Number(log.totalVolume) || 0));
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Estimated-1RM trend for a specific exercise across logs.
export function exercise1RMSeries(logs = [], exerciseName) {
  const pts = [];
  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const log of sorted) {
    const ex = (log.exercises || []).find(e => e.name?.toLowerCase() === exerciseName?.toLowerCase());
    if (ex) {
      const e1rm = best1RMFromSets(ex.sets);
      if (e1rm > 0) pts.push({ date: log.date, value: e1rm });
    }
  }
  return pts;
}

// List of distinct exercise names that appear in logs (for pickers).
export function loggedExerciseNames(logs = []) {
  const set = new Set();
  for (const log of logs) {
    for (const ex of (log.exercises || [])) {
      if (ex.name) set.add(ex.name);
    }
  }
  return [...set].sort();
}
