import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ChevronDown, ChevronRight, Clock, Dumbbell,
  Play, Pencil, Trash2, ArrowLeft, Flame, Info
} from 'lucide-react';
import { getSetting, setSetting } from '../store/db';
import { useToast } from '../components/Toast';
import styles from './ActivePlan.module.css';

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export default function ActivePlan() {
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const [plan, setPlan] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const activePlan = await getSetting('activePlan');
      setPlan(activePlan || null);

      // Auto-expand today's day
      if (activePlan) {
        const todayKey = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key;
        setExpandedDays({ [todayKey]: true });
      }
    } catch (e) {
      console.error('Failed to load active plan:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (key) => {
    setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all = {};
    DAYS_OF_WEEK.forEach(d => { all[d.key] = true; });
    setExpandedDays(all);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  const handleStartDay = (dayData) => {
    navigate('/workout', { state: { workout: dayData, planDay: dayData } });
  };

  const handleDeactivatePlan = async () => {
    const ok = await confirm({
      title: 'Deactivate plan?',
      message: 'This will remove your current active plan. You can always set a new one from the Plan Builder.',
      confirmLabel: 'Deactivate',
      danger: true,
    });
    if (!ok) return;
    try {
      await setSetting('activePlan', null);
      setPlan(null);
      toast('Plan deactivated.', 'success');
    } catch (e) {
      toast('Failed to deactivate plan.', 'error');
    }
  };

  const getTodayKey = () => {
    const jsDay = new Date().getDay(); // 0 = Sun
    return DAYS_OF_WEEK[jsDay === 0 ? 6 : jsDay - 1].key;
  };

  const todayKey = getTodayKey();

  // Count workout days vs rest days
  const workoutDays = plan
    ? DAYS_OF_WEEK.filter(d => {
        const day = plan.weeklySchedule?.[d.key];
        return day && day.type !== 'rest' && day.exercises?.length > 0;
      }).length
    : 0;

  const totalExercises = plan
    ? DAYS_OF_WEEK.reduce((sum, d) => {
        const day = plan.weeklySchedule?.[d.key];
        return sum + (day?.exercises?.length || 0);
      }, 0)
    : 0;

  if (loading) {
    return (
      <div className={`${styles.activePlan} page`}>
        <div className="empty-state">
          <Clock size={40} className="animate-spin" />
          <h3>Loading plan...</h3>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={`${styles.activePlan} page stagger`}>
        <header className={styles.header}>
          <h1 className="page-title">My Active Plan</h1>
        </header>
        <div className="empty-state card">
          <Calendar size={40} />
          <h3>No active plan</h3>
          <p>Create or activate a plan to see your full weekly schedule here.</p>
          <button className="btn btn--primary" onClick={() => navigate('/plan')}>
            Go to Plan Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.activePlan} page stagger`}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className="page-title">My Active Plan</h1>
          <p className="page-subtitle">Full weekly overview of your current program</p>
        </div>
      </header>

      {/* Plan Info Card */}
      <div className={`${styles.planInfoCard} card`}>
        <div className={styles.planInfoTop}>
          <div className={styles.planIcon}>
            <Flame size={22} />
          </div>
          <div className={styles.planMeta}>
            <h2 className={styles.planName}>{plan.name}</h2>
            <span className={styles.planType}>
              {plan.type === 'program' ? 'Full Program' :
               plan.type === 'hybrid' ? 'Hybrid Split' :
               plan.type === 'custom' ? 'Custom Plan' : plan.type}
            </span>
          </div>
        </div>

        <div className={styles.planStats}>
          <div className={styles.planStat}>
            <span className={styles.planStatValue}>{workoutDays}</span>
            <span className={styles.planStatLabel}>Workout Days</span>
          </div>
          <div className={styles.planStat}>
            <span className={styles.planStatValue}>{7 - workoutDays}</span>
            <span className={styles.planStatLabel}>Rest Days</span>
          </div>
          <div className={styles.planStat}>
            <span className={styles.planStatValue}>{totalExercises}</span>
            <span className={styles.planStatLabel}>Total Exercises</span>
          </div>
        </div>

        <div className={styles.planActions}>
          <button className="btn btn--secondary btn--sm" onClick={() => navigate('/plan')}>
            <Pencil size={14} /> Edit Plan
          </button>
          <button className="btn btn--ghost btn--sm text-danger" onClick={handleDeactivatePlan}>
            <Trash2 size={14} /> Deactivate
          </button>
        </div>
      </div>

      {/* Expand/Collapse Controls */}
      <div className={styles.expandControls}>
        <span className={styles.weekTitle}>Weekly Schedule</span>
        <div className={styles.expandBtns}>
          <button className="btn btn--ghost btn--sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn--ghost btn--sm" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Day-by-Day Breakdown */}
      <div className={styles.daysList}>
        {DAYS_OF_WEEK.map((dayInfo) => {
          const dayData = plan.weeklySchedule?.[dayInfo.key];
          const isRest = !dayData || dayData.type === 'rest' || !dayData.exercises?.length;
          const isExpanded = !!expandedDays[dayInfo.key];
          const isToday = dayInfo.key === todayKey;

          return (
            <div
              key={dayInfo.key}
              className={`${styles.dayCard} card ${isToday ? styles.todayCard : ''} ${isExpanded ? styles.expandedCard : ''}`}
            >
              {/* Day Header */}
              <div
                className={styles.dayHeader}
                onClick={() => !isRest && toggleDay(dayInfo.key)}
              >
                <div className={styles.dayLeft}>
                  <div className={`${styles.dayBadge} ${isToday ? styles.todayBadge : ''} ${isRest ? styles.restBadge : ''}`}>
                    {dayInfo.short}
                  </div>
                  <div className={styles.dayInfo}>
                    <span className={styles.dayName}>
                      {isRest ? 'Rest Day' : dayData.name}
                    </span>
                    {!isRest && (
                      <span className={styles.dayMeta}>
                        {dayData.exercises.length} exercises
                        {dayData.estimatedDuration ? ` · ${dayData.estimatedDuration} min` : ''}
                      </span>
                    )}
                    {isToday && <span className={styles.todayTag}>Today</span>}
                  </div>
                </div>

                <div className={styles.dayRight}>
                  {!isRest && (
                    <>
                      <button
                        className="btn btn--primary btn--sm btn--icon"
                        title="Start this workout"
                        onClick={(e) => { e.stopPropagation(); handleStartDay(dayData); }}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button className="btn btn--ghost btn--icon">
                        <ChevronDown
                          size={18}
                          className={isExpanded ? styles.rotated : ''}
                        />
                      </button>
                    </>
                  )}
                  {isRest && (
                    <Info size={16} className={styles.restIcon} />
                  )}
                </div>
              </div>

              {/* Exercise Preview (collapsed) */}
              {!isExpanded && !isRest && (
                <div className={styles.exercisePreview}>
                  {dayData.exercises.slice(0, 4).map((ex, idx) => (
                    <span key={idx} className={styles.previewTag}>{ex.name}</span>
                  ))}
                  {dayData.exercises.length > 4 && (
                    <span className={styles.previewTagMore}>+{dayData.exercises.length - 4}</span>
                  )}
                </div>
              )}

              {/* Full Exercise List (expanded) */}
              {isExpanded && !isRest && (
                <div className={styles.exerciseList}>
                  <div className="divider" />
                  {dayData.exercises.map((ex, idx) => (
                    <div key={idx} className={styles.exerciseItem}>
                      <div className={styles.exerciseNum}>{idx + 1}</div>
                      <div className={styles.exerciseDetails}>
                        <span className={styles.exerciseName}>{ex.name}</span>
                        <div className={styles.exerciseMeta}>
                          <span className={styles.exerciseSets}>{ex.sets} sets × {ex.reps} reps</span>
                          {ex.rest && <span className={styles.exerciseRest}>Rest: {ex.rest}</span>}
                          {ex.rpe && <span className={styles.exerciseRpe}>RPE {ex.rpe}</span>}
                        </div>
                        {ex.notes && (
                          <p className={styles.exerciseNotes}>{ex.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
