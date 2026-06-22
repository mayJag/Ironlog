/* Builds a tailored weekly plan from the user's goals + the exercise library.
   Supports multiple objectives (hybrid plans), experience-based volume, and a
   per-muscle weekly volume cap so no muscle group gets overtrained.

   Volume guidelines follow NSCA / ACSM evidence-based recommendations:
   ─ Plyometric & Power (NSCA): 80–140 foot contacts, 4–7 exercises per session
   ─ Strength (NSCA/ACSM):     4–8 exercises, 3–5 sets × 3–12 reps
   ─ Hypertrophy (ACSM 2026):  5–8 exercises, 3–4 sets × 6–15 reps, 10–25 sets/muscle/week
   ─ Fat Loss / Conditioning:   5–9 exercises, 2–4 sets × 12–20 reps, short rest
   ─ General Fitness:            4–7 exercises, 2–4 sets × 8–12 reps                        */

// Exercise count is keyed by experience level so beginners never end up
// under-trained and advanced lifters get enough volume.
const OBJECTIVE_PARAMS = {
  strength: {
    sets: 3, reps: '3-5', rest: '180s', preferCompound: true,
    short: 'Powerbuilding', note: 'Heavy, full recovery between sets.',
    count: { beginner: 4, intermediate: 5, advanced: 6 },
  },
  hypertrophy: {
    sets: 3, reps: '8-12', rest: '90s', preferCompound: false,
    short: 'Hypertrophy', note: 'Controlled tempo, chase the pump.',
    count: { beginner: 5, intermediate: 6, advanced: 7 },
  },
  jump: {
    sets: 3, reps: '5', rest: '120s', preferCompound: true,
    short: 'Power', note: 'Move explosively on every rep.',
    count: { beginner: 5, intermediate: 6, advanced: 7 },
  },
  fatloss: {
    sets: 3, reps: '15', rest: '45s', preferCompound: false,
    short: 'Conditioning', note: 'Keep rest short, heart rate up.',
    count: { beginner: 6, intermediate: 7, advanced: 9 },
  },
  general: {
    sets: 3, reps: '10', rest: '75s', preferCompound: false,
    short: 'Balanced', note: 'Balanced, sustainable effort.',
    count: { beginner: 5, intermediate: 6, advanced: 7 },
  },
  minimalist: {
    sets: 2, reps: '8-10', rest: '60s', preferCompound: true,
    short: 'Essentials', note: 'High intensity, low volume. Push hard.',
    count: 4,
  },
};

const OBJECTIVE_LABELS = {
  strength: 'Powerbuilding', hypertrophy: 'Hypertrophy', jump: 'Vertical Jump',
  fatloss: 'Fat Loss', general: 'General Fitness', minimalist: 'The Essentials',
};

// Experience tuning: sets-per-exercise adjustment and weekly per-muscle cap.
// Weekly caps aligned with ACSM/NSCA recommendations:
//   Beginner  10–14 sets/muscle/week → cap 16 (allows headroom)
//   Intermediate 14–20 → cap 22
//   Advanced  18–25+ → cap 30
const EXPERIENCE = {
  beginner:     { setDelta: -1, muscleWeeklyCap: 16 },
  intermediate: { setDelta: 0,  muscleWeeklyCap: 22 },
  advanced:     { setDelta: 0,  muscleWeeklyCap: 30 },
};

// Which weekday keys are training days for N days/week (spread for recovery).
const DAY_SLOTS = {
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};

// Training-day focus blocks.
const BLOCKS = {
  UPPER: { name: 'Upper Body', groups: ['chest', 'back', 'shoulders', 'arms'] },
  LOWER: { name: 'Lower Body', groups: ['legs', 'core'] },
  PUSH: { name: 'Push', groups: ['chest', 'shoulders', 'arms'] },
  PULL: { name: 'Pull', groups: ['back', 'arms'] },
  LEGS: { name: 'Legs', groups: ['legs', 'core'] },
  FULL: { name: 'Full Body', groups: ['legs', 'chest', 'back', 'shoulders', 'core'] },
  ARMS: { name: 'Arms', groups: ['arms'] },
};

