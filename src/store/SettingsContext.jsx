import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from './db';

const SettingsContext = createContext(null);

const DEFAULTS = {
  weightUnit: 'kg',
  defaultRestTimer: 90,
  soundEnabled: true,
  vibrationEnabled: true,
};

/**
 * Centralises user preferences so they actually drive app behaviour everywhere
 * (weight unit label, default rest length, rest-timer sound/haptics) instead of
 * sitting unused in the Settings screen.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const weightUnit = (await getSetting('weightUnit')) || DEFAULTS.weightUnit;
        const defaultRestTimer = (await getSetting('defaultRestTimer')) || DEFAULTS.defaultRestTimer;
        const soundEnabled = (await getSetting('soundEnabled')) !== false;
        const vibrationEnabled = (await getSetting('vibrationEnabled')) !== false;
        setSettings({ weightUnit, defaultRestTimer, soundEnabled, vibrationEnabled });
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await setSetting(key, value);
    } catch (e) {
      console.error(`Failed to persist setting ${key}:`, e);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, loaded, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  return ctx || { ...DEFAULTS, loaded: true, updateSetting: () => {} };
}
