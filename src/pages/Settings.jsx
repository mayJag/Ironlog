import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Scale, Volume2, Vibrate, Trash2, Info, Download, Upload, RotateCcw, ShieldAlert, Check, HelpCircle } from 'lucide-react';
import { getDB, DATA_STORES } from '../store/db';
import { useSettings } from '../store/SettingsContext';
import { useToast } from '../components/Toast';
import styles from './Settings.module.css';

export default function Settings() {
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  // Live, app-wide settings from context
  const {
    weightUnit,
    defaultRestTimer: restTimer,
    soundEnabled,
    vibrationEnabled,
    updateSetting,
  } = useSettings();

  const handleUpdateRestTimer = (val) => {
    updateSetting('defaultRestTimer', parseInt(val) || 90);
  };

  const handleToggleWeightUnit = () => {
    updateSetting('weightUnit', weightUnit === 'kg' ? 'lbs' : 'kg');
  };

  const handleToggleSound = () => {
    updateSetting('soundEnabled', !soundEnabled);
  };

  const handleToggleVibration = () => {
    updateSetting('vibrationEnabled', !vibrationEnabled);
  };

  // --- Database Maintenance Functions ---
  const handleClearHistory = async () => {
    const ok = await confirm({
      title: 'Clear workout history?',
      message: 'All your logged sessions will be deleted permanently. Templates and personal records are preserved.',
      confirmLabel: 'Clear History',
      danger: true,
    });
    if (!ok) return;
    try {
      const db = await getDB();
      await db.clear('workoutLogs');
      toast('Workout history cleared.', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to clear history.', 'error');
    }
  };

  const handleResetAllData = async () => {
    const firstConfirm = await confirm({
      title: 'Reset all application data?',
      message: 'This deletes all settings, routines, plans, history and personal records.',
      confirmLabel: 'Continue',
      danger: true,
    });
    if (!firstConfirm) return;
    const secondConfirm = await confirm({
      title: 'Are you absolutely sure?',
      message: 'This action is irreversible. The app will reload afterwards.',
      confirmLabel: 'Reset Everything',
      danger: true,
    });
    if (!secondConfirm) return;
    try {
      const db = await getDB();
      for (const store of DATA_STORES) await db.clear(store);
      toast('All data reset. Reloading…', 'success');
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error(err);
      toast('Failed to reset database.', 'error');
    }
  };

  // --- Backup & Restore Functions ---
  const handleExportData = async () => {
    try {
      const db = await getDB();
      const backupData = { exportedAt: new Date().toISOString(), version: 2 };
      for (const store of DATA_STORES) {
        backupData[store] = await db.getAll(store);
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ironlog_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Backup downloaded.', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to export data backup.', 'error');
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.workoutLogs && !data.personalRecords && !data.routines) {
          toast('Invalid backup file format.', 'error');
          return;
        }

        const ok = await confirm({
          title: 'Restore from backup?',
          message: 'Importing will overwrite your current settings, routines, history and records.',
          confirmLabel: 'Restore',
          danger: true,
        });
        if (ok) {
          const db = await getDB();
          // Clear, then repopulate every known store that's present in the file.
          for (const store of DATA_STORES) {
            await db.clear(store);
            if (Array.isArray(data[store])) {
              for (const item of data[store]) await db.put(store, item);
            }
          }
          toast('Backup restored. Reloading…', 'success');
          setTimeout(() => window.location.reload(), 900);
        }
      } catch (err) {
        console.error(err);
        toast('Error parsing backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`${styles.settingsPage} page stagger`}>
      <header className={styles.header}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your workout behavior and data backup preferences</p>
      </header>

      {/* Preferences Section */}
      <section className="section">
        <h2 className={styles.sectionHeader}>Preferences</h2>
        <div className={styles.settingsGroup}>
          {/* Rest Timer */}
          <div className={styles.settingRow}>
            <div className={styles.settingLabelCol}>
              <Timer size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Default Rest Timer</span>
                <span className={styles.settingDesc}>Auto-triggered rest length between sets</span>
              </div>
            </div>
            <select
              className={`${styles.restSelect} select`}
              value={restTimer}
              onChange={(e) => handleUpdateRestTimer(e.target.value)}
            >
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>2m</option>
              <option value={180}>3m</option>
            </select>
          </div>

          {/* Weight Unit */}
          <div className={styles.settingRow}>
            <div className={styles.settingLabelCol}>
              <Scale size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Weight Unit</span>
                <span className={styles.settingDesc}>Display weights in kilograms or pounds</span>
              </div>
            </div>
            <button className={`${styles.toggleBtn} btn btn--secondary btn--sm`} onClick={handleToggleWeightUnit}>
              {weightUnit.toUpperCase()}
            </button>
          </div>

          {/* Sound */}
          <div className={styles.settingRow}>
            <div className={styles.settingLabelCol}>
              <Volume2 size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Sound Effects</span>
                <span className={styles.settingDesc}>Play audio beeps when rest timer finishes</span>
              </div>
            </div>
            <button
              className={`checkbox ${soundEnabled ? 'checkbox--checked' : ''}`}
              onClick={handleToggleSound}
            >
              {soundEnabled && <Check size={14} />}
            </button>
          </div>

          {/* Vibration */}
          <div className={styles.settingRow}>
            <div className={styles.settingLabelCol}>
              <Vibrate size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Haptic Vibration</span>
                <span className={styles.settingDesc}>Vibrate device when rest timer reaches zero</span>
              </div>
            </div>
            <button
              className={`checkbox ${vibrationEnabled ? 'checkbox--checked' : ''}`}
              onClick={handleToggleVibration}
            >
              {vibrationEnabled && <Check size={14} />}
            </button>
          </div>
        </div>
      </section>

      {/* Data Backup & Restore */}
      <section className="section">
        <h2 className={styles.sectionHeader}>Data Backup</h2>
        <div className={styles.settingsGroup}>
          {/* Export */}
          <div className={styles.settingRow} onClick={handleExportData} style={{ cursor: 'pointer' }}>
            <div className={styles.settingLabelCol}>
              <Download size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Export Data Backup</span>
                <span className={styles.settingDesc}>Download workout logs and settings as JSON file</span>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className={styles.settingRow} style={{ position: 'relative' }}>
            <div className={styles.settingLabelCol}>
              <Upload size={18} className={styles.settingIcon} />
              <div className={styles.settingText}>
                <span className={styles.settingName}>Restore Data Backup</span>
                <span className={styles.settingDesc}>Upload and restore a previous JSON data backup</span>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              className={styles.fileInput}
              onChange={handleImportData}
            />
          </div>
        </div>
      </section>

      {/* Database Maintenance */}
      <section className="section">
        <h2 className={styles.sectionHeader}>Maintenance</h2>
        <div className={styles.settingsGroup}>
          {/* Clear history */}
          <div className={`${styles.settingRow} ${styles.dangerRow}`} onClick={handleClearHistory}>
            <div className={styles.settingLabelCol}>
              <Trash2 size={18} className={styles.dangerIcon} />
              <div className={styles.settingText}>
                <span className={styles.dangerName}>Clear Workout History</span>
                <span className={styles.settingDesc}>Delete all logged sessions. Preserves templates/PRs.</span>
              </div>
            </div>
          </div>

          {/* Reset all data */}
          <div className={`${styles.settingRow} ${styles.dangerRow}`} onClick={handleResetAllData}>
            <div className={styles.settingLabelCol}>
              <RotateCcw size={18} className={styles.dangerIcon} />
              <div className={styles.settingText}>
                <span className={styles.dangerName}>Reset All Application Data</span>
                <span className={styles.settingDesc}>Wipe the database clean. Resets app to factory settings.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="section card" style={{ marginTop: 'var(--sp-6)', textAlign: 'center' }}>
        <Info size={24} className={styles.infoIcon} />
        <h3 className={styles.appName}>IronLog Workout Tracker</h3>
        <p className={styles.appVersion}>Version 1.2.0 (Release Build)</p>
        <p className={styles.appCredits}>
          Engineered for vertical jump performance & powerbuilding. Preloaded with "Beyond The Rim" & Jeff Nippard's Systems.
        </p>
      </section>
    </div>
  );
}
