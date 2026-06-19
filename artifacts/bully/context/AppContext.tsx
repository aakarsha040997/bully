import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type RoastLevel = 1 | 2 | 3 | 4;

export interface GymSchedule {
  days: string[];
  time: string;
}

export interface Streaks {
  gym: number;
  study: number;
  reading: number;
  noDoomscroll: number;
  wakeUp: number;
}

export interface DailyStats {
  screenTimeMinutes: number;
  unlockCount: number;
  waterGlasses: number;
  readingMinutes: number;
  shortsWatched: number;
  gymDone: boolean;
  lastUpdated: string;
}

export interface AppSettings {
  roastLevel: RoastLevel;
  gymSchedule: GymSchedule;
  dailyScreenTimeLimit: number;
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
}

interface AppContextValue {
  settings: AppSettings;
  streaks: Streaks;
  stats: DailyStats;
  todaysRoast: string;
  setTodaysRoast: (roast: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  incrementStreak: (key: keyof Streaks) => void;
  resetStreak: (key: keyof Streaks) => void;
  updateStats: (s: Partial<DailyStats>) => void;
  productivityScore: number;
}

const defaultSettings: AppSettings = {
  roastLevel: 2,
  gymSchedule: { days: ["Mon", "Wed", "Fri"], time: "07:00" },
  dailyScreenTimeLimit: 120,
  notificationsEnabled: false,
  notificationHour: 8,
  notificationMinute: 0,
};

const defaultStreaks: Streaks = {
  gym: 0,
  study: 0,
  reading: 0,
  noDoomscroll: 0,
  wakeUp: 0,
};

const defaultStats: DailyStats = {
  screenTimeMinutes: 0,
  unlockCount: 0,
  waterGlasses: 0,
  readingMinutes: 0,
  shortsWatched: 0,
  gymDone: false,
  lastUpdated: new Date().toDateString(),
};

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  settings: "@bully_settings",
  streaks: "@bully_streaks",
  stats: "@bully_stats",
  roast: "@bully_todays_roast",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [streaks, setStreaks] = useState<Streaks>(defaultStreaks);
  const [stats, setStats] = useState<DailyStats>(defaultStats);
  const [todaysRoast, setTodaysRoastState] = useState<string>("Open the Roasts tab and get yours.");

  useEffect(() => {
    (async () => {
      try {
        const [s, st, stat, roast] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.streaks),
          AsyncStorage.getItem(STORAGE_KEYS.stats),
          AsyncStorage.getItem(STORAGE_KEYS.roast),
        ]);
        if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) });
        if (st) setStreaks({ ...defaultStreaks, ...JSON.parse(st) });
        if (stat) {
          const parsed: DailyStats = JSON.parse(stat);
          if (parsed.lastUpdated !== new Date().toDateString()) {
            await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(defaultStats));
          } else {
            setStats(parsed);
          }
        }
        if (roast) setTodaysRoastState(roast);
      } catch {}
    })();
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const incrementStreak = useCallback((key: keyof Streaks) => {
    setStreaks((prev) => {
      const next = { ...prev, [key]: prev[key] + 1 };
      AsyncStorage.setItem(STORAGE_KEYS.streaks, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetStreak = useCallback((key: keyof Streaks) => {
    setStreaks((prev) => {
      const next = { ...prev, [key]: 0 };
      AsyncStorage.setItem(STORAGE_KEYS.streaks, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateStats = useCallback((partial: Partial<DailyStats>) => {
    setStats((prev) => {
      const next = { ...prev, ...partial, lastUpdated: new Date().toDateString() };
      AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setTodaysRoast = useCallback((roast: string) => {
    setTodaysRoastState(roast);
    AsyncStorage.setItem(STORAGE_KEYS.roast, roast).catch(() => {});
  }, []);

  const productivityScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        Math.floor(stats.screenTimeMinutes / 5) +
        stats.waterGlasses * 3 +
        Math.floor(stats.readingMinutes / 2) +
        (stats.gymDone ? 20 : 0) -
        Math.floor(stats.shortsWatched / 5)
    )
  );

  return (
    <AppContext.Provider
      value={{
        settings,
        streaks,
        stats,
        todaysRoast,
        setTodaysRoast,
        updateSettings,
        incrementStreak,
        resetStreak,
        updateStats,
        productivityScore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
