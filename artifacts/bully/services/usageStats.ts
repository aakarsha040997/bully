/**
 * Wrapper around the expo-usage-stats native module.
 * Android is the source of truth for all app usage.
 * Safe to import on iOS/web (returns empty values).
 */

import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

let native: {
  isNativeModuleLoaded: () => boolean;
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  getUsageStats: () => Promise<AppUsage[]>;
} | null = null;

if (Platform.OS === "android") {
  try {
    native = require("expo-usage-stats");
  } catch {
    native = null;
  }
}

export const isUsageTrackingSupported = Platform.OS === "android";

export async function hasUsagePermission(): Promise<boolean> {
  if (!native) return false;

  try {
    return await native.hasPermission();
  } catch {
    return false;
  }
}

/** Returns true if the native ExpoUsageStats module loaded successfully. */
export function isNativeModuleLoaded(): boolean {
  if (!native) return false;
  try {
    return native.isNativeModuleLoaded();
  } catch {
    return false;
  }
}

/**
 * Opens the Usage Access settings screen.
 * Returns true if the native module launched the intent successfully,
 * false if the native module is unavailable (caller should use a Linking fallback).
 */
export async function requestUsagePermission(): Promise<boolean> {
  if (!native) return false;

  try {
    return await native.requestPermission();
  } catch {
    return false;
  }
}

export async function getAppUsageStats(): Promise<AppUsage[]> {
  if (!native) return [];

  try {
    const stats = await native.getUsageStats();

    return [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes);
  } catch {
    return [];
  }
}

export async function getTotalScreenMinutes(): Promise<number> {
  const stats = await getAppUsageStats();

  return stats.reduce((sum, app) => sum + app.totalMinutes, 0);
}

export async function getTopApp(): Promise<AppUsage | null> {
  const stats = await getAppUsageStats();

  return stats.length ? stats[0] : null;
}

export async function getUsageForPackage(
  packageName: string,
): Promise<AppUsage | null> {
  const stats = await getAppUsageStats();

  return stats.find((app) => app.packageName === packageName) ?? null;
}

export async function getUsageForPackages(
  packageNames: string[],
): Promise<AppUsage[]> {
  const stats = await getAppUsageStats();

  return stats.filter((app) => packageNames.includes(app.packageName));
}
