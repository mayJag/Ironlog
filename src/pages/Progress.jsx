import React, { useState, useEffect } from 'react';
import { TrendingUp, Dumbbell, Activity, Calendar } from 'lucide-react';
import { getAllWorkoutLogs } from '../store/db';
import { useSettings } from '../store/SettingsContext';
import { LineChart, BarChart } from '../components/Charts';
import {
  summarizeLogs, dailyVolumeSeries, exercise1RMSeries, loggedExerciseNames,
} from '../lib/fitness';
import styles from './Progress.module.css';

export default function Progress() {
  const { weightUnit } = useSettings();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllWorkoutLogs();
        setLogs(all);
        const names = loggedExerciseNames(all);
        if (names.length) setExercise(names[0]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = summarizeLogs(logs);
  const volumeSeries = dailyVolumeSeries(logs).slice(-10).map(d => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' }),
  }));
  const names = loggedExerciseNames(logs);
  const ormSeries = exercise ? exercise1RMSeries(logs, exercise) : [];

  if (loading) {
    return <div className="page"><div className="empty-state"><Activity size={32} className="animate-spin" /><h3>Loading…</h3></div></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="page">
        <header><h1 className="page-title">Progress</h1></header>
        <div className="empty-state card">
          <TrendingUp size={32} />
          <h3>No data to chart yet</h3>
          <p>Log a few workouts and your trends will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Progress</h1>
        <p className="page-subtitle">Your training trends and lifetime totals</p>
      </header>

      <div className="stats-grid section">
        <div className="stat-card card">
          <span className="stat-card__value">{stats.totalWorkouts}</span>
          <span className="stat-card__label">Workouts</span>
        </div>
        <div className="stat-card card">
          <span className="stat-card__value">{stats.totalSets}</span>
          <span className="stat-card__label">Total Sets</span>
        </div>
        <div className="stat-card card">
          <span className="stat-card__value">
            {stats.totalVolume > 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
          </span>
          <span className="stat-card__label">Volume ({weightUnit})</span>
        </div>
      </div>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title"><Calendar size={15} /> Volume — last 10 sessions</h2>
        </div>
        <div className="card">
          <BarChart data={volumeSeries} unit={weightUnit} />
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title"><Dumbbell size={15} /> Strength trend (est. 1RM)</h2>
        </div>
        <div className="card">
          <select className="select" value={exercise} onChange={(e) => setExercise(e.target.value)} style={{ marginBottom: 'var(--sp-4)' }}>
            {names.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {ormSeries.length > 1 ? (
            <LineChart data={ormSeries} unit={weightUnit} />
          ) : (
            <div className="chart-empty">Need 2+ sessions of this lift to show a trend</div>
          )}
          {ormSeries.length > 0 && (
            <p className={styles.trendNote}>
              Latest estimated 1RM: <strong>{ormSeries[ormSeries.length - 1].value}{weightUnit}</strong>
              {ormSeries.length > 1 && (() => {
                const delta = ormSeries[ormSeries.length - 1].value - ormSeries[0].value;
                return <span className={delta >= 0 ? 'text-success' : 'text-danger'}> · {delta >= 0 ? '+' : ''}{delta}{weightUnit} since start</span>;
              })()}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
