import React, { useState, useEffect } from 'react';
import {
  Trophy, Lock, Footprints, CalendarCheck, CalendarHeart, Flame, Zap,
  Medal, Award, Dumbbell, Mountain, Gem, TrendingUp, Scale, Star,
} from 'lucide-react';
import { getAllWorkoutLogs, getAllPersonalRecords, getAllBodyMetrics } from '../store/db';
import { computeXP, levelFromXP, computeAchievements } from '../lib/fitness';
import styles from './Achievements.module.css';

const ICONS = {
  Footprints, CalendarCheck, CalendarHeart, Trophy, Flame, Zap,
  Medal, Award, Dumbbell, Mountain, Gem, TrendingUp, Scale, Star,
};

export default function Achievements() {
  const [data, setData] = useState({ level: null, achievements: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [logs, prs, bodyMetrics] = await Promise.all([
          getAllWorkoutLogs(), getAllPersonalRecords(), getAllBodyMetrics(),
        ]);
        const xp = computeXP(logs, prs.length);
        const level = levelFromXP(xp);
        const achievements = computeAchievements({ logs, prs, bodyMetrics });
        setData({ level, achievements });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="page"><div className="empty-state"><Trophy size={32} className="animate-spin" /><h3>Loading…</h3></div></div>;
  }

  const { level, achievements } = data;
  const unlocked = achievements.filter(a => a.unlocked).length;

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Achievements</h1>
        <p className="page-subtitle">Level up and unlock badges as you train</p>
      </header>

      {/* Level card */}
      <section className="section">
        <div className={`${styles.levelCard} card`}>
          <div className={styles.levelTop}>
            <div className={styles.levelBadge}>
              <Star size={20} fill="currentColor" />
              <span>{level.level}</span>
            </div>
            <div className={styles.levelInfo}>
              <span className={styles.levelTitle}>{level.title}</span>
              <span className={styles.levelXp}>{level.xp.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${level.progressPct}%` }} />
          </div>
          <span className={styles.levelNext}>
            {level.xpForNext - level.xpInLevel > 0
              ? `${(level.xpForNext - level.xpInLevel).toLocaleString()} XP to level ${level.level + 1}`
              : 'Max level reached'}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Badges</h2>
          <span className={styles.count}>{unlocked}/{achievements.length}</span>
        </div>
        <div className={styles.grid}>
          {achievements.map(a => {
            const Icon = ICONS[a.icon] || Trophy;
            return (
              <div key={a.id} className={`${styles.badge} ${a.unlocked ? styles.unlocked : styles.locked}`}>
                <div className={styles.badgeIcon}>
                  {a.unlocked ? <Icon size={22} /> : <Lock size={18} />}
                </div>
                <span className={styles.badgeName}>{a.name}</span>
                <span className={styles.badgeDesc}>{a.desc}</span>
                {!a.unlocked && a.progress > 0 && (
                  <div className={styles.badgeProgress}>
                    <div className={styles.badgeProgressFill} style={{ width: `${Math.round(a.progress * 100)}%` }} />
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
