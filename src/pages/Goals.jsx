import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Sparkles, Check, Dumbbell, Calendar, Play, Pencil, LayoutGrid, Lightbulb } from 'lucide-react';
import { savePlan, setSetting, getSetting } from '../store/db';
import { useExerciseLibrary } from '../data/exercises';
import { useToast } from '../components/Toast';
import { generatePlan, recommendSplit, SPLIT_LABELS } from '../lib/planGenerator';
import styles from './Goals.module.css';

const SPLITS = [
  { id: 'auto', label: 'Auto' },
  { id: 'fullbody', label: 'Full Body' },
  { id: 'upperlower', label: 'Upper / Lower' },
  { id: 'ppl', label: 'Push / Pull / Legs' },
];

const OBJECTIVES = [
  { id: 'strength', label: 'Get Stronger', desc: 'Heavy compounds, low reps' },
  { id: 'hypertrophy', label: 'Build Muscle', desc: 'Moderate reps, more volume' },
  { id: 'jump', label: 'Jump Higher', desc: 'Plyometrics + lower power' },
  { id: 'fatloss', label: 'Lose Fat', desc: 'Higher reps, short rest' },
  { id: 'general', label: 'General Fitness', desc: 'Balanced full-body work' },
  { id: 'minimalist', label: 'Short Workout', desc: 'Max 45 min, high intensity, low vol' },
];
const EQUIPMENT = [
  { id: 'full', label: 'Full Gym' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'bodyweight', label: 'Bodyweight' },
];
const EXPERIENCE = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export default function Goals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exercises: library } = useExerciseLibrary();

  const [goals, setGoals] = useState({ objectives: ['hypertrophy'], daysPerWeek: 4, experience: 'intermediate', equipment: 'full', split: 'auto', armsDay: false });
  const [preview, setPreview] = useState(null);

  const recommendation = recommendSplit(goals.objectives, goals.daysPerWeek, goals.experience);

  useEffect(() => {
    getSetting('userGoals').then(g => {
      if (!g) return;
      // migrate legacy single-objective shape
      const objectives = g.objectives?.length ? g.objectives : (g.objective ? [g.objective] : ['hypertrophy']);
      setGoals(prev => ({ ...prev, ...g, objectives }));
    });
  }, []);

  const toggleObjective = (id) => {
    setGoals(prev => {
      const has = prev.objectives.includes(id);
      const objectives = has ? prev.objectives.filter(o => o !== id) : [...prev.objectives, id];
      return { ...prev, objectives: objectives.length ? objectives : prev.objectives }; // keep at least one
    });
  };

  const dayLabels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

  const handleGenerate = () => {
    if (!library.length) { toast('Exercise library not ready, try again.', 'warning'); return; }
    if (!goals.objectives.length) { toast('Pick at least one goal.', 'warning'); return; }
    const plan = generatePlan(goals, library);
    setPreview(plan);
    toast(goals.objectives.length > 1 ? 'Hybrid plan generated below.' : 'Plan generated below.', 'info');
  };

  const handleActivate = async () => {
    if (!preview) return;
    await savePlan(preview);
    await setSetting('activePlan', preview);
    await setSetting('userGoals', goals);
    toast('Your plan is active!', 'success');
    navigate('/');
  };

  const handleEditInBuilder = async () => {
    if (!preview) return;
    await setSetting('userGoals', goals);
    // hand the generated plan to the Plan Builder's custom editor
    navigate('/plan', { state: { editPlan: preview } });
  };

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Goals & Auto-Plan</h1>
        <p className="page-subtitle">Tell us your goal — we'll build a weekly plan for you</p>
      </header>

      <section className="section card">
        <h2 className={styles.q}><Target size={15} /> What are your goals?</h2>
        <p className={styles.hint}>Pick one or more — combining goals builds a hybrid plan that alternates focus across the week.</p>
        <div className={styles.optionList}>
          {OBJECTIVES.map(o => {
            const active = goals.objectives.includes(o.id);
            return (
              <button key={o.id}
                className={`${styles.optBig} ${active ? styles.optActive : ''}`}
                onClick={() => toggleObjective(o.id)}>
                <span className={styles.optLabel}>{o.label}</span>
                <span className={styles.optDesc}>{o.desc}</span>
                {active && <Check size={16} className={styles.optCheck} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section card">
        <h2 className={styles.q}><Calendar size={15} /> Days per week</h2>
        <div className={styles.pillRow}>
          {[3, 4, 5, 6].map(d => (
            <button key={d}
              className={`btn ${goals.daysPerWeek === d ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setGoals({ ...goals, daysPerWeek: d })}>{d} days</button>
          ))}
        </div>

        <h2 className={styles.q} style={{ marginTop: 'var(--sp-5)' }}><Dumbbell size={15} /> Equipment</h2>
        <div className={styles.pillRow}>
          {EQUIPMENT.map(e => (
            <button key={e.id}
              className={`btn ${goals.equipment === e.id ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setGoals({ ...goals, equipment: e.id })}>{e.label}</button>
          ))}
        </div>

        <h2 className={styles.q} style={{ marginTop: 'var(--sp-5)' }}>Experience</h2>
        <div className={styles.pillRow}>
          {EXPERIENCE.map(e => (
            <button key={e.id}
              className={`btn ${goals.experience === e.id ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setGoals({ ...goals, experience: e.id })}>{e.label}</button>
          ))}
        </div>
      </section>

      <section className="section card">
        <h2 className={styles.q}><LayoutGrid size={15} /> Training split</h2>
        <div className={styles.optionList}>
          {SPLITS.map(s => {
            const active = goals.split === s.id;
            const isRec = recommendation.split === s.id;
            return (
              <button key={s.id}
                className={`${styles.splitOpt} ${active ? styles.optActive : ''}`}
                onClick={() => setGoals({ ...goals, split: s.id })}>
                <span className={styles.optLabel}>
                  {s.label}
                  {s.id === 'auto' && <span className={styles.autoTag}> · uses {SPLIT_LABELS[recommendation.split]}</span>}
                </span>
                {isRec && s.id !== 'auto' && <span className="badge badge--accent">Recommended</span>}
                {active && <Check size={16} className={styles.optCheck} />}
              </button>
            );
          })}
        </div>

        <div className={styles.recHint}>
          <Lightbulb size={14} />
          <span>{recommendation.reason}</span>
        </div>

        <button
          className={`${styles.armsToggle} ${goals.armsDay ? styles.armsOn : ''}`}
          onClick={() => setGoals({ ...goals, armsDay: !goals.armsDay })}>
          <span className={`checkbox ${goals.armsDay ? 'checkbox--checked' : ''}`}>
            {goals.armsDay && <Check size={14} />}
          </span>
          <span className={styles.armsText}>
            <strong>Dedicated arms day</strong>
            <span>Turn the last training day into a focused biceps/triceps session</span>
          </span>
        </button>
      </section>

      <button className="btn btn--primary btn--full btn--lg section" onClick={handleGenerate}>
        <Sparkles size={18} /> Generate My Plan
      </button>

      {preview && (
        <section className="section card stagger">
          <div className={styles.previewHead}>
            <h2 className={styles.previewTitle}>{preview.name}</h2>
            <span className="badge badge--accent">{Object.values(preview.weeklySchedule).filter(d => d.type !== 'rest').length} training days</span>
          </div>
          <div className={styles.previewDays}>
            {Object.entries(preview.weeklySchedule).map(([key, day]) => (
              <div key={key} className={`${styles.previewDay} ${day.type === 'rest' ? styles.previewRest : ''}`}>
                <span className={styles.previewDayName}>{dayLabels[key]}</span>
                <span className={styles.previewDayWorkout}>{day.name}</span>
                {day.type !== 'rest' && <span className={styles.previewDayCount}>{day.exercises.length} ex</span>}
              </div>
            ))}
          </div>
          <p className={styles.recoveryNote}>
            Volume is tuned for your experience level and capped per muscle group each week to protect recovery.
          </p>
          <div className={styles.previewActions}>
            <button className="btn btn--secondary" onClick={handleEditInBuilder}>
              <Pencil size={16} /> Edit in Builder
            </button>
            <button className="btn btn--primary" onClick={handleActivate}>
              <Play size={16} fill="currentColor" /> Activate
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