export const SPLIT_LABELS = {
  fullbody: 'Full Body',
  upperlower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
};

// Build the ordered list of training-day blocks for a chosen split.
function buildBlocks(split, days, armsDay) {
  let seq;
  if (split === 'fullbody') {
    seq = Array.from({ length: days }, () => BLOCKS.FULL);
  } else if (split === 'upperlower') {
    const p = [BLOCKS.UPPER, BLOCKS.LOWER];
    seq = Array.from({ length: days }, (_, i) => p[i % 2]);
  } else { // ppl
    const p = [BLOCKS.PUSH, BLOCKS.PULL, BLOCKS.LEGS];
    seq = Array.from({ length: days }, (_, i) => p[i % 3]);
  }
  seq = seq.map(b => ({ ...b })); // clone so we can mutate names safely
  // Convert the final training day into a dedicated arms day if requested.
  if (armsDay && days >= 2) seq[seq.length - 1] = { ...BLOCKS.ARMS };
  return seq;
}

// Recommend the best split for the chosen goals / frequency / experience.
export function recommendSplit(objectives = [], days = 4, experience = 'intermediate') {
  const hasJump = objectives.includes('jump');
  let split, reason;
  if (days <= 3) {
    split = 'fullbody';
    reason = 'With 3 days, full-body sessions hit each muscle ~3×/week — the best frequency at low volume.';
  } else if (days === 4) {
    split = 'upperlower';
    reason = '4 days suits an Upper/Lower split: twice-weekly frequency with a rest day between halves.';
  } else {
    split = 'ppl';
    reason = '5–6 days fits Push/Pull/Legs, spreading volume across more focused sessions.';
  }
  if (hasJump && split === 'ppl') {
    split = 'upperlower';
    reason = 'You added plyometrics — Upper/Lower keeps your legs fresher for explosive work than PPL.';
  }
  return { split, reason };
}

function equipmentAllowed(equip, ex) {
  if (equip === 'bodyweight') return ex.equipment === 'bodyweight';
  if (equip === 'dumbbell') return ['dumbbell', 'bodyweight'].includes(ex.equipment);
  return true; // full gym
}

// Pick exercises for one training day. For power/jump objectives, blends
// plyometric drills with supporting compound movements. Uses bucketed round-robin
// by muscle group and global usage counts to ensure variation across the week.
function pickExercises(library, block, params, equip, wantPlyo, globalCounts) {
  const pool = library.filter(ex => block.groups.includes(ex.muscleGroup) && equipmentAllowed(equip, ex));

  // Score each exercise: prioritize less frequently used exercises
  const getScore = (ex) => {
    let score = 0;
    const usedCount = globalCounts[ex.name] || 0;
    score -= usedCount * 100; // heavy penalty for reuse
    if (params.preferCompound && ex.category === 'compound') score += 10;
    score += Math.random(); // tie breaker
    return score;
  };

  let plyoPool = [];
  let regularPool = pool;
  if (wantPlyo) {
    plyoPool = library.filter(ex => ex.category === 'plyometric' && equipmentAllowed(equip, ex));
    regularPool = pool.filter(ex => ex.category !== 'plyometric');
  }

  // Group regular exercises by muscle group to ensure balanced coverage
  const buckets = {};
  block.groups.forEach(mg => buckets[mg] = []);
  regularPool.forEach(ex => {
    if (buckets[ex.muscleGroup]) buckets[ex.muscleGroup].push(ex);
  });

  // Sort each bucket internally
  for (const mg of block.groups) {
    buckets[mg].sort((a, b) => getScore(b) - getScore(a));
  }
  if (wantPlyo) {
    plyoPool.sort((a, b) => getScore(b) - getScore(a));
  }

  const chosen = [];
  const localSeen = new Set();
  
  const pick = (ex) => {
    chosen.push(ex);
    localSeen.add(ex.name);
    globalCounts[ex.name] = (globalCounts[ex.name] || 0) + 1;
  };

  // 1. Plyometric phase
  if (wantPlyo) {
    const plyoTarget = Math.max(3, Math.floor(params.count * 0.5));
    for (const ex of plyoPool) {
      if (!localSeen.has(ex.name)) pick(ex);
      if (chosen.length >= plyoTarget) break;
    }
  }

  // 2. Round-robin through muscle buckets to fill the rest
  let groupIdx = 0;
  let attempts = 0;
  while (chosen.length < params.count) {
    let anyLeft = false;
    for (const mg of block.groups) {
      if (buckets[mg].length > 0) anyLeft = true;
    }
    if (!anyLeft) break; // no more available exercises

    const targetGroup = block.groups[groupIdx % block.groups.length];
    const bucket = buckets[targetGroup];
    
    if (bucket && bucket.length > 0) {
      const ex = bucket.shift();
      if (!localSeen.has(ex.name)) {
        pick(ex);
        attempts = 0;
      }
    } else {
      attempts++;
    }
    
    groupIdx++;
    if (attempts > block.groups.length * 2) break; // safety breakout
  }

  // Ensure compound exercises always appear before isolation/core exercises
  chosen.sort((a, b) => {
    if (a.category === 'compound' && b.category !== 'compound') return -1;
    if (b.category === 'compound' && a.category !== 'compound') return 1;
    return 0;
  });

  return chosen.map(ex => {
    // Nippard principle: reduce junk volume by assigning fewer sets to isolations
    let exSets = params.sets;
    if (ex.category === 'isolation' || ex.category === 'core' || ex.category === 'mobility') {
      exSets = Math.max(1, params.sets - 1);
    }
    return {
      name: ex.name,
      sets: exSets,
      reps: ex.category === 'plyometric' ? '5' : params.reps,
      rest: ex.category === 'plyometric' ? '120s' : params.rest,
      notes: params.note,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      category: ex.category,
    };
  });
}

