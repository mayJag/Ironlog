/* Builds a tailored weekly plan from the user's goals + the exercise library.
   Supports multiple objectives (hybrid plans), experience-based volume, and a
   per-muscle weekly volume cap so no muscle group gets overtrained. */

const OBJECTIVE_PARAMS = {
  strength:    { sets: 5, reps: '5',     rest: '180s', count: 5, preferCompound: true,  short: 'Strength',    note: 'Heavy, full recovery between sets.' },
  hypertrophy: { sets: 4, reps: '8-12',  rest: '90s',  count: 6, preferCompound: false, short: 'Hypertrophy', note: 'Controlled tempo, chase the pump.' },
  jump:        { sets: 4, reps: '5',     rest: '120s', count: 5, preferCompound: true,  short: 'Power',       note: 'Move explosively on every rep.' },
  fatloss:     { sets: 3, reps: '15',    rest: '45s',  count: 6, preferCompound: false, short: 'Conditioning',note: 'Keep rest short, heart rate up.' },
  general:     { sets: 3, reps: '10',    rest: '75s',  count: 5, preferCompound: false, short: 'Balanced',    note: 'Balanced, sustainable effort.' },
};

const OBJECTIVE_LABELS = {
  strength: 'Strength', hypertrophy: 'Hypertrophy', jump: 'Vertical Jump',
  fatloss: 'Fat Loss', general: 'General Fitness',
};

// Experience tuning: volume (exercise count, sets) and weekly per-muscle cap.
const EXPERIENCE = {
  beginner:     { exDelta: -1, setDelta: -1, muscleWeeklyCap: 12 },
  intermediate: { exDelta: 0,  setDelta: 0,  muscleWeeklyCap: 18 },
  advanced:     { exDelta: 1,  setDelta: 0,  muscleWeeklyCap: 24 },
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

function pickExercises(library, block, params, equip, wantPlyo) {
  let pool = library.filter(ex => block.groups.includes(ex.muscleGroup) && equipmentAllowed(equip, ex));

  if (wantPlyo) {
    const plyo = library.filter(ex => ex.category === 'plyometric' && equipmentAllowed(equip, ex));
    pool = [...plyo, ...pool];
  }
  if (params.preferCompound) {
    pool = [...pool].sort((a, b) => (b.category === 'compound' ? 1 : 0) - (a.category === 'compound' ? 1 : 0));
  } else {
    pool = [...pool].sort(() => Math.random() - 0.5);
  }

  const seen = new Set();
  const chosen = [];
  for (const ex of pool) {
    if (seen.has(ex.name)) continue;
    seen.add(ex.name);
    chosen.push(ex);
    if (chosen.length >= params.count) break;
  }
  return chosen.map(ex => ({
    name: ex.name,
    sets: params.sets,
    reps: ex.category === 'plyometric' ? '5' : params.reps,
    rest: ex.category === 'plyometric' ? '120s' : params.rest,
    notes: params.note,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    category: ex.category,
  }));
}

// Trim isolation work from the busiest days until no muscle exceeds its weekly cap.
function enforceRecovery(weeklySchedule, cap) {
  const setsFor = (mg) => Object.values(weeklySchedule).reduce((sum, day) =>
    sum + (day.exercises || []).filter(e => e.muscleGroup === mg).reduce((s, e) => s + (Number(e.sets) || 0), 0), 0);

  const muscles = [...new Set(Object.values(weeklySchedule).flatMap(d => (d.exercises || []).map(e => e.muscleGroup)))];

  for (const mg of muscles) {
    let guard = 0;
    while (setsFor(mg) > cap && guard++ < 30) {
      // find the training day with the most of this muscle and drop one exercise
      // (prefer isolation/accessory work, keep compounds).
      let bestKey = null; let bestIdx = -1; let bestScore = -1;
      for (const [key, day] of Object.entries(weeklySchedule)) {
        (day.exercises || []).forEach((e, idx) => {
          if (e.muscleGroup !== mg) return;
          const score = (e.category === 'compound' ? 0 : 2) + (day.exercises.length); // prefer isolation, busier days
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
  const exp = EXPERIENCE[goals.experience] || EXPERIENCE.intermediate;
  const slots = DAY_SLOTS[days];
  // Resolve the split: explicit choice, or the recommended one when 'auto'.
  const split = (goals.split && goals.split !== 'auto')
    ? goals.split
    : recommendSplit(objectives, days, goals.experience).split;
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

  slots.forEach((slot, i) => {
    const block = blocks[i];
    // Cycle the chosen objectives across training days for a true hybrid.
    const dayObjective = objectives[i % objectives.length];
    const base = OBJECTIVE_PARAMS[dayObjective] || OBJECTIVE_PARAMS.general;
    const params = {
      ...base,
      count: Math.max(3, base.count + exp.exDelta),
      sets: Math.max(2, base.sets + exp.setDelta),
    };
    const wantPlyo = (dayObjective === 'jump' || includesJump) && block.groups.includes('legs');
    const exercises = pickExercises(library, block, params, goals.equipment, wantPlyo);
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
