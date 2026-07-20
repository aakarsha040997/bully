import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

// The Kotlin module uses the new Expo Modules system (ModuleDefinition).
// New-style modules are NOT exposed via NativeModules — they must be accessed
// via requireNativeModule() from expo-modules-core.
let ExpoUsageStats: {
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<void>;
  getUsageStats: () => Promise<AppUsage[]>;
} | null = null;

if (Platform.OS === "android") {
  try {
    const { requireNativeModule } = require("expo-modules-core");
    ExpoUsageStats = requireNativeModule("ExpoUsageStats");
  } catch {
    ExpoUsageStats = null;
  }
}

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
 * Deep-links directly to Bully's toggle on Android 10+.
 * No-op on iOS/web.
 */
export async function requestPermission(): Promise<void> {
  if (!ExpoUsageStats) return;
  try {
    await ExpoUsageStats.requestPermission();
  } catch {}
}

/**
 * Returns today's per-app usage sorted descending by time, system apps excluded.
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