// Enforce recovery by capping weekly sets per muscle group.
// Strategy (less aggressive than before):
//   1. First pass — reduce sets per exercise (4→3, 3→2) on isolation work.
//   2. Second pass — only remove entire exercises as a last resort,
//      and never drop a day below a hard floor of 4 exercises.
// Protected categories: compound and plyometric exercises are never reduced
// or removed — they are the primary training stimulus.
function enforceRecovery(weeklySchedule, cap) {
  const setsFor = (mg) => Object.values(weeklySchedule).reduce((sum, day) =>
    sum + (day.exercises || []).filter(e => e.muscleGroup === mg).reduce((s, e) => s + (Number(e.sets) || 0), 0), 0);

  const muscles = [...new Set(Object.values(weeklySchedule).flatMap(d => (d.exercises || []).map(e => e.muscleGroup)))];
  const MIN_EXERCISES_PER_DAY = 4; // NSCA minimum for any session type
  const PROTECTED = ['compound', 'plyometric']; // never trim these

  for (const mg of muscles) {
    // ── Pass 1: reduce sets on non-protected exercises for this muscle ──
    let guard = 0;
    while (setsFor(mg) > cap && guard++ < 40) {
      let reduced = false;
      // Find the exercise with the most sets that is isolation/accessory/core
      let bestKey = null; let bestIdx = -1; let bestSets = 0;
      for (const [key, day] of Object.entries(weeklySchedule)) {
        (day.exercises || []).forEach((e, idx) => {
          if (e.muscleGroup !== mg) return;
          const s = Number(e.sets) || 0;
          if (s > 2 && !PROTECTED.includes(e.category) && s > bestSets) {
            bestSets = s; bestKey = key; bestIdx = idx;
          }
        });
      }
      if (bestKey != null) {
        weeklySchedule[bestKey].exercises[bestIdx].sets = bestSets - 1;
        reduced = true;
      }
      if (!reduced) break; // nothing left to reduce
    }

    // ── Pass 2: remove non-protected exercises only if still over cap ──
    guard = 0;
    while (setsFor(mg) > cap && guard++ < 20) {
      let bestKey = null; let bestIdx = -1; let bestScore = -1;
      for (const [key, day] of Object.entries(weeklySchedule)) {
        // Never drop a day below the minimum exercise count
        if ((day.exercises || []).length <= MIN_EXERCISES_PER_DAY) continue;
        (day.exercises || []).forEach((e, idx) => {
          if (e.muscleGroup !== mg) return;
          // Never remove compounds or plyometric exercises.
          if (PROTECTED.includes(e.category)) return;
          const score = (e.category === 'isolation' ? 3 : 1) + (day.exercises.length);
          if (score > bestScore) { bestScore = score; bestKey = key; bestIdx = idx; }
        });
      }
      if (bestKey == null) break;
      weeklySchedule[bestKey].exercises.splice(bestIdx, 1);
    }
  }
}

