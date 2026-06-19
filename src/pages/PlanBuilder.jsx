import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Plus, Trash2, Dumbbell, Clock, Play, Save, Check, ShieldAlert, Sparkles, AlertCircle, Pencil, Bookmark } from 'lucide-react';
import { btrProgram } from '../data/btrProgram';
import { nippardProgram } from '../data/nippardProgram';
import { savePlan, setSetting, generateId, saveRoutine, getAllRoutines, deleteRoutine } from '../store/db';
import { useToast } from '../components/Toast';
import { BASE_EXERCISES, useExerciseLibrary } from '../data/exercises';
import styles from './PlanBuilder.module.css';

// Re-exported for backward compatibility (e.g. ActiveWorkout fallback list).
export const MASTER_EXERCISES = BASE_EXERCISES;

export default function PlanBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, confirm } = useToast();
  const { exercises: libraryExercises } = useExerciseLibrary();
  const [activeTab, setActiveTab] = useState('program'); // 'program', 'hybrid', 'custom', 'quick', 'routines'

  // --- Saved Routines State ---
  const [routines, setRoutines] = useState([]);

  const loadRoutines = async () => {
    try {
      const all = await getAllRoutines();
      setRoutines(all.reverse()); // newest first
    } catch (e) {
      console.error('Failed to load routines:', e);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const handleStartRoutine = (routine) => {
    navigate('/workout', { state: { workout: routine, planDay: routine } });
  };

  const handleDeleteRoutine = async (id) => {
    const ok = await confirm({
      title: 'Delete routine?',
      message: 'This saved routine will be removed permanently.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRoutine(id);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      toast('Routine deleted.', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to delete routine.', 'error');
    }
  };

  // --- Follow Program State ---
  const [progSelected, setProgSelected] = useState('nippard-powerbuilding');
  const [progStartDate, setProgStartDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Hybrid Plan State ---
  const [hybridName, setHybridName] = useState('My Hybrid Split');
  const [hybridSchedule, setHybridSchedule] = useState({
    mon: { type: 'nippard', weekNum: 1, dayNum: 1 },
    tue: { type: 'rest' },
    wed: { type: 'btr', phaseNum: 1, weekNum: 1, dayNum: 1 },
    thu: { type: 'rest' },
    fri: { type: 'nippard', weekNum: 1, dayNum: 2 },
    sat: { type: 'btr', phaseNum: 1, weekNum: 1, dayNum: 2 },
    sun: { type: 'rest' }
  });

  // --- Custom Plan State ---
  const [customName, setCustomName] = useState('My Custom routine');
  const [customDays, setCustomDays] = useState({
    mon: { active: true, name: 'Upper Strength', exercises: [] },
    tue: { active: false, name: 'Rest Day', exercises: [] },
    wed: { active: true, name: 'Lower Power', exercises: [] },
    thu: { active: false, name: 'Rest Day', exercises: [] },
    fri: { active: true, name: 'Hypertrophy Day', exercises: [] },
    sat: { active: false, name: 'Rest Day', exercises: [] },
    sun: { active: false, name: 'Rest Day', exercises: [] }
  });
  const [selectedCustomDayKey, setSelectedCustomDayKey] = useState('mon');
  const [customSearch, setCustomSearch] = useState('');
  const [customFilterCategory, setCustomFilterCategory] = useState('all');

  // Hydrate the Custom editor from a generated plan handed over by the Goals page.
  useEffect(() => {
    const editPlan = location.state?.editPlan;
    if (!editPlan) return;
    setActiveTab('custom');
    setCustomName(editPlan.name || 'My Plan');
    const hydrated = {};
    for (const key of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      const day = editPlan.weeklySchedule?.[key];
      if (day && day.type !== 'rest') {
        hydrated[key] = {
          active: true,
          name: day.name,
          exercises: (day.exercises || []).map(e => ({
            name: e.name,
            sets: Number(e.sets) || 3,
            reps: String(e.reps ?? '10'),
            rest: e.rest || '90s',
            notes: e.notes || '',
            muscleGroup: e.muscleGroup,
            equipment: e.equipment,
          })),
        };
      } else {
        hydrated[key] = { active: false, name: 'Rest Day', exercises: [] };
      }
    }
    setCustomDays(hydrated);
    const firstActive = Object.keys(hydrated).find(k => hydrated[k].active);
    if (firstActive) setSelectedCustomDayKey(firstActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // --- Quick Workout State ---
  const [quickDuration, setQuickDuration] = useState(30); // 15, 30, 45, 60
  const [quickFocus, setQuickFocus] = useState('full_body'); // 'upper', 'lower', 'full_body', 'plyo'
  const [generatedWorkout, setGeneratedWorkout] = useState(null);

  const daysOfWeek = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' }
  ];

  // --- Follow Program Save ---
  const handleSaveProgramPlan = async () => {
    const activeProgram = progSelected === 'beyond-the-rim' ? btrProgram : nippardProgram;
    try {
      const newPlan = {
        id: `plan-${activeProgram.id}`,
        name: activeProgram.name,
        type: 'program',
        programId: activeProgram.id,
        startDate: progStartDate,
        currentWeek: 1,
        currentPhase: activeProgram.phases ? 0 : undefined,
        progressPct: 0,
        createdAt: Date.now(),
        weeklySchedule: {}
      };

      // Populate schedule with Week 1
      let days = [];
      if (activeProgram.id === 'beyond-the-rim') {
        const phase = activeProgram.phases.find(p => p.phaseNumber === 0) || activeProgram.phases[0];
        days = phase.weeks[0].days;
      } else {
        days = activeProgram.weeks[0].days;
      }

      days.forEach((day, idx) => {
        const key = daysOfWeek[idx]?.key;
        if (key) {
          newPlan.weeklySchedule[key] = {
            name: day.name,
            type: day.type || (day.exercises?.length > 0 ? 'main' : 'rest'),
            exercises: day.exercises || [],
            estimatedDuration: day.estimatedDuration || (day.type === 'rest' ? 0 : 45),
            dayNumber: day.dayNumber,
            programId: activeProgram.id
          };
        }
      });

      await savePlan(newPlan);
      await setSetting('activePlan', newPlan);
      toast(`Activated plan: ${activeProgram.name}`, 'success');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast('Failed to save plan.', 'error');
    }
  };

  // --- Hybrid Plan Save ---
  const handleSaveHybridPlan = async () => {
    if (!hybridName.trim()) {
      toast('Please enter a plan name.', 'warning');
      return;
    }

    try {
      const newPlan = {
        id: `plan-hybrid-${generateId()}`,
        name: hybridName,
        type: 'hybrid',
        startDate: new Date().toISOString().split('T')[0],
        progressPct: 0,
        createdAt: Date.now(),
        weeklySchedule: {}
      };

      // Construct workouts for each day based on selection
      for (const [dayKey, conf] of Object.entries(hybridSchedule)) {
        if (conf.type === 'rest') {
          newPlan.weeklySchedule[dayKey] = { name: 'Rest Day', type: 'rest', exercises: [] };
        } else if (conf.type === 'nippard') {
          const w = nippardProgram.weeks.find(week => week.weekNumber === conf.weekNum) || nippardProgram.weeks[0];
          const d = w.days.find(day => day.dayNumber === conf.dayNum) || w.days[0];
          newPlan.weeklySchedule[dayKey] = {
            name: `${nippardProgram.name} W${conf.weekNum} D${conf.dayNum} - ${d.name}`,
            type: 'main',
            exercises: d.exercises || [],
            estimatedDuration: d.estimatedDuration || 60,
            programId: 'nippard-powerbuilding'
          };
        } else if (conf.type === 'btr') {
          const phase = btrProgram.phases.find(p => p.phaseNumber === conf.phaseNum) || btrProgram.phases[0];
          const w = phase.weeks.find(week => week.weekNumber === conf.weekNum) || phase.weeks[0];
          const d = w.days.find(day => day.dayNumber === conf.dayNum) || w.days[0];
          newPlan.weeklySchedule[dayKey] = {
            name: `${btrProgram.name} P${conf.phaseNum} W${conf.weekNum} D${conf.dayNum} - ${d.name}`,
            type: 'main',
            exercises: d.exercises || [],
            estimatedDuration: d.estimatedDuration || 45,
            programId: 'beyond-the-rim'
          };
        }
      }

      await savePlan(newPlan);
      await setSetting('activePlan', newPlan);
      toast(`Hybrid plan "${hybridName}" activated!`, 'success');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast('Failed to create hybrid plan.', 'error');
    }
  };

  // --- Custom Plan Logic ---
  const handleToggleCustomDay = (key) => {
    setCustomDays(prev => {
      const current = prev[key];
      return {
        ...prev,
        [key]: {
          ...current,
          active: !current.active,
          name: !current.active ? (current.name === 'Rest Day' ? 'Workout Day' : current.name) : 'Rest Day',
          exercises: !current.active ? [] : current.exercises
        }
      };
    });
  };

  const handleCustomDayNameChange = (key, val) => {
    setCustomDays(prev => ({
      ...prev,
      [key]: { ...prev[key], name: val }
    }));
  };

  const handleAddExerciseToCustomDay = (exercise) => {
    setCustomDays(prev => {
      const day = prev[selectedCustomDayKey];
      return {
        ...prev,
        [selectedCustomDayKey]: {
          ...day,
          exercises: [
            ...day.exercises,
            {
              name: exercise.name,
              sets: 3,
              reps: '10',
              rest: '90s',
              notes: '',
              muscleGroup: exercise.muscleGroup,
              equipment: exercise.equipment
            }
          ]
        }
      };
    });
  };

  const handleRemoveExerciseFromCustomDay = (dayKey, idx) => {
    setCustomDays(prev => {
      const day = prev[dayKey];
      const newEx = [...day.exercises];
      newEx.splice(idx, 1);
      return {
        ...prev,
        [dayKey]: { ...day, exercises: newEx }
      };
    });
  };

  const handleUpdateExerciseValue = (dayKey, idx, field, val) => {
    setCustomDays(prev => {
      const day = prev[dayKey];
      const newEx = day.exercises.map((ex, i) => {
        if (i === idx) {
          return { ...ex, [field]: val };
        }
        return ex;
      });
      return {
        ...prev,
        [dayKey]: { ...day, exercises: newEx }
      };
    });
  };

  const handleSaveCustomPlan = async () => {
    if (!customName.trim()) {
      toast('Please enter a custom plan name.', 'warning');
      return;
    }

    try {
      const newPlan = {
        id: `plan-custom-${generateId()}`,
        name: customName,
        type: 'custom',
        startDate: new Date().toISOString().split('T')[0],
        progressPct: 0,
        createdAt: Date.now(),
        weeklySchedule: {}
      };

      for (const [key, day] of Object.entries(customDays)) {
        if (!day.active) {
          newPlan.weeklySchedule[key] = { name: 'Rest Day', type: 'rest', exercises: [] };
        } else {
          newPlan.weeklySchedule[key] = {
            name: day.name,
            type: 'main',
            exercises: day.exercises,
            estimatedDuration: day.exercises.length * 8 || 30
          };
        }
      }

      await savePlan(newPlan);
      await setSetting('activePlan', newPlan);
      toast(`Custom plan "${customName}" activated!`, 'success');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast('Failed to save custom plan.', 'error');
    }
  };

  // --- Quick Workout Generator ---
  const handleGenerateQuickWorkout = () => {
    // Filter master exercises based on target focus
    let pool = [];
    if (quickFocus === 'upper') {
      pool = libraryExercises.filter(ex => ['chest', 'back', 'shoulders', 'arms'].includes(ex.muscleGroup));
    } else if (quickFocus === 'lower') {
      pool = libraryExercises.filter(ex => ex.muscleGroup === 'legs');
    } else if (quickFocus === 'plyo') {
      pool = libraryExercises.filter(ex => ex.category === 'plyometric' || ex.category === 'mobility');
    } else {
      // Full Body
      pool = [...libraryExercises];
    }

    // Determine target count based on duration (roughly 7-8 mins per exercise)
    let count = 4;
    if (quickDuration === 15) count = 3;
    if (quickDuration === 30) count = 5;
    if (quickDuration === 45) count = 7;
    if (quickDuration === 60) count = 9;

    // Shuffle pool and slice
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    const workout = {
      id: `quick-${generateId()}`,
      name: `Quick ${quickDuration}m - ${quickFocus.toUpperCase().replace('_', ' ')}`,
      type: 'quick',
      estimatedDuration: quickDuration,
      exercises: selected.map(ex => ({
        name: ex.name,
        sets: ex.category === 'plyometric' ? 3 : 4,
        reps: ex.category === 'plyometric' ? '8' : '10',
        rest: ex.category === 'plyometric' ? '60s' : '90s',
        notes: ex.category === 'plyometric' ? 'Focus on explosive speed!' : 'Controlled tempo',
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment
      }))
    };

    setGeneratedWorkout(workout);
  };

  const handleStartQuickWorkout = () => {
    if (generatedWorkout) {
      navigate('/workout', { state: { workout: generatedWorkout, planDay: generatedWorkout } });
    }
  };

  const handleSaveQuickAsRoutine = async () => {
    if (!generatedWorkout) return;
    try {
      const newRoutine = {
        ...generatedWorkout,
        id: `routine-${generateId()}`,
        createdAt: Date.now()
      };
      await saveRoutine(newRoutine);
      await loadRoutines();
      toast('Saved to My Routines.', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to save routine.', 'error');
    }
  };

  // Custom Exercises Filter
  const filteredExercises = libraryExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(customSearch.toLowerCase());
    const matchesCategory = customFilterCategory === 'all' || ex.category === customFilterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`${styles.planBuilder} page stagger`}>
      <header className={styles.header}>
        <h1 className="page-title">Plan & Routine Builder</h1>
        <p className="page-subtitle">Choose your training style, build custom layouts or generate quick sessions</p>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'program' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('program')}
        >
          Follow Program
        </button>
        <button
          className={`tab ${activeTab === 'hybrid' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('hybrid')}
        >
          Hybrid Plan
        </button>
        <button
          className={`tab ${activeTab === 'custom' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          Custom Plan
        </button>
        <button
          className={`tab ${activeTab === 'quick' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('quick')}
        >
          Quick Workout
        </button>
        <button
          className={`tab ${activeTab === 'routines' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('routines')}
        >
          My Routines
        </button>
      </div>

      {/* 1. FOLLOW PROGRAM VIEW */}
      {activeTab === 'program' && (
        <div className="card stagger">
          <h2 className={styles.sectionTitle}>Follow a Full PDF Program</h2>
          <p className={styles.sectionDesc}>
            Deploy the complete program cycle as-written. Your weekly calendar will map directly to the workout days.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Select Program</label>
            <select 
              className="select"
              value={progSelected}
              onChange={(e) => setProgSelected(e.target.value)}
            >
              <option value="nippard-powerbuilding">{nippardProgram.name}</option>
              <option value="beyond-the-rim">{btrProgram.name}</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Start Date</label>
            <input 
              type="date" 
              className="input"
              value={progStartDate}
              onChange={(e) => setProgStartDate(e.target.value)}
            />
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSaveProgramPlan}>
            <Check size={16} /> Activate Plan
          </button>
        </div>
      )}

      {/* 2. HYBRID PLAN VIEW */}
      {activeTab === 'hybrid' && (
        <div className="card stagger">
          <h2 className={styles.sectionTitle}>Build a Hybrid Split</h2>
          <p className={styles.sectionDesc}>
            Merge vertical jump workouts (BTR) and strength workouts (Nippard) into your own weekly schedule.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Plan Name</label>
            <input 
              type="text" 
              className="input"
              value={hybridName}
              onChange={(e) => setHybridName(e.target.value)}
              placeholder="e.g., Power & Vertical Jump Hybrid"
            />
          </div>

          <div className={styles.hybridGrid}>
            {daysOfWeek.map((day) => {
              const conf = hybridSchedule[day.key];
              return (
                <div key={day.key} className={styles.hybridRow}>
                  <span className={styles.dayLabel}>{day.label}</span>
                  
                  <div className={styles.rowInputs}>
                    <select
                      className="select"
                      value={conf.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setHybridSchedule(prev => ({
                          ...prev,
                          [day.key]: type === 'rest' ? { type: 'rest' } : { type, weekNum: 1, dayNum: 1, phaseNum: type === 'btr' ? 1 : undefined }
                        }));
                      }}
                    >
                      <option value="rest">Rest Day</option>
                      <option value="nippard">Jeff Nippard Lift</option>
                      <option value="btr">Beyond The Rim Plyo</option>
                    </select>

                    {conf.type === 'nippard' && (
                      <div className={styles.subSelects}>
                        <select
                          className="select"
                          value={conf.weekNum}
                          onChange={(e) => setHybridSchedule(prev => ({
                            ...prev,
                            [day.key]: { ...conf, weekNum: parseInt(e.target.value) }
                          }))}
                        >
                          {nippardProgram.weeks.map(w => (
                            <option key={w.weekNumber} value={w.weekNumber}>Week {w.weekNumber}</option>
                          ))}
                        </select>
                        <select
                          className="select"
                          value={conf.dayNum}
                          onChange={(e) => setHybridSchedule(prev => ({
                            ...prev,
                            [day.key]: { ...conf, dayNum: parseInt(e.target.value) }
                          }))}
                        >
                          <option value={1}>Day 1</option>
                          <option value={2}>Day 2</option>
                          <option value={3}>Day 3</option>
                          <option value={4}>Day 4</option>
                          <option value={5}>Day 5</option>
                        </select>
                      </div>
                    )}

                    {conf.type === 'btr' && (
                      <div className={styles.subSelects}>
                        <select
                          className="select"
                          value={conf.phaseNum}
                          onChange={(e) => setHybridSchedule(prev => ({
                            ...prev,
                            [day.key]: { ...conf, phaseNum: parseInt(e.target.value) }
                          }))}
                        >
                          {btrProgram.phases.map(p => (
                            <option key={p.phaseNumber} value={p.phaseNumber}>Phase {p.phaseNumber}</option>
                          ))}
                        </select>
                        <select
                          className="select"
                          value={conf.weekNum}
                          onChange={(e) => setHybridSchedule(prev => ({
                            ...prev,
                            [day.key]: { ...conf, weekNum: parseInt(e.target.value) }
                          }))}
                        >
                          <option value={1}>Week 1</option>
                          <option value={2}>Week 2</option>
                          <option value={3}>Week 3</option>
                          <option value={4}>Week 4</option>
                        </select>
                        <select
                          className="select"
                          value={conf.dayNum}
                          onChange={(e) => setHybridSchedule(prev => ({
                            ...prev,
                            [day.key]: { ...conf, dayNum: parseInt(e.target.value) }
                          }))}
                        >
                          <option value={1}>Day 1</option>
                          <option value={2}>Day 2</option>
                          <option value={3}>Day 3</option>
                          <option value={4}>Day 4</option>
                          <option value={5}>Day 5</option>
                          <option value={6}>Day 6</option>
                          <option value={7}>Day 7</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSaveHybridPlan}>
            <Save size={16} /> Save & Activate Hybrid Plan
          </button>
        </div>
      )}

      {/* 3. CUSTOM PLAN VIEW */}
      {activeTab === 'custom' && (
        <div className={styles.customGridWrapper}>
          <div className="card stagger">
            <h2 className={styles.sectionTitle}>Build a Custom Program</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>Plan Name</label>
              <input 
                type="text" 
                className="input"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Hypertrophy Split 4-Day"
              />
            </div>

            <div className={styles.customDaysList}>
              {daysOfWeek.map((day) => {
                const isSelected = selectedCustomDayKey === day.key;
                const dData = customDays[day.key];
                return (
                  <div 
                    key={day.key} 
                    className={`${styles.customDayRow} ${isSelected ? styles.selectedCustomDay : ''}`}
                    onClick={() => setSelectedCustomDayKey(day.key)}
                  >
                    <div className={styles.daySwitchCol}>
                      <button
                        className={`checkbox ${dData.active ? 'checkbox--checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCustomDay(day.key);
                        }}
                      >
                        {dData.active && <Check size={14} />}
                      </button>
                      <span className={styles.dayKeyText}>{day.label}</span>
                    </div>

                    {dData.active ? (
                      <input
                        type="text"
                        className={`${styles.customDayNameInput} input`}
                        value={dData.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCustomDayNameChange(day.key, e.target.value)}
                      />
                    ) : (
                      <span className={styles.restLabel}>Rest Day</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exercises Config for Selected Day */}
          {customDays[selectedCustomDayKey].active && (
            <div className="card stagger" style={{ marginTop: 'var(--sp-4)' }}>
              <h3 className={styles.sectionTitle}>
                Exercises for {daysOfWeek.find(d => d.key === selectedCustomDayKey)?.label} ({customDays[selectedCustomDayKey].name})
              </h3>

              {customDays[selectedCustomDayKey].exercises.length > 0 ? (
                <div className={styles.configList}>
                  {customDays[selectedCustomDayKey].exercises.map((ex, exIdx) => (
                    <div key={exIdx} className={styles.configItem}>
                      <div className={styles.configHeader}>
                        <span className={styles.configExName}>{ex.name}</span>
                        <button
                          className="btn btn--ghost text-danger"
                          onClick={() => handleRemoveExerciseFromCustomDay(selectedCustomDayKey, exIdx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className={styles.configInputs}>
                        <div className={styles.configCol}>
                          <span className={styles.configInputLabel}>Sets</span>
                          <input
                            type="number"
                            className="input input--sm"
                            value={ex.sets}
                            onChange={(e) => handleUpdateExerciseValue(selectedCustomDayKey, exIdx, 'sets', parseInt(e.target.value) || 3)}
                          />
                        </div>
                        <div className={styles.configCol}>
                          <span className={styles.configInputLabel}>Reps</span>
                          <input
                            type="text"
                            className="input"
                            style={{ padding: '4px', textAlign: 'center', width: '60px' }}
                            value={ex.reps}
                            onChange={(e) => handleUpdateExerciseValue(selectedCustomDayKey, exIdx, 'reps', e.target.value)}
                          />
                        </div>
                        <div className={styles.configCol}>
                          <span className={styles.configInputLabel}>Rest</span>
                          <input
                            type="text"
                            className="input"
                            style={{ padding: '4px', textAlign: 'center', width: '60px' }}
                            value={ex.rest}
                            onChange={(e) => handleUpdateExerciseValue(selectedCustomDayKey, exIdx, 'rest', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <AlertCircle size={24} />
                  <p>No exercises added yet. Use the selector below.</p>
                </div>
              )}

              {/* Add Exercise Modal / Selector */}
              <div className={styles.exSearchBox}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search exercise..."
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
                
                <div className={styles.scrollSelector}>
                  {filteredExercises.slice(0, 10).map((ex) => (
                    <button
                      key={ex.name}
                      className={styles.exSelectItem}
                      onClick={() => handleAddExerciseToCustomDay(ex)}
                    >
                      <Plus size={14} /> {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button 
            className="btn btn--primary btn--full" 
            style={{ marginTop: 'var(--sp-4)' }}
            onClick={handleSaveCustomPlan}
          >
            <Save size={16} /> Save & Activate Custom Plan
          </button>
        </div>
      )}

      {/* 4. QUICK WORKOUT GENERATOR VIEW */}
      {activeTab === 'quick' && (
        <div className="card stagger">
          <h2 className={styles.sectionTitle}>Generate Quick Session</h2>
          <p className={styles.sectionDesc}>
            Pressed for time? Let the system compile a dynamic single-session routine depending on your preferences.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Duration Goal</label>
            <div className={styles.durationButtons}>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  className={`btn ${quickDuration === mins ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setQuickDuration(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Muscle Focus</label>
            <select
              className="select"
              value={quickFocus}
              onChange={(e) => setQuickFocus(e.target.value)}
            >
              <option value="full_body">Full Body Mix</option>
              <option value="upper">Upper Body (Chest/Back/Arms)</option>
              <option value="lower">Lower Body (Quads/Hamstrings)</option>
              <option value="plyo">Vertical Jump / Plyometrics / Mobility</option>
            </select>
          </div>

          <button className="btn btn--primary btn--full" onClick={handleGenerateQuickWorkout}>
            <Sparkles size={16} /> Generate Workout
          </button>

          {/* Generated workout overview */}
          {generatedWorkout && (
            <div className={styles.generatedBox}>
              <div className={styles.genHeader}>
                <h3 className={styles.genTitle}>{generatedWorkout.name}</h3>
                <span className="badge badge--accent">{generatedWorkout.estimatedDuration} mins</span>
              </div>

              <div className={styles.genExList}>
                {generatedWorkout.exercises.map((ex, idx) => (
                  <div key={idx} className={styles.genExItem}>
                    <span>{ex.name}</span>
                    <span className={styles.genExSets}>{ex.sets}s × {ex.reps}r (Rest: {ex.rest})</span>
                  </div>
                ))}
              </div>

              <div className={styles.genActions}>
                <button className="btn btn--success" onClick={handleStartQuickWorkout}>
                  <Play size={14} fill="currentColor" /> Start Workout Now
                </button>
                <button className="btn btn--secondary" onClick={handleSaveQuickAsRoutine}>
                  <Save size={14} /> Save to Routines
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MY ROUTINES VIEW */}
      {activeTab === 'routines' && (
        <div className="stagger">
          <div className="card">
            <h2 className={styles.sectionTitle}>Saved Routines</h2>
            <p className={styles.sectionDesc}>
              Build reusable single-session routines, then start or edit them anytime.
            </p>
            <button
              className="btn btn--primary btn--full"
              onClick={() => navigate('/routine/new')}
            >
              <Plus size={16} /> Create New Routine
            </button>
          </div>

          {routines.length > 0 ? (
            <div className={styles.routineList}>
              {routines.map((routine) => (
                <div key={routine.id} className={`${styles.routineCard} card`}>
                  <div className={styles.routineInfo}>
                    <Bookmark size={16} className={styles.routineIcon} />
                    <div>
                      <span className={styles.routineName}>{routine.name}</span>
                      <span className={styles.routineMeta}>
                        {routine.exercises?.length || 0} exercises
                      </span>
                    </div>
                  </div>
                  <div className={styles.routineActions}>
                    <button
                      className="btn btn--primary btn--sm btn--icon"
                      title="Start routine"
                      onClick={() => handleStartRoutine(routine)}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                    <button
                      className="btn btn--secondary btn--sm btn--icon"
                      title="Edit routine"
                      onClick={() => navigate(`/routine/${routine.id}/edit`)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn--ghost btn--sm btn--icon text-danger"
                      title="Delete routine"
                      onClick={() => handleDeleteRoutine(routine.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state card" style={{ marginTop: 'var(--sp-4)' }}>
              <Bookmark size={32} />
              <h3>No saved routines</h3>
              <p>Create one above, or save a generated Quick Workout to reuse it later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
