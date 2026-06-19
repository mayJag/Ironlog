import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, Dumbbell, Trash2, Award, ChevronDown, ChevronUp, Scale, Flame, Pencil, X, Check, Save } from 'lucide-react';
import { getAllWorkoutLogs, deleteWorkoutLog, getAllPersonalRecords, saveWorkoutLog } from '../store/db';
import { volumeFromSets } from '../lib/fitness';
import { useSettings } from '../store/SettingsContext';
import { useToast } from '../components/Toast';
import styles from './History.module.css';

export default function History() {
  const navigate = useNavigate();
  const { weightUnit } = useSettings();
  const { confirm } = useToast();
  const [logs, setLogs] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
  const [expandedLogs, setExpandedLogs] = useState({}); // id -> boolean
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, avgDuration: 0, topDay: 'N/A' });
  const [editingLog, setEditingLog] = useState(null); // deep-copied log being edited

  useEffect(() => {
    loadHistoryData();
  }, [currentDate]);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      const allLogs = await getAllWorkoutLogs();
      setLogs(allLogs);
      
      const prs = await getAllPersonalRecords();
      setPersonalRecords(prs);

      calculateMonthlyStats(allLogs, currentDate);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (allLogs, date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthlyLogs = allLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getFullYear() === year && logDate.getMonth() === month;
    });

    // Average duration
    const totalDuration = monthlyLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
    const avgDuration = monthlyLogs.length > 0 ? Math.round(totalDuration / monthlyLogs.length) : 0;

    // Top day of the week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    monthlyLogs.forEach(log => {
      const day = new Date(log.date).getDay();
      dayCounts[day]++;
    });

    let maxIndex = 0;
    let maxCount = 0;
    dayCounts.forEach((count, index) => {
      if (count > maxCount) {
        maxCount = count;
        maxIndex = index;
      }
    });

    setMonthlyStats({
      total: monthlyLogs.length,
      avgDuration,
      topDay: maxCount > 0 ? daysOfWeek[maxIndex] : 'None'
    });
  };

  const toggleExpandLog = (id) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDeleteLog = async (id, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete this log?',
      message: 'This workout session will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      try {
        await deleteWorkoutLog(id);
        const updatedLogs = logs.filter(log => log.id !== id);
        setLogs(updatedLogs);
        calculateMonthlyStats(updatedLogs, currentDate);
      } catch (err) {
        console.error("Error deleting log:", err);
      }
    }
  };

  // --- Edit a logged workout ---
  const openEdit = (log, e) => {
    e.stopPropagation();
    setEditingLog(JSON.parse(JSON.stringify(log))); // deep copy so we can cancel
  };

  const editSetField = (exIdx, setIdx, field, value) => {
    setEditingLog(prev => {
      const next = { ...prev, exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) };
      })};
      return next;
    });
  };

  const handleSaveEdit = async () => {
    // Recompute totals from edited sets
    let totalVolume = 0;
    let totalSets = 0;
    for (const ex of editingLog.exercises) {
      const completed = (ex.sets || []).filter(s => s.completed);
      totalSets += completed.length;
      totalVolume += volumeFromSets(completed);
    }
    const updated = { ...editingLog, totalVolume, totalSets };
    try {
      await saveWorkoutLog(updated);
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
      calculateMonthlyStats(logs.map(l => l.id === updated.id ? updated : l), currentDate);
      setEditingLog(null);
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const startDayOfWeek = getFirstDayOfMonth(year, month);

    const todayStr = new Date().toISOString().split('T')[0];
    const days = [];

    // Empty cells before start day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Check if there is a workout logged on this date
      const hasWorkout = logs.some(log => log.date === dateStr);
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button
          key={day}
          className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
          onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
        >
          <span className={styles.dayNumber}>{day}</span>
          {hasWorkout && <span className={styles.workoutDot} />}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Filter logs based on selected date
  const filteredLogs = selectedDate 
    ? logs.filter(log => log.date === selectedDate) 
    : logs;

  return (
    <div className={`${styles.historyPage} page stagger`}>
      <header className={styles.header}>
        <h1 className="page-title">Activity History</h1>
        <p className="page-subtitle">Track your training consistency and records</p>
      </header>

      {/* Monthly Stats */}
      <div className="stats-grid section">
        <div className="stat-card card">
          <span className="stat-card__value">{monthlyStats.total}</span>
          <span className="stat-card__label">Sessions</span>
        </div>
        <div className="stat-card card">
          <span className="stat-card__value">{monthlyStats.avgDuration}m</span>
          <span className="stat-card__label">Avg Time</span>
        </div>
        <div className="stat-card card">
          <span className="stat-card__value text-truncate">{monthlyStats.topDay}</span>
          <span className="stat-card__label">Top Day</span>
        </div>
      </div>

      {/* Personal Records */}
      {personalRecords.length > 0 && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Personal Records</h2>
            <span className={styles.prCount}>{personalRecords.length} lifts</span>
          </div>
          <div className={styles.prGrid}>
            {personalRecords
              .slice()
              .sort((a, b) => (b.weight || 0) - (a.weight || 0))
              .map((pr) => (
                <div key={pr.exerciseName} className={`${styles.prCardItem} card`}>
                  <Award size={16} className={styles.prTrophy} />
                  <div className={styles.prInfo}>
                    <span className={styles.prName}>{pr.exerciseName}</span>
                    <span className={styles.prValue}>
                      {pr.weight} {weightUnit} × {pr.reps}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Calendar */}
      <section className="section card">
        <div className={styles.calendarHeader}>
          <h2 className={styles.calendarMonth}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className={styles.calendarNav}>
            <button className="btn btn--ghost btn--sm btn--icon" onClick={handlePrevMonth}>
              <ChevronLeft size={20} />
            </button>
            <button className="btn btn--ghost btn--sm btn--icon" onClick={handleNextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className={styles.weekDaysHeader}>
          <div>S</div>
          <div>M</div>
          <div>T</div>
          <div>W</div>
          <div>T</div>
          <div>F</div>
          <div>S</div>
        </div>

        <div className={styles.calendarGrid}>
          {renderCalendar()}
        </div>
      </section>

      {/* Workout Logs List */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">
            {selectedDate 
              ? `Logs for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` 
              : "All Logged Sessions"
            }
          </h2>
          {selectedDate && (
            <button className="btn btn--ghost btn--sm" onClick={() => setSelectedDate(null)}>
              Clear Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <Clock size={32} className="animate-spin" />
            <h3>Loading history...</h3>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className={styles.logList}>
            {filteredLogs.map((log) => {
              const isExpanded = !!expandedLogs[log.id];
              return (
                <div key={log.id} className={`${styles.logCard} card`}>
                  {/* Card Header (clickable to expand) */}
                  <div className={styles.logHeader} onClick={() => toggleExpandLog(log.id)}>
                    <div className={styles.logTitleCol}>
                      <h3 className={styles.logName}>{log.name}</h3>
                      <div className={styles.logSubInfo}>
                        <span className={styles.logDateStr}>
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {log.programName && (
                          <span className="badge badge--accent">{log.programName}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.logHeaderActions}>
                      <button
                        className="btn btn--ghost btn--icon"
                        title="Edit log"
                        onClick={(e) => openEdit(log, e)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className={`${styles.deleteBtn} btn btn--ghost`}
                        onClick={(e) => handleDeleteLog(log.id, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button className="btn btn--ghost btn--icon">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className={styles.logSummaryRow} onClick={() => toggleExpandLog(log.id)}>
                    <div className={styles.summaryItem}>
                      <Clock size={14} className={styles.summaryIcon} />
                      <span>{log.duration} mins</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <Dumbbell size={14} className={styles.summaryIcon} />
                      <span>{log.exercises?.length || 0} Exs</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <Scale size={14} className={styles.summaryIcon} />
                      <span>{log.totalVolume?.toLocaleString() || 0} {log.weightUnit || weightUnit}</span>
                    </div>
                  </div>

                  {/* Expanded exercise details */}
                  {isExpanded && (
                    <div className={styles.expandedDetails}>
                      <div className="divider" />
                      <div className={styles.exerciseList}>
                        {log.exercises?.map((ex, exIdx) => (
                          <div key={exIdx} className={styles.exerciseItem}>
                            <div className={styles.exerciseHeader}>
                              <span className={styles.exerciseName}>{ex.name}</span>
                              {ex.isPR && (
                                <span className={`${styles.prBadge} badge badge--success`}>
                                  <Award size={10} /> NEW PR
                                </span>
                              )}
                            </div>
                            
                            <div className={styles.setRows}>
                              {ex.sets?.map((set, setIdx) => (
                                <div key={setIdx} className={styles.setRow}>
                                  <span className={styles.setNum}>Set {setIdx + 1}</span>
                                  <span className={styles.setVal}>
                                    {set.weight} {log.weightUnit || weightUnit} × {set.reps} {set.completed ? '✓' : '(missed)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <Award size={32} />
            <h3>No workouts logged</h3>
            <p>
              {selectedDate 
                ? "You didn't log any session on this day." 
                : "Your training history is empty. Go lift!"}
            </p>
          </div>
        )}
      </section>

      {/* Edit log modal */}
      {editingLog && (
        <div className="modal-overlay" onClick={() => setEditingLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className={styles.editHeader}>
              <h3 className={styles.editTitle}>Edit Workout</h3>
              <button className="btn btn--ghost btn--icon" onClick={() => setEditingLog(null)}><X size={20} /></button>
            </div>

            <input
              className="input"
              value={editingLog.name}
              onChange={(e) => setEditingLog({ ...editingLog, name: e.target.value })}
              style={{ marginBottom: 'var(--sp-4)' }}
            />

            <div className={styles.editExList}>
              {editingLog.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className={styles.editEx}>
                  <span className={styles.editExName}>{ex.name}</span>
                  {ex.sets?.map((set, setIdx) => (
                    <div key={setIdx} className={styles.editSetRow}>
                      <span className={styles.editSetNum}>Set {setIdx + 1}</span>
                      <input type="number" className="input input--sm" value={set.weight ?? 0}
                        onChange={(e) => editSetField(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)} />
                      <span className={styles.editX}>×</span>
                      <input type="number" className="input input--sm" value={set.reps ?? 0}
                        onChange={(e) => editSetField(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)} />
                      <button
                        className={`checkbox ${set.completed ? 'checkbox--checked' : ''}`}
                        onClick={() => editSetField(exIdx, setIdx, 'completed', !set.completed)}
                      >
                        {set.completed && <Check size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button className="btn btn--primary btn--full" onClick={handleSaveEdit} style={{ marginTop: 'var(--sp-4)' }}>
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