export function generatePlan(goals, library) {
  // Accept either objectives:[] (new) or objective:'' (legacy)
  const objectives = (goals.objectives && goals.objectives.length)
    ? goals.objectives
    : [goals.objective || 'general'];
  const days = Math.min(6, Math.max(3, Number(goals.daysPerWeek) || 4));
  const experience = goals.experience || 'intermediate';
  const exp = EXPERIENCE[experience] || EXPERIENCE.intermediate;
  const slots = DAY_SLOTS[days];
  // Resolve the split: explicit choice, or the recommended one when 'auto'.
  const split = (goals.split && goals.split !== 'auto')
    ? goals.split
    : recommendSplit(objectives, days, experience).split;
  const blocks = buildBlocks(split, days, goals.armsDay);
  const hybrid = objectives.length > 1;
  const includesJump = objectives.includes('jump');

  const weeklySchedule = {
    mon: { name: 'Rest Day', type: 'rest', exercises: [] },
    tue: { name: 'Rest Day', type: 'rest', exercises: [] },
    wed: { name: 'Rest Day', type: 'rest', exercises: [] },
    thu: { name: 'Rest Day', type: 'rest', exercises: [] },
    fri: { name: 'Rest Day', type: 'rest', exercises: [] },
    sat: { name: 'Rest Day', type: 'rest', exercises: [] },
    sun: { name: 'Rest Day', type: 'rest', exercises: [] },
  };

  const globalCounts = {};

  slots.forEach((slot, i) => {
    const block = blocks[i];
    // Cycle the chosen objectives across training days for a true hybrid.
    const dayObjective = objectives[i % objectives.length];
    const base = OBJECTIVE_PARAMS[dayObjective] || OBJECTIVE_PARAMS.general;
    // Resolve per-experience exercise count directly — no more exDelta.
    const targetCount = (typeof base.count === 'object')
      ? (base.count[experience] || base.count.intermediate || 5)
      : (base.count || 5);
    const params = {
      ...base,
      count: Math.max(4, targetCount),  // NSCA floor: never below 4
      sets: Math.max(2, base.sets + exp.setDelta),
    };
    const wantPlyo = (dayObjective === 'jump' || includesJump) && block.groups.includes('legs');
    const exercises = pickExercises(library, block, params, goals.equipment, wantPlyo, globalCounts);
    weeklySchedule[slot] = {
      name: hybrid ? `${block.name} · ${base.short}` : block.name,
      type: 'main',
      exercises,
      estimatedDuration: Math.max(25, exercises.length * (params.sets >= 5 ? 10 : 8)),
    };
  });

  // Recovery guardrail: cap weekly sets per muscle by experience level.
  enforceRecovery(weeklySchedule, exp.muscleWeeklyCap);
  // refresh durations after any trimming
  for (const day of Object.values(weeklySchedule)) {
    if (day.type !== 'rest') day.estimatedDuration = Math.max(20, day.exercises.length * 9);
  }

  const planLabel = hybrid
    ? `Hybrid · ${objectives.map(o => OBJECTIVE_PARAMS[o]?.short || o).join(' + ')}`
    : (OBJECTIVE_LABELS[objectives[0]] || 'Custom');

  return {
    id: `plan-generated-${Date.now().toString(36)}`,
    name: `${planLabel} · ${days}-Day`,
    type: 'custom',
    generated: true,
    goals: { ...goals, objectives },
    startDate: new Date().toISOString().split('T')[0],
    progressPct: 0,
    createdAt: Date.now(),
    weeklySchedule,
  };
}
