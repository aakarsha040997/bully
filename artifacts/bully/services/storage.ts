/**
 * Storage service — single isolated layer for all non-context AsyncStorage.
 *
 * Covers: personality, last roast, last notification timestamp, and cooldowns.
 * AppContext manages daily stats, settings, streaks, and history separately.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Personality, RoastOutput } from "./roastEngine/types";

const KEYS = {
  personality: "@bully_personality",
  lastRoast: "@bully_last_roast",
  lastNotificationTs: "@bully_last_notification_ts",
  lastThreshold: "@bully_last_threshold",
} as const;

const DEFAULT_PERSONALITY: Personality = "SAVAGE";

// ─── Personality ─────────────────────────────────────────────────────────────

export async function getPersonality(): Promise<Personality> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.personality);
    return raw ? (raw as Personality) : DEFAULT_PERSONALITY;
  } catch {
    return DEFAULT_PERSONALITY;
  }
}

export async function setPersonality(p: Personality): Promise<void> {
  await AsyncStorage.setItem(KEYS.personality, p).catch(() => {});
}

// ─── Last roast ───────────────────────────────────────────────────────────────

export async function getLastRoast(): Promise<RoastOutput | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.lastRoast);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setLastRoast(roast: RoastOutput): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastRoast, JSON.stringify(roast)).catch(() => {});
}

// ─── Last notification timestamp ──────────────────────────────────────────────

export async function getLastNotificationTs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.lastNotificationTs);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setLastNotificationTs(ts: number = Date.now()): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastNotificationTs, String(ts)).catch(() => {});
}

/** Minimum minutes between any two notifications (global throttle). */
export async function isGlobalThrottled(minIntervalMinutes = 5): Promise<boolean> {
  const last = await getLastNotificationTs();
  return Date.now() - last < minIntervalMinutes * 60 * 1000;
}

// ─── Screen-time threshold tracking ──────────────────────────────────────────

/** Returns the last screen-time value (minutes) at which an alert was fired. */
export async function getLastThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.lastThreshold);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setLastThreshold(minutes: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastThreshold, String(minutes)).catch(() => {});
}

export async function resetThreshold(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.lastThreshold).catch(() => {});
}
