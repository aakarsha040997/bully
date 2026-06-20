import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Personality } from "@/services/roastEngine/types";

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

export interface DailyRecord {
  date: string;
  score: number;
  stats: DailyStats;
}

export interface AppSettings {
  roastLevel: RoastLevel;
  personality: Personality;
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
  history: DailyRecord[];
  setTodaysRoast: (roast: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  incrementStreak: (key: keyof Streaks) => void;
  resetStreak: (key: keyof Streaks) => void;
  updateStats: (s: Partial<DailyStats>) => void;
  productivityScore: number;
}

const defaultSettings: AppSettings = {
  roastLevel: 2,
  personality: "SAVAGE",
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

function calcScore(s: DailyStats): number {
  return Math.max(
    0,
    Math.min(
      100,
      100 -
        Math.floor(s.screenTimeMinutes / 5) +
        s.waterGlasses * 3 +
        Math.floor(s.readingMinutes / 2) +
        (s.gymDone ? 20 : 0) -
        Math.floor(s.shortsWatched / 5)
    )
  );
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  settings: "@bully_settings",
  streaks: "@bully_streaks",
  stats: "@bully_stats",
  roast: "@bully_todays_roast",
  history: "@bully_history",
};

const MAX_HISTORY = 7;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [streaks, setStreaks] = useState<Streaks>(defaultStreaks);
  const [stats, setStats] = useState<DailyStats>(defaultStats);
  const [todaysRoast, setTodaysRoastState] = useState<string>("Open the Roasts tab and get yours.");
  const [history, setHistory] = useState<DailyRecord[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, st, stat, roast, hist] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.streaks),
          AsyncStorage.getItem(STORAGE_KEYS.stats),
          AsyncStorage.getItem(STORAGE_KEYS.roast),
          AsyncStorage.getItem(STORAGE_KEYS.history),
        ]);
        if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) });
        if (st) setStreaks({ ...defaultStreaks, ...JSON.parse(st) });
        if (hist) setHistory(JSON.parse(hist));

        if (stat) {
          const parsed: DailyStats = JSON.parse(stat);
          if (parsed.lastUpdated !== new Date().toDateString()) {
            // Archive yesterday before resetting
            const yesterdayRecord: DailyRecord = {
              date: parsed.lastUpdated,
              score: calcScore(parsed),
              stats: parsed,
            };
            const existingHist: DailyRecord[] = hist ? JSON.parse(hist) : [];
            const alreadyArchived = existingHist.some((r) => r.date === parsed.lastUpdated);
            if (!alreadyArchived) {
              const newHist = [yesterdayRecord, ...existingHist].slice(0, MAX_HISTORY);
              setHistory(newHist);
              await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(newHist));
            }
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

  const productivityScore = calcScore(stats);

  return (
    <AppContext.Provider
      value={{
        settings,
        streaks,
        stats,
        todaysRoast,
        history,
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
