import React, { useState } from 'react';
import { Calculator, Dumbbell, TrendingUp, Flame } from 'lucide-react';
import { useSettings } from '../store/SettingsContext';
import { estimate1RM } from '../lib/fitness';
import styles from './Calculators.module.css';

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

export default function Calculators() {
  const { weightUnit } = useSettings();
  const [tab, setTab] = useState('plate');

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Calculators</h1>
        <p className="page-subtitle">Plate loading, one-rep max and warm-up tools</p>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === 'plate' ? 'tab--active' : ''}`} onClick={() => setTab('plate')}>Plates</button>
        <button className={`tab ${tab === '1rm' ? 'tab--active' : ''}`} onClick={() => setTab('1rm')}>1RM</button>
        <button className={`tab ${tab === 'warmup' ? 'tab--active' : ''}`} onClick={() => setTab('warmup')}>Warm-up</button>
      </div>

      {tab === 'plate' && <PlateCalc unit={weightUnit} />}
      {tab === '1rm' && <OneRepMax unit={weightUnit} />}
      {tab === 'warmup' && <WarmUp unit={weightUnit} />}
    </div>
  );
}

function PlateCalc({ unit }) {
  const defaultBar = unit === 'kg' ? 20 : 45;
  const [target, setTarget] = useState(unit === 'kg' ? 100 : 225);
  const [bar, setBar] = useState(defaultBar);
  const plates = unit === 'kg' ? KG_PLATES : LB_PLATES;

  const perSide = Math.max(0, (Number(target) - Number(bar)) / 2);
  const loadout = [];
  let remaining = perSide;
  for (const p of plates) {
    let count = 0;
    while (remaining >= p - 1e-9) { remaining -= p; count++; }
    if (count > 0) loadout.push({ plate: p, count });
  }
  const achievable = Number(bar) + (perSide - remaining) * 2;
  const leftover = remaining > 0.01;

  return (
    <div className="card">
      <h2 className={styles.cardTitle}><Dumbbell size={16} /> Barbell Plate Loader</h2>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>Target weight ({unit})</span>
          <input type="number" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Bar ({unit})</span>
          <input type="number" className="input" value={bar} onChange={(e) => setBar(e.target.value)} />
        </label>
      </div>

      <div className={styles.barViz}>
        {loadout.length === 0 ? (
          <p className="text-muted">Just the empty bar.</p>
        ) : (
          loadout.map(({ plate, count }) => (
            <div key={plate} className={styles.plateChip}>
              <span className={styles.plateCount}>{count}×</span> {plate}{unit}
            </div>
          ))
        )}
      </div>
      <p className={styles.plateNote}>
        Load <strong>per side</strong> (above). Total achievable: <strong>{achievable}{unit}</strong>
        {leftover && <span className="text-danger"> · can't make exact target with available plates</span>}
      </p>
    </div>
  );
}

function OneRepMax({ unit }) {
  const [weight, setWeight] = useState(unit === 'kg' ? 80 : 185);
  const [reps, setReps] = useState(5);
  const orm = estimate1RM(weight, reps);
  const pcts = [60, 70, 75, 80, 85, 90, 95];

  return (
    <div className="card">
      <h2 className={styles.cardTitle}><TrendingUp size={16} /> Estimated 1RM</h2>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>Weight lifted ({unit})</span>
          <input type="number" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Reps</span>
          <input type="number" className="input" value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
      </div>

      <div className={styles.ormBig}>
        <span className={styles.ormValue}>{orm}{unit}</span>
        <span className={styles.ormLabel}>Estimated 1 Rep Max</span>
      </div>

      <div className={styles.pctTable}>
        {pcts.map(p => (
          <div key={p} className={styles.pctRow}>
            <span className={styles.pctPct}>{p}%</span>
            <span className={styles.pctWeight}>{Math.round(orm * p / 100 * 2) / 2}{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarmUp({ unit }) {
  const [working, setWorking] = useState(unit === 'kg' ? 100 : 225);
  const bar = unit === 'kg' ? 20 : 45;
  const scheme = [
    { pct: 0, reps: 10, label: 'Empty bar' },
    { pct: 0.4, reps: 8 },
    { pct: 0.6, reps: 5 },
    { pct: 0.8, reps: 3 },
    { pct: 0.9, reps: 1 },
  ];
  const round = (v) => Math.max(bar, Math.round(v / 2.5) * 2.5);

  return (
    <div className="card">
      <h2 className={styles.cardTitle}><Flame size={16} /> Warm-up Builder</h2>
      <label className={styles.field} style={{ marginBottom: 'var(--sp-4)' }}>
        <span>Working weight ({unit})</span>
        <input type="number" className="input" value={working} onChange={(e) => setWorking(e.target.value)} />
      </label>

      <div className={styles.warmList}>
        {scheme.map((s, i) => {
          const w = s.pct === 0 ? bar : round(Number(working) * s.pct);
          return (
            <div key={i} className={styles.warmRow}>
              <span className={styles.warmSet}>Set {i + 1}</span>
              <span className={styles.warmWeight}>{w}{unit}</span>
              <span className={styles.warmReps}>× {s.reps}</span>
              <span className={styles.warmPct}>{s.label || `${Math.round(s.pct * 100)}%`}</span>
            </div>
          );
        })}
        <div className={`${styles.warmRow} ${styles.warmWorking}`}>
          <span className={styles.warmSet}>Work</span>
          <span className={styles.warmWeight}>{working}{unit}</span>
          <span className={styles.warmReps}>× reps</span>
          <span className={styles.warmPct}>100%</span>
        </div>
      </div>
    </div>
  );
}
