/**
 * Background Monitoring Task
 *
 * Uses expo-background-fetch (WorkManager on Android, BGAppRefresh on iOS).
 * The task definition MUST be at module scope — expo-task-manager requires it
 * to be registered before AppRegistry.registerComponent.
 *
 * ─── Android behaviour ────────────────────────────────────────────────────────
 * WorkManager is battery-aware and runs ~every 15 minutes when the system
 * allows. Several hard constraints apply:
 *
 *   1. Minimum interval floor: 15 minutes (Android OS enforced).
 *   2. Doze mode: Android can defer tasks for up to hours when the device is
 *      idle and unplugged. WorkManager respects this by design.
 *   3. OEM battery killers: Samsung, Xiaomi, Huawei, OPPO apply proprietary
 *      battery optimisations that can prevent background tasks entirely unless
 *      the user exempts the app from battery optimisation
 *      (Settings → Apps → Bully → Battery → Unrestricted).
 *   4. stopOnTerminate: false — task survives the user swiping the app away.
 *   5. startOnBoot: true — WorkManager re-registers after device reboot.
 *
 * ─── Why no foreground service ────────────────────────────────────────────────
 * A foreground service would be 100% reliable but requires a persistent
 * notification the user sees at all times. That conflicts with Bully's UX.
 * WorkManager is the correct trade-off for accountability (not life-safety) use.
 *
 * ─── UsageStats limitation ────────────────────────────────────────────────────
 * UsageStatsManager returns cumulative daily totals, not real-time sessions.
 * A 3am background run sees the full day's usage. Bully uses hour-of-day +
 * cumulative total to decide if a roast is warranted — this is accurate.
 *
 * ─── No React ─────────────────────────────────────────────────────────────────
 * This file must never import React or use hooks. It reads AsyncStorage
 * directly and calls the monitoring engine (which is also React-free).
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { runMonitoringCycle } from "./monitoring";
import { calculateScore } from "./productivityScore";
import type { DailyStats, Streaks } from "@/context/AppContext";

export const BACKGROUND_TASK_NAME = "bully-monitoring";

const STORAGE_KEYS = {
  stats: "@bully_stats",
  streaks: "@bully_streaks",
  settings: "@bully_settings",
} as const;

const DEFAULT_STATS: DailyStats = {
  screenTimeMinutes: 0,
  unlockCount: 0,
  waterGlasses: 0,
  readingMinutes: 0,
  shortsWatched: 0,
  gymDone: false,
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_STREAKS: Streaks = {
  gym: 0,
  study: 0,
  reading: 0,
  noDoomscroll: 0,
  wakeUp: 0,
};

async function readStats(): Promise<DailyStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.stats);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

async function readStreaks(): Promise<Streaks> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.streaks);
    return raw ? { ...DEFAULT_STREAKS, ...JSON.parse(raw) } : DEFAULT_STREAKS;
  } catch {
    return DEFAULT_STREAKS;
  }
}

async function readNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return false;
    const s = JSON.parse(raw);
    return s.notificationsEnabled === true;
  } catch {
    return false;
  }
}

// ─── Task definition ────────────────────────────────────────────────────────
// Called at module scope — must happen before the component tree mounts.

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const enabled = await readNotificationsEnabled();
    if (!enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const [stats, streaks] = await Promise.all([readStats(), readStreaks()]);
    const scoreResult = calculateScore(stats, streaks);

    const maxStreak = Math.max(
      streaks.gym,
      streaks.study,
      streaks.reading,
      streaks.noDoomscroll,
      streaks.wakeUp,
    );

    const decision = await runMonitoringCycle({
      productivityScore: scoreResult.score,
      gymDone: stats.gymDone,
      waterGlasses: stats.waterGlasses,
      readingMinutes: stats.readingMinutes,
      unlockCount: stats.unlockCount,
      screenTimeMinutes: stats.screenTimeMinutes,
      streak: maxStreak,
    });

    return decision.shouldNotify
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register the WorkManager periodic task.
 * Safe to call multiple times — idempotent.
 * Should be called from the root layout once on app mount.
 */
export async function registerBackgroundMonitoring(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME,
    );
    if (isRegistered) return true;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundMonitoring(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME,
    );
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    }
  } catch {}
}

export async function getBackgroundTaskStatus(): Promise<{
  isRegistered: boolean;
  fetchStatus: BackgroundFetch.BackgroundFetchStatus | null;
}> {
  if (Platform.OS !== "android") {
    return { isRegistered: false, fetchStatus: null };
  }
  try {
    const [isRegistered, fetchStatus] = await Promise.all([
      TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME),
      BackgroundFetch.getStatusAsync(),
    ]);
    return { isRegistered, fetchStatus };
  } catch {
    return { isRegistered: false, fetchStatus: null };
  }
}
