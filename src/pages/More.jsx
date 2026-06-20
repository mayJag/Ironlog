import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Scale, Trophy, Target, Calculator, Dumbbell, Settings as SettingsIcon,
  ChevronRight, Star, BookOpen, ClipboardList,
} from 'lucide-react';
import { getAllWorkoutLogs, getAllPersonalRecords } from '../store/db';
import { computeXP, levelFromXP } from '../lib/fitness';
import styles from './More.module.css';

const MENU = [
  { path: '/active-plan', label: 'My Active Plan', desc: 'View your full weekly plan', icon: ClipboardList },
  { path: '/progress', label: 'Progress & Stats', desc: 'Charts and lifetime totals', icon: TrendingUp },
  { path: '/body', label: 'Body & Photos', desc: 'Weight, measurements, photos', icon: Scale },
  { path: '/achievements', label: 'Achievements', desc: 'Levels and badges', icon: Trophy },
  { path: '/goals', label: 'Goals & Auto-Plan', desc: 'Generate a plan for your goal', icon: Target },
  { path: '/tools', label: 'Calculators', desc: 'Plates, 1RM, warm-up', icon: Calculator },
  { path: '/exercises', label: 'Exercise Library', desc: 'Browse and add exercises', icon: Dumbbell },
  { path: '/programs', label: 'Programs', desc: 'Pre-loaded training programs', icon: BookOpen },
  { path: '/settings', label: 'Settings', desc: 'Units, backups, preferences', icon: SettingsIcon },
];

export default function More() {
  const navigate = useNavigate();
  const [level, setLevel] = useState(null);

  useEffect(() => {
    (async () => {
      const [logs, prs] = await Promise.all([getAllWorkoutLogs(), getAllPersonalRecords()]);
      setLevel(levelFromXP(computeXP(logs, prs.length)));
    })();
  }, []);

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">More</h1>
      </header>

      {level && (
        <button className={`${styles.profile} card`} onClick={() => navigate('/achievements')}>
          <div className={styles.levelBadge}>
            <Star size={18} fill="currentColor" />
            <span>{level.level}</span>
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileTitle}>{level.title}</span>
            <div className="progress-bar" style={{ marginTop: 6 }}>
              <div className="progress-bar__fill" style={{ width: `${level.progressPct}%` }} />
            </div>
            <span className={styles.profileXp}>{level.xp.toLocaleString()} XP</span>
          </div>
          <ChevronRight size={18} className={styles.chev} />
        </button>
      )}

      <div className={styles.menu}>
        {MENU.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.path} className={`${styles.menuItem} card`} onClick={() => navigate(item.path)}>
              <div className={styles.menuIcon}><Icon size={18} /></div>
              <div className={styles.menuText}>
                <span className={styles.menuLabel}>{item.label}</span>
                <span className={styles.menuDesc}>{item.desc}</span>
              </div>
              <ChevronRight size={18} className={styles.chev} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
