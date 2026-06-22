import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Clock, Calendar, ChevronRight, ChevronDown, Zap, Target, ArrowLeft, Plus, Play, Info, Award } from 'lucide-react';
import { btrProgram } from '../data/btrProgram';
import { nippardProgram } from '../data/nippardProgram';
import { hybridProgram } from '../data/hybridProgram';
import { nippard_fundamentals } from '../data/fundamentalsProgram';
import { nippard_essentials } from '../data/essentialsProgram';
import { savePlan, setSetting } from '../store/db';
import { getExerciseVideoUrl } from '../data/exerciseVideos';
import { useToast } from '../components/Toast';
import styles from './Programs.module.css';

export default function Programs() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  
  // Program Details State
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPhase, setSelectedPhase] = useState(0); // For BTR program
  const [expandedDays, setExpandedDays] = useState({}); // dayNumber -> boolean

  // Get active program
  const getActiveProgram = () => {
    if (programId === 'beyond-the-rim') return btrProgram;
    if (programId === 'nippard-powerbuilding') return nippardProgram;
    if (programId === 'hybrid-powerbuilding-jump') return hybridProgram;
    if (programId === 'nippard-fundamentals') return nippard_fundamentals;
    if (programId === 'nippard-essentials') return nippard_essentials;
    return null;
  };

  const activeProgram = getActiveProgram();

  useEffect(() => {
    // Reset selection on program change
    if (activeProgram) {
      if (activeProgram.id === 'beyond-the-rim') {
        setSelectedPhase(0); // Default to Phase 0
        setSelectedWeek(1);
      } else {
        setSelectedWeek(1);
      }
      setExpandedDays({});
    }
  }, [programId]);

  const toggleDayExpand = (dayNum) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  const handleStartFullProgram = async () => {
    if (!activeProgram) return;

    const ok = await confirm({
      title: 'Activate program?',
      message: `Set "${activeProgram.name}" as your active workout program?`,
      confirmLabel: 'Activate',
    });
    if (ok) {
      try {
        // Construct the weekly schedule mapping based on the program structure
        // We'll generate a standard plan object
        const newPlan = {
          id: `plan-${activeProgram.id}`,
          name: activeProgram.name,
          type: 'program',
          programId: activeProgram.id,
          startDate: new Date().toISOString().split('T')[0],
          currentWeek: 1,
          currentPhase: activeProgram.phases ? 0 : undefined,
          progressPct: 0,
          createdAt: Date.now(),
          weeklySchedule: {}
        };

        // Get the first week's workouts to populate today's session preview
        // For BTR, we map Days 1-7. For Nippard, Days 1-5 or 1-6.
        let days = [];
        if (activeProgram.id === 'beyond-the-rim') {
          // BTR Phase 0 or 1 Week 1
          const phase = activeProgram.phases.find(p => p.phaseNumber === 0) || activeProgram.phases[0];
          const week = phase.weeks[0];
          days = week.days;
        } else {
          // Nippard Week 1
          const week = activeProgram.weeks[0];
          days = week.days;
        }

        // Map days to week schedule keys (mon, tue, wed, etc.)
        const weekDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach((day, index) => {
          if (index < weekDayKeys.length) {
            newPlan.weeklySchedule[weekDayKeys[index]] = {
              name: day.name,
              type: day.type || 'main',
              exercises: day.exercises || [],
              estimatedDuration: day.estimatedDuration || 45,
              dayNumber: day.dayNumber,
              programId: activeProgram.id
            };
          }
        });

        // Save plan in database and set as active plan
        await savePlan(newPlan);
        await setSetting('activePlan', newPlan);

        toast(`"${activeProgram.name}" activated! Today's session is loaded.`, 'success');
        navigate('/');
      } catch (err) {
        console.error("Failed to start program plan:", err);
        toast('Failed to activate program.', 'error');
      }
    }
  };

  const handleStartWorkoutDay = (day) => {
    // Carry the program id so the session is correctly labelled in history.
    const workout = { ...day, programId: day.programId || activeProgram?.id };
    navigate('/workout', { state: { workout, planDay: workout } });
  };

  // List view of both programs
  if (!programId) {
    return (
      <div className={`${styles.programsPage} page stagger`}>
        <header className={styles.header}>
          <h1 className="page-title">Training Programs</h1>
          <p className="page-subtitle">Pre-loaded training routines from expert programs</p>
        </header>

        <div className={styles.programList}>
          {/* Beyond The Rim */}
          <div className={`${styles.programCard} card ${styles.btrCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.programTitle}>{btrProgram.name}</h2>
              <span className={styles.author}>by {btrProgram.author}</span>
            </div>
            
            <p className={styles.description}>
              {btrProgram.description}
            </p>

            <div className={styles.metaBadges}>
              <span className="badge badge--accent">
                <Calendar size={12} /> {btrProgram.duration}
              </span>
              <span className="badge badge--accent">
                <Dumbbell size={12} /> 7 Days/Week
              </span>
              <span className="badge badge--accent">
                <Target size={12} /> Vert Jump
              </span>
            </div>

            <button 
              className="btn btn--primary btn--full"
              onClick={() => navigate(`/programs/${btrProgram.id}`)}
            >
              View Program Details <ChevronRight size={16} />
            </button>
          </div>

          {/* Jeff Nippard Powerbuilding */}
          <div className={`${styles.programCard} card ${styles.nippardCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.programTitle}>{nippardProgram.name}</h2>
              <span className={styles.author}>by {nippardProgram.author}</span>
            </div>

            <p className={styles.description}>
              An elite training system fusing science-based hypertrophy techniques with explosive strength training.
            </p>

            <div className={styles.metaBadges}>
              <span className="badge badge--blue">
                <Calendar size={12} /> {nippardProgram.duration}
              </span>
              <span className="badge badge--blue">
                <Dumbbell size={12} /> 5-6 Days/Week
              </span>
              <span className="badge badge--blue">
                <Target size={12} /> Powerbuilding
              </span>
            </div>

            <button 
              className="btn btn--secondary btn--full"
              style={{ borderColor: 'var(--accent-secondary)' }}
              onClick={() => navigate(`/programs/${nippardProgram.id}`)}
            >
              View Program Details <ChevronRight size={16} />
            </button>
          </div>

          {/* Jeff Nippard Fundamentals */}
          <div className={`${styles.programCard} card ${styles.nippardCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.programTitle}>{nippard_fundamentals.name}</h2>
              <span className={styles.author}>by {nippard_fundamentals.author}</span>
            </div>

            <p className={styles.description}>
              An evidence-based hypertrophy program designed to build a solid foundation of muscle and strength. Perfect for beginners.
            </p>

            <div className={styles.metaBadges}>
              <span className="badge badge--blue">
                <Calendar size={12} /> {nippard_fundamentals.duration}
              </span>
              <span className="badge badge--blue">
                <Dumbbell size={12} /> 4 Days/Week
              </span>
              <span className="badge badge--blue">
                <Target size={12} /> Hypertrophy
              </span>
            </div>

            <button 
              className="btn btn--secondary btn--full"
              style={{ borderColor: 'var(--accent-secondary)' }}
              onClick={() => navigate(`/programs/${nippard_fundamentals.id}`)}
            >
              View Program Details <ChevronRight size={16} />
            </button>
          </div>

          {/* Jeff Nippard Essentials */}
          <div className={`${styles.programCard} card ${styles.nippardCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.programTitle}>{nippard_essentials.name}</h2>
              <span className={styles.author}>by {nippard_essentials.author}</span>
            </div>

            <p className={styles.description}>
              Designed for maximum efficiency in 45 mins or less. High intensity, low volume minimalist workouts.
            </p>

            <div className={styles.metaBadges}>
              <span className="badge badge--blue">
                <Calendar size={12} /> {nippard_essentials.duration}
              </span>
              <span className="badge badge--blue">
                <Dumbbell size={12} /> 3 Days/Week
              </span>
              <span className="badge badge--blue">
                <Target size={12} /> Minimalist
              </span>
            </div>

            <button 
              className="btn btn--secondary btn--full"
              style={{ borderColor: 'var(--accent-secondary)' }}
              onClick={() => navigate(`/programs/${nippard_essentials.id}`)}
            >
              View Program Details <ChevronRight size={16} />
            </button>
          </div>

          {/* Hybrid Program */}
          <div className={`${styles.programCard} card ${styles.hybridCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.programTitle}>{hybridProgram.name}</h2>
              <span className={styles.author}>by {hybridProgram.author}</span>
            </div>

            <p className={styles.description}>
              {hybridProgram.description}
            </p>

            <div className={styles.metaBadges}>
              <span className="badge badge--success">
                <Calendar size={12} /> {hybridProgram.duration}
              </span>
              <span className="badge badge--success">
                <Dumbbell size={12} /> 6 Days/Week
              </span>
              <span className="badge badge--success">
                <Target size={12} /> Strength & Jump
              </span>
            </div>

            <button 
              className="btn btn--secondary btn--full"
              style={{ borderColor: 'var(--success)' }}
              onClick={() => navigate(`/programs/${hybridProgram.id}`)}
            >
              View Program Details <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Program Detail View
  if (!activeProgram) {
    return (
      <div className="page empty-state">
        <Dumbbell size={40} />
        <h3>Program not found</h3>
        <button className="btn btn--secondary" onClick={() => navigate('/programs')}>
          Back to Programs
        </button>
      </div>
    );
  }

  const isBTR = activeProgram.id === 'beyond-the-rim';
  
  // Get active lists of weeks/phases
  let weeksList = [];
  let daysList = [];

  if (isBTR) {
    const currentPhaseData = activeProgram.phases.find(p => p.phaseNumber === selectedPhase);
    if (currentPhaseData) {
      weeksList = currentPhaseData.weeks;
      const currentWeekData = weeksList.find(w => w.weekNumber === selectedWeek);
      if (currentWeekData) {
        daysList = currentWeekData.days;
      }
    }
  } else {
    // Nippard
    weeksList = activeProgram.weeks;
    const currentWeekData = weeksList.find(w => w.weekNumber === selectedWeek);
    if (currentWeekData) {
      daysList = currentWeekData.days;
    }
  }

  return (
    <div className={`${styles.detailPage} page stagger`}>
      <button className={`${styles.backBtn} btn btn--ghost btn--sm`} onClick={() => navigate('/programs')}>
        <ArrowLeft size={16} /> Back to Programs
      </button>

      {/* Program Info Header */}
      <header className={styles.detailHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.detailTitle}>{activeProgram.name}</h1>
          <span className={styles.detailAuthor}>By {activeProgram.author}</span>
          <p className={styles.detailDesc}>{activeProgram.description}</p>
        </div>

        <button 
          className={`btn btn--primary ${styles.startBtn}`}
          onClick={handleStartFullProgram}
        >
          <Play size={16} fill="currentColor" /> Start Full Program
        </button>
      </header>

      {/* Phase / Week Selector Navigation */}
      {isBTR && (
        <div className={styles.phaseSelector}>
          <span className={styles.selectorLabel}>Phase:</span>
          <div className={styles.phasePills}>
            {activeProgram.phases.map(phase => (
              <button
                key={phase.phaseNumber}
                className={`${styles.phasePill} ${selectedPhase === phase.phaseNumber ? styles.activePhase : ''}`}
                onClick={() => {
                  setSelectedPhase(phase.phaseNumber);
                  setSelectedWeek(1); // Reset to week 1 of phase
                  setExpandedDays({});
                }}
              >
                P{phase.phaseNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.weekSelector}>
        <span className={styles.selectorLabel}>Week:</span>
        <div className={styles.weekScroll}>
          {weeksList.map(week => (
            <button
              key={week.weekNumber}
              className={`${styles.weekTab} ${selectedWeek === week.weekNumber ? styles.activeWeek : ''}`}
              onClick={() => {
                setSelectedWeek(week.weekNumber);
                setExpandedDays({});
              }}
            >
              W{week.weekNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Days List */}
      <section className={styles.daysSection}>
        <div className="section__header">
          <h2 className="section__title">
            {isBTR 
              ? `Phase ${selectedPhase} • Week ${selectedWeek} Workouts` 
              : `Week ${selectedWeek} Workouts`
            }
          </h2>
        </div>

        <div className={styles.daysList}>
          {daysList.map((day) => {
            const isExpanded = !!expandedDays[day.dayNumber];
            const hasExercises = day.exercises && day.exercises.length > 0;
            const isRest = day.type === 'rest' || !hasExercises;

            return (
              <div 
                key={day.dayNumber} 
                className={`${styles.dayCard} card ${isExpanded ? styles.expandedCard : ''}`}
              >
                {/* Day Header Row */}
                <div 
                  className={styles.dayHeader} 
                  onClick={() => hasExercises && toggleDayExpand(day.dayNumber)}
                >
                  <div className={styles.dayTitleCol}>
                    <div className={styles.dayNumberBadge}>Day {day.dayNumber}</div>
                    <span className={styles.dayName}>{day.name}</span>
                  </div>

                  <div className={styles.dayActions}>
                    {!isRest && (
                      <button 
                        className="btn btn--sm btn--primary btn--icon"
                        title="Start Workout"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartWorkoutDay(day);
                        }}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                    )}
                    {hasExercises && (
                      <button className="btn btn--ghost btn--icon">
                        {isExpanded ? <ChevronDown size={18} className={styles.rotate180} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Preview (Brief summary of exercises if collapsed) */}
                {!isExpanded && !isRest && (
                  <div className={styles.collapsedPreview}>
                    {day.exercises.slice(0, 3).map((ex, exIdx) => (
                      <span key={exIdx} className={styles.smallExTag}>{ex.name}</span>
                    ))}
                    {day.exercises.length > 3 && (
                      <span className={styles.smallExTagMore}>+{day.exercises.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Rest Day view */}
                {isRest && (
                  <div className={styles.restDayContent}>
                    <Info size={16} className={styles.infoIcon} />
                    <p className={styles.restDayText}>
                      Rest day. Recommended: {day.exercises?.[0]?.name || "Perform light mobility, active recovery, or complete rest."}
                    </p>
                  </div>
                )}

                {/* Expandable Exercise Details */}
                {isExpanded && hasExercises && (
                  <div className={styles.expandedExercises}>
                    <div className="divider" />
                    <div className={styles.exerciseItems}>
                      {day.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className={styles.exerciseItem}>
                          <div className={styles.exerciseHeaderInfo}>
                            <h4 className={styles.exerciseName}>{ex.name}</h4>
                            <div className={styles.exerciseSubtitles}>
                              <span className={styles.exerciseSetsReps}>
                                {ex.sets} Sets × {ex.reps} Reps
                              </span>
                              {ex.rest && (
                                <span className={styles.exerciseRest}>
                                  • Rest: {ex.rest}
                                </span>
                              )}
                              {ex.rpe && (
                                <span className={styles.exerciseRpe}>
                                  • RPE: {ex.rpe}
                                </span>
                              )}
                            </div>
                            {(ex.youtubeUrl || getExerciseVideoUrl(ex.name)) && (
                              <a
                                href={ex.youtubeUrl || getExerciseVideoUrl(ex.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.tutorialLink}
                              >
                                <Play size={12} fill="currentColor" className={styles.videoIcon} /> Watch Tutorial
                              </a>
                            )}
                          </div>
                          {ex.notes && (
                            <p className={styles.exerciseNotes}>
                              <strong>Notes:</strong> {ex.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
