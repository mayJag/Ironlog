import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Check, Plus, Clock, Trophy, Dumbbell, ChevronDown, ChevronUp, AlertTriangle, Play, Pause } from 'lucide-react';
import { saveWorkoutLog, getPersonalRecord, savePersonalRecord, getAllWorkoutLogs } from '../store/db';
import RestTimer from '../components/RestTimer';
import { getExerciseVideoUrl } from '../data/exerciseVideos';
import { MASTER_EXERCISES } from './PlanBuilder';
import styles from './ActiveWorkout.module.css';

export default function ActiveWorkout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get workout from router state
  const workoutData = location.state?.workout || {
    name: 'Quick Workout',
    exercises: [
      { name: 'Push Up', sets: 3, reps: '12', rest: '60s', muscleGroup: 'chest', equipment: 'bodyweight' },
      { name: 'Air Squat', sets: 3, reps: '15', rest: '60s', muscleGroup: 'legs', equipment: 'bodyweight' }
    ]
  };

  // Workout state
  const [exercises, setExercises] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Rest timer state
  const [isRestTimerVisible, setIsRestTimerVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  // Summary state
  const [showSummary, setShowSummary] = useState(false);
  const [newPRs, setNewPRs] = useState([]); // list of exercise names where a PR was hit
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSetsCount, setTotalSetsCount] = useState(0);

  // Previous performance records state: exerciseName -> 'weight kg x reps'
  const [previousData, setPreviousData] = useState({});

  // Add Exercise Modal State
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [exSearchQuery, setExSearchQuery] = useState('');

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Initialize exercises and load historical data
  useEffect(() => {
    // Standardize sets format
    const formatted = (workoutData.exercises || []).map((ex, exIdx) => {
      const setTotal = parseInt(ex.sets) || 3;
      const defaultReps = parseInt(ex.reps) || 10;
      
      const sets = [];
      for (let i = 0; i < setTotal; i++) {
        sets.push({
          weight: 0,
          reps: defaultReps,
          completed: false
        });
      }

      return {
        ...ex,
        sets,
        isNotesExpanded: false
      };
    });

    setExercises(formatted);
    loadPreviousPerformance(workoutData.exercises || []);

    // Start workout duration timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutData]);

  // Fetch previous performance for all exercises
  const loadPreviousPerformance = async (exercisesList) => {
    try {
      const logs = await getAllWorkoutLogs();
      const prevMap = {};

      for (const ex of exercisesList) {
        // Find most recent log where this exercise was performed
        let found = false;
        for (const log of logs) {
          const logEx = log.exercises?.find(le => le.name.toLowerCase() === ex.name.toLowerCase());
          if (logEx && logEx.sets?.length > 0) {
            // Grab the best set or the first completed set
            const completedSets = logEx.sets.filter(s => s.completed);
            if (completedSets.length > 0) {
              const bestSet = completedSets.reduce((best, curr) => (curr.weight > best.weight) ? curr : best, completedSets[0]);
              prevMap[ex.name] = `${bestSet.weight}kg × ${bestSet.reps}`;
              found = true;
              break;
            }
          }
        }

        // If no past log, check personalRecords store
        if (!found) {
          const pr = await getPersonalRecord(ex.name);
          if (pr) {
            prevMap[ex.name] = `${pr.weight}kg × ${pr.reps}`;
          } else {
            prevMap[ex.name] = '—';
          }
        }
      }

      setPreviousData(prevMap);
    } catch (e) {
      console.error("Failed to load previous data:", e);
    }
  };

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? hrs.toString().padStart(2, '0') : null,
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const handleToggleNote = (exIdx) => {
    setExercises(prev => prev.map((ex, idx) => {
      if (idx === exIdx) {
        return { ...ex, isNotesExpanded: !ex.isNotesExpanded };
      }
      return ex;
    }));
  };

  const handleUpdateSet = (exIdx, setIdx, field, value) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i === exIdx) {
        const newSets = ex.sets.map((s, j) => {
          if (j === setIdx) {
            return { ...s, [field]: value };
          }
          return s;
        });
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleToggleCompleted = (exIdx, setIdx) => {
    let triggeredRest = false;
    let duration = 90;

    setExercises(prev => prev.map((ex, i) => {
      if (i === exIdx) {
        const newSets = ex.sets.map((s, j) => {
          if (j === setIdx) {
            const nextCompleted = !s.completed;
            let finalDuration = s.duration;
            let isRunning = s.isTimerRunning;
            if (nextCompleted && isRunning) {
              finalDuration = s.timerStartTime ? Math.floor((Date.now() - s.timerStartTime) / 1000) : 0;
              isRunning = false;
            }
            if (nextCompleted) {
              triggeredRest = true;
              // Parse rest string e.g. "90s" or "2 min"
              const restStr = ex.rest || '90s';
              const seconds = parseInt(restStr);
              if (!isNaN(seconds)) {
                duration = restStr.includes('min') ? seconds * 60 : seconds;
              }
            }
            return { ...s, completed: nextCompleted, duration: finalDuration, isTimerRunning: isRunning };
          }
          return s;
        });
        return { ...ex, sets: newSets };
      }
      return ex;
    }));

    if (triggeredRest) {
      setRestDuration(duration);
      setIsRestTimerVisible(true);
    }
  };

  const handleStartSetTimer = (exIdx, setIdx) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i === exIdx) {
        const newSets = ex.sets.map((s, j) => {
          if (j === setIdx) {
            return {
              ...s,
              timerStartTime: Date.now(),
              isTimerRunning: true
            };
          }
          return s;
        });
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleStopSetTimer = (exIdx, setIdx) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i === exIdx) {
        const newSets = ex.sets.map((s, j) => {
          if (j === setIdx) {
            const duration = s.timerStartTime ? Math.floor((Date.now() - s.timerStartTime) / 1000) : 0;
            return {
              ...s,
              isTimerRunning: false,
              duration
            };
          }
          return s;
        });
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleAddCustomExercise = (ex) => {
    const newEx = {
      name: ex.name,
      sets: [
        { weight: 0, reps: 10, completed: false },
        { weight: 0, reps: 10, completed: false },
        { weight: 0, reps: 10, completed: false }
      ],
      rest: '90s',
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      notes: 'Custom exercise added during session',
      isNotesExpanded: false
    };
    setExercises(prev => [...prev, newEx]);
    setShowAddExModal(false);
    setExSearchQuery('');
  };

  const handleAddSet = (exIdx) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i === exIdx) {
        const lastSet = ex.sets[ex.sets.length - 1] || { weight: 0, reps: 10 };
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { weight: lastSet.weight, reps: lastSet.reps, completed: false }
          ]
        };
      }
      return ex;
    }));
  };

  // Rest Timer Callbacks
  const handleRestTimerComplete = () => {
    setIsRestTimerVisible(false);
  };

  const handleRestTimerSkip = () => {
    setIsRestTimerVisible(false);
  };

  // Check if at least one set is completed
  const isAnySetCompleted = () => {
    return exercises.some(ex => ex.sets.some(s => s.completed));
  };

  // Finish Workout: calculate summary metrics and determine if new PRs were made
  const handleFinishWorkout = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let volume = 0;
    let setsCount = 0;
    const prsHit = [];

    // Calculate metrics & verify PRs
    for (const ex of exercises) {
      let exMaxWeight = 0;
      let exMaxRepsForWeight = 0;
      let exHasCompletedSet = false;

      ex.sets.forEach(s => {
        if (s.completed) {
          exHasCompletedSet = true;
          setsCount++;
          volume += (s.weight || 0) * (s.reps || 0);

          if (s.weight > exMaxWeight) {
            exMaxWeight = s.weight;
            exMaxRepsForWeight = s.reps;
          }
        }
      });

      if (exHasCompletedSet) {
        // Compare with current PR
        const currentPR = await getPersonalRecord(ex.name);
        if (!currentPR || exMaxWeight > currentPR.weight || (exMaxWeight === currentPR.weight && exMaxRepsForWeight > currentPR.reps)) {
          // If we actually lifted a non-zero weight, or if bodyweight is tracked
          if (exMaxWeight > 0 || ex.equipment === 'bodyweight') {
            prsHit.push(ex.name);
          }
        }
      }
    }

    setTotalVolume(volume);
    setTotalSetsCount(setsCount);
    setNewPRs(prsHit);
    setShowSummary(true);
  };

  const handleSaveAndExit = async () => {
    try {
      // 1. Save new PRs to Database
      for (const ex of exercises) {
        let maxWeight = 0;
        let maxReps = 0;
        let activePR = false;

        ex.sets.forEach(s => {
          if (s.completed) {
            activePR = true;
            if (s.weight > maxWeight) {
              maxWeight = s.weight;
              maxReps = s.reps;
            }
          }
        });

        if (activePR) {
          const current = await getPersonalRecord(ex.name);
          if (!current || maxWeight > current.weight || (maxWeight === current.weight && maxReps > current.reps)) {
            await savePersonalRecord({
              exerciseName: ex.name,
              weight: maxWeight,
              reps: maxReps,
              date: new Date().toISOString().split('T')[0]
            });
          }
        }
      }

      // 2. Save Workout Log
      const workoutLog = {
        id: `log-${Date.now()}`,
        name: workoutData.name,
        programName: workoutData.programId === 'beyond-the-rim' ? 'BTR' : (workoutData.programId === 'nippard-powerbuilding' ? 'Nippard' : 'Custom'),
        programId: workoutData.programId || 'custom',
        date: new Date().toISOString().split('T')[0],
        duration: Math.round(elapsedTime / 60) || 1, // in minutes
        exercises: exercises.map(ex => ({
          name: ex.name,
          isPR: newPRs.includes(ex.name),
          sets: ex.sets.map(s => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed
          }))
        })),
        totalVolume,
        totalSets: totalSetsCount
      };

      await saveWorkoutLog(workoutLog);
      
      alert("Workout log saved successfully!");
      navigate('/');
    } catch (e) {
      console.error("Failed to save workout log:", e);
      alert("Error saving log.");
    }
  };

  const handleQuitWorkout = () => {
    if (window.confirm("Are you sure you want to quit this workout? Your current progress will be lost.")) {
      navigate('/');
    }
  };

  return (
    <div className={`${styles.activeWorkoutPage} page stagger`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleCol}>
          <h1 className={styles.workoutName}>{workoutData.name}</h1>
          <div className={styles.timerRow}>
            <Clock size={16} className={styles.timerIcon} />
            <span className={styles.timeValue}>{formatTimer(elapsedTime)}</span>
          </div>
        </div>

        <button className="btn btn--ghost btn--icon" onClick={handleQuitWorkout}>
          <X size={20} />
        </button>
      </header>

      {/* Exercises List */}
      <div className={styles.exercisesList}>
        {exercises.map((ex, exIdx) => {
          const allCompleted = ex.sets.length > 0 && ex.sets.every(s => s.completed);
          
          return (
            <div 
              key={exIdx} 
              className={`${styles.exerciseCard} card ${allCompleted ? styles.completedCard : ''}`}
            >
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.exMeta}>
                  <h3 className={styles.exName}>{ex.name}</h3>
                  <div className={styles.badges}>
                    {ex.muscleGroup && <span className="badge badge--accent">{ex.muscleGroup}</span>}
                    {ex.equipment && <span className="badge badge--blue">{ex.equipment}</span>}
                    {(ex.youtubeUrl || getExerciseVideoUrl(ex.name)) && (
                      <a
                        href={ex.youtubeUrl || getExerciseVideoUrl(ex.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.tutorialBadge} badge badge--amber`}
                      >
                        <Play size={10} fill="currentColor" style={{ marginRight: '4px' }} /> Tutorial
                      </a>
                    )}
                  </div>
                </div>

                <button className="btn btn--ghost btn--icon" onClick={() => handleToggleNote(exIdx)}>
                  {ex.isNotesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Collapsible notes */}
              {ex.isNotesExpanded && ex.notes && (
                <p className={styles.notesBox}>
                  <strong>Notes:</strong> {ex.notes}
                </p>
              )}

              {/* Sets Table */}
              <table className={styles.setsTable}>
                <thead>
                  <tr>
                    <th>SET</th>
                    <th>PREV</th>
                    <th>KG</th>
                    <th>REPS</th>
                    <th>TIME</th>
                    <th>✓</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((set, setIdx) => {
                    let displayTime = '—';
                    if (set.completed) {
                      displayTime = set.duration ? `${set.duration}s` : '—';
                    } else if (set.isTimerRunning) {
                      const elapsed = set.timerStartTime ? Math.floor((Date.now() - set.timerStartTime) / 1000) : 0;
                      displayTime = `${elapsed}s`;
                    } else if (set.duration) {
                      displayTime = `${set.duration}s`;
                    }

                    return (
                      <tr key={setIdx} className={set.completed ? styles.completedRow : ''}>
                        <td className={styles.setNum}>{setIdx + 1}</td>
                        <td className={styles.prevText}>{previousData[ex.name] || '—'}</td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            className={`${styles.setValInput} input`}
                            value={set.weight || ''}
                            placeholder="0"
                            disabled={set.completed}
                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={`${styles.setValInput} input`}
                            value={set.reps || ''}
                            placeholder="0"
                            disabled={set.completed}
                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <div className={styles.setTimerCell}>
                            <span className={set.isTimerRunning ? styles.runningTimer : ''}>{displayTime}</span>
                            {!set.completed && (
                              <button
                                className={styles.setTimerBtn}
                                onClick={() => set.isTimerRunning ? handleStopSetTimer(exIdx, setIdx) : handleStartSetTimer(exIdx, setIdx)}
                              >
                                {set.isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className={`checkbox ${set.completed ? 'checkbox--checked' : ''}`}
                            onClick={() => handleToggleCompleted(exIdx, setIdx)}
                          >
                            {set.completed && <Check size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <button 
                className={`${styles.addSetBtn} btn btn--ghost btn--sm btn--full`}
                onClick={() => handleAddSet(exIdx)}
              >
                <Plus size={14} /> Add Set
              </button>
            </div>
          );
        })}

        {/* Add Custom Exercise to Session */}
        <div style={{ marginTop: '1.5rem', paddingBottom: '2.5rem' }}>
          <button 
            className="btn btn--secondary btn--full"
            onClick={() => setShowAddExModal(true)}
          >
            <Plus size={16} /> Add Exercise to Session
          </button>
        </div>
      </div>

      {/* Bottom Finish Action Bar */}
      <div className={styles.actionBar}>
        <button 
          className="btn btn--primary btn--full" 
          disabled={!isAnySetCompleted()}
          onClick={handleFinishWorkout}
        >
          Finish Workout
        </button>
      </div>

      {/* Rest Timer Modal Overlay */}
      <RestTimer 
        isVisible={isRestTimerVisible}
        initialDuration={restDuration}
        onComplete={handleRestTimerComplete}
        onSkip={handleRestTimerSkip}
      />

      {/* Workout Summary Overlay */}
      {showSummary && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-handle" />
            
            <div className={styles.summaryHeader}>
              <h2 className={styles.summaryTitle}>Workout Completed!</h2>
              <p className={styles.summarySubtitle}>Great session! Here is your breakdown:</p>
            </div>

            <div className={styles.summaryStats}>
              <div className={styles.summaryStatCard}>
                <span className={styles.summaryVal}>{formatTimer(elapsedTime)}</span>
                <span className={styles.summaryLbl}>Duration</span>
              </div>
              <div className={styles.summaryStatCard}>
                <span className={styles.summaryVal}>{totalSetsCount}</span>
                <span className={styles.summaryLbl}>Total Sets</span>
              </div>
              <div className={styles.summaryStatCard}>
                <span className={styles.summaryVal}>{totalVolume.toLocaleString()} kg</span>
                <span className={styles.summaryLbl}>Total Volume</span>
              </div>
            </div>

            {/* Personal Records Highlight */}
            {newPRs.length > 0 && (
              <div className={styles.prBox}>
                <div className={styles.prHeader}>
                  <Trophy className={styles.prIcon} size={20} />
                  <span>{newPRs.length} Personal Records Hit!</span>
                </div>
                <div className={styles.prList}>
                  {newPRs.map((name, idx) => (
                    <div key={idx} className={styles.prItem}>
                      <Trophy size={14} className={styles.prItemIcon} />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn--primary btn--full" onClick={handleSaveAndExit}>
              Save & Exit
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddExModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-handle" />
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Exercise to Session</h3>
              <button className="btn btn--ghost btn--icon" onClick={() => setShowAddExModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <input
                type="text"
                className="input"
                placeholder="Search exercises..."
                value={exSearchQuery}
                onChange={(e) => setExSearchQuery(e.target.value)}
              />
              <div className={styles.searchSelectionList}>
                {MASTER_EXERCISES.filter(ex => ex.name.toLowerCase().includes(exSearchQuery.toLowerCase())).slice(0, 10).map((ex) => (
                  <div 
                    key={ex.name} 
                    className={styles.selectionItem}
                    onClick={() => handleAddCustomExercise(ex)}
                  >
                    <div className={styles.selMeta}>
                      <span className={styles.selExName}>{ex.name}</span>
                      <span className={styles.selExSub}>{ex.muscleGroup} • {ex.equipment}</span>
                    </div>
                    <Plus size={16} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
