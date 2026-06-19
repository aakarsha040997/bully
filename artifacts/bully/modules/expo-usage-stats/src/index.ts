import { NativeModules, Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

// Only access the native module on Android; it won't exist on other platforms.
const ExpoUsageStats =
  Platform.OS === "android" ? (NativeModules.ExpoUsageStats ?? null) : null;

/** Returns true if the user has granted Usage Access permission (Android only). */
export async function hasPermission(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.hasPermission();
  } catch {
    return false;
  }
}

/**
 * Opens Android Settings → Usage Access so the user can grant permission.
 * No-op on iOS/web.
 */
export async function requestPermission(): Promise<void> {
  if (!ExpoUsageStats) return;
  try {
    await ExpoUsageStats.requestPermission();
  } catch {}
}

/**
 * Returns last-24h per-app usage sorted descending by time, system apps excluded.
 * Returns [] if permission not granted or not on Android.
 */
export async function getUsageStats(): Promise<AppUsage[]> {
  if (!ExpoUsageStats) return [];
  try {
    return await ExpoUsageStats.getUsageStats();
  } catch {
    return [];
  }
}
