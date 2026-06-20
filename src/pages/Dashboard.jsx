import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, TrendingUp, ChevronRight, Play, Calendar, Clock, Award, Zap, CheckCircle2, Star } from 'lucide-react';
import { getAllWorkoutLogs, getSetting, getAllPersonalRecords } from '../store/db';
import { computeXP, levelFromXP } from '../lib/fitness';
import { useSettings } from '../store/SettingsContext';
import styles from './Dashboard.module.css';

const MOTIVATIONAL_QUOTES = [
  "No citizen has a right to be an amateur in the matter of physical training. - Socrates",
  "The only bad workout is the one that didn't happen.",
  "Strength does not come from physical capacity. It comes from an indomitable will. - Mahatma Gandhi",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "Action is the foundational key to all success. - Pablo Picasso",
  "Energy and persistence conquer all things. - Benjamin Franklin",
  "It never gets easier, you just get better.",
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "Success isn't always about greatness. It's about consistency.",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit. - Aristotle",
  "What hurts today makes you stronger tomorrow.",
  "Focus on the goal, not the obstacle.",
  "Don't count the days, make the days count. - Muhammad Ali"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { weightUnit } = useSettings();
  const [quote, setQuote] = useState('');
  const [stats, setStats] = useState({ weeklyCount: 0, streak: 0, weeklyVolume: 0 });
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, target: 0, pct: 0 });
  const [trainedToday, setTrainedToday] = useState(false);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Select a quote based on day of month
    const day = new Date().getDate();
    setQuote(MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length]);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const logs = await getAllWorkoutLogs();
      setRecentLogs(logs.slice(0, 5));

      // Level / XP (gamification)
      try {
        const prs = await getAllPersonalRecords();
        setLevel(levelFromXP(computeXP(logs, prs.length)));
      } catch (e) { /* non-fatal */ }

      // Calculate stats (weekly workouts, volume, streak)
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      let weeklyCount = 0;
      let weeklyVolume = 0;
      
      logs.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate >= oneWeekAgo) {
          weeklyCount++;
          weeklyVolume += log.totalVolume || 0;
        }
      });

      // Simple streak calculation
      let streak = 0;
      const sortedDates = logs
        .map(l => l.date)
        .filter((value, index, self) => self.indexOf(value) === index) // unique dates
        .sort((a, b) => new Date(b) - new Date(a)); // newest first

      if (sortedDates.length > 0) {
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 0; i < sortedDates.length - 1; i++) {
            const current = new Date(sortedDates[i]);
            const next = new Date(sortedDates[i + 1]);
            const diffTime = Math.abs(current - next);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      setStats({ weeklyCount, streak, weeklyVolume });

      // Did we already train today?
      const todayStr = now.toISOString().split('T')[0];
      setTrainedToday(logs.some(l => l.date === todayStr));

      // Load active plan
      const plan = await getSetting('activePlan');
      if (plan) {
        setActivePlan(plan);
        determineTodayWorkout(plan, logs);

        // Real weekly progress: scheduled workout days vs sessions done this week
        const target = Object.values(plan.weeklySchedule || {}).filter(
          d => d && d.type !== 'rest' && (d.exercises?.length > 0)
        ).length;
        const pct = target > 0 ? Math.min(100, Math.round((weeklyCount / target) * 100)) : 0;
        setWeeklyProgress({ completed: weeklyCount, target, pct });
      }
    } catch (e) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const determineTodayWorkout = (plan, logs) => {
    // Determine which workout is scheduled for today
    const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayName = daysOfWeek[new Date().getDay()];
    
    // Check if the plan has a weekly schedule
    if (plan.weeklySchedule && plan.weeklySchedule[todayName]) {
      const scheduledDay = plan.weeklySchedule[todayName];
      if (scheduledDay.type !== 'rest') {
        setTodayWorkout(scheduledDay);
      }
    }
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const handleStartWorkout = () => {
    if (todayWorkout) {
      navigate('/workout', { state: { workout: todayWorkout, planDay: todayWorkout } });
    }
  };

  if (loading) {
    return (
      <div className={`${styles.dashboard} page`}>
        <div className="empty-state">
          <Clock size={40} className="animate-spin" />
          <h3>Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboard} page stagger`}>
      {/* Header Greeting */}
      <header className={styles.header}>
        <div>
          <span className={styles.dateLabel}>{formatDate()}</span>
          <h1 className={styles.greeting}>{getGreeting()}</h1>
        </div>
        <div className={styles.avatar}>
          <Flame size={20} className={styles.flameIcon} />
        </div>
      </header>

      {/* Motivational Quote */}
      <div className={`${styles.quoteCard} card`}>
        <p className={styles.quoteText}>"{quote}"</p>
      </div>

      {/* Level / XP */}
      {level && (
        <div className={`${styles.levelCard} card`} onClick={() => navigate('/achievements')}>
          <div className={styles.levelBadge}>
            <Star size={16} fill="currentColor" />
            <span>{level.level}</span>
          </div>
          <div className={styles.levelBody}>
            <div className={styles.levelRow}>
              <span className={styles.levelTitle}>{level.title}</span>
              <span className={styles.levelXp}>Lv {level.level}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${level.progressPct}%` }} />
            </div>
          </div>
          <ChevronRight size={18} className={styles.levelChev} />
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid section">
        <div className="stat-card card">
          <div className={styles.statIconWrapper}>
            <Dumbbell size={18} className={styles.dumbbellIcon} />
          </div>
          <span className="stat-card__value">{stats.weeklyCount}</span>
          <span className="stat-card__label">This Week</span>
        </div>
        
        <div className="stat-card card">
          <div className={styles.statIconWrapper}>
            <Flame size={18} className={styles.streakIcon} />
          </div>
          <span className="stat-card__value">{stats.streak}d</span>
          <span className="stat-card__label">Streak</span>
        </div>

        <div className="stat-card card">
          <div className={styles.statIconWrapper}>
            <TrendingUp size={18} className={styles.volumeIcon} />
          </div>
          <span className="stat-card__value">
            {stats.weeklyVolume > 1000
              ? `${(stats.weeklyVolume / 1000).toFixed(1)}k`
              : stats.weeklyVolume} {weightUnit}
          </span>
          <span className="stat-card__label">Volume</span>
        </div>
      </div>

      {/* Today's Workout */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Today's Session</h2>
        </div>
        
        {todayWorkout ? (
          <div className={`${styles.workoutCard} card card--accent`}>
            <div className={styles.workoutInfo}>
              <div className={styles.workoutHeaderRow}>
                <span className={styles.workoutName}>{todayWorkout.name}</span>
                {trainedToday ? (
                  <span className="badge badge--success"><CheckCircle2 size={12} /> Done</span>
                ) : (
                  <span className="badge badge--accent">{todayWorkout.type}</span>
                )}
              </div>
              <p className={styles.workoutDuration}>
                <Clock size={14} /> {todayWorkout.estimatedDuration || 45} mins
              </p>
              
              <div className={styles.exercisePreview}>
                {todayWorkout.exercises && todayWorkout.exercises.slice(0, 3).map((ex, idx) => (
                  <span key={idx} className={styles.previewTag}>
                    {ex.name}
                  </span>
                ))}
                {todayWorkout.exercises && todayWorkout.exercises.length > 3 && (
                  <span className={styles.previewTagMuted}>
                    +{todayWorkout.exercises.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            <button className="btn btn--primary btn--full" onClick={handleStartWorkout}>
              <Play size={16} fill="currentColor" /> {trainedToday ? 'Train Again' : 'Start Workout'}
            </button>
          </div>
        ) : (
          <div className={`${styles.noWorkoutCard} card`}>
            <Calendar size={32} className={styles.calendarIcon} />
            <p className={styles.noWorkoutText}>
              {activePlan
                ? (trainedToday ? "Rest day — nice work today!" : "Rest day! Time to recover.")
                : "No active program plan configured."}
            </p>
            <div className={styles.noWorkoutActions}>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => navigate('/plan')}
              >
                {activePlan ? "Manage Plan" : "Create a Plan"}
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/workout', { state: { workout: { name: 'Freestyle Session', exercises: [] } } })}
              >
                <Zap size={14} fill="currentColor" /> Quick Session
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Active Plan Progress */}
      {activePlan && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Plan Progress</h2>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/active-plan')}>
              View Full Plan
            </button>
          </div>
          <div className={`${styles.progressCard} card`} onClick={() => navigate('/active-plan')} style={{ cursor: 'pointer' }}>
            <div className={styles.progressHeader}>
              <span className={styles.planName}>{activePlan.name}</span>
              <span className={styles.progressPct}>
                {weeklyProgress.pct}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar__fill"
                style={{ width: `${weeklyProgress.pct}%` }}
              />
            </div>
            <span className={styles.progressCaption}>
              {weeklyProgress.completed} of {weeklyProgress.target || '—'} sessions this week
            </span>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Recent Activity</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/history')}>
            View All
          </button>
        </div>
        
        {recentLogs.length > 0 ? (
          <div className={styles.activityList}>
            {recentLogs.map((log) => (
              <div 
                key={log.id} 
                className={`${styles.activityItem} card`}
                onClick={() => navigate(`/history`)}
              >
                <div className={styles.activityMeta}>
                  <span className={styles.activityName}>{log.name}</span>
                  <span className={styles.activityDate}>
                    {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className={styles.activityDetails}>
                  <span>{log.duration} mins</span>
                  <span>•</span>
                  <span>{log.exercises?.length || 0} exercises</span>
                  <ChevronRight size={16} className={styles.chevron} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Award size={32} />
            <h3>No workouts logged yet</h3>
            <p>Complete your first workout to see it here!</p>
          </div>
        )}
      </section>
    </div>
  );
}
