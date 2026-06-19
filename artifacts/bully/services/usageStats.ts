/**
 * Wrapper around the expo-usage-stats native module.
 * Gracefully no-ops on iOS and web — all callers are safe on any platform.
 */
import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

let native: {
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<void>;
  getUsageStats: () => Promise<AppUsage[]>;
} | null = null;

if (Platform.OS === "android") {
  try {
    // Dynamic import so the module is never evaluated on iOS/web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    native = require("expo-usage-stats");
  } catch {
    native = null;
  }
}

export async function hasUsagePermission(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.hasPermission();
  } catch {
    return false;
  }
}

export async function requestUsagePermission(): Promise<void> {
  if (!native) return;
  try {
    await native.requestPermission();
  } catch {}
}

export async function getAppUsageStats(): Promise<AppUsage[]> {
  if (!native) return [];
  try {
    return await native.getUsageStats();
  } catch {
    return [];
  }
}

export async function getTotalScreenMinutes(): Promise<number> {
  const stats = await getAppUsageStats();
  return stats.reduce((sum, s) => sum + s.totalMinutes, 0);
}

/** Returns the top app by foreground time, or null if unavailable. */
export async function getTopApp(): Promise<AppUsage | null> {
  const stats = await getAppUsageStats();
  return stats[0] ?? null;
}
