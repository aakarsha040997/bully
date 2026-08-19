import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

let ExpoUsageStats: {
  // Usage Access
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  getUsageStats: () => Promise<AppUsage[]>;
  getUnlockCount: () => Promise<number>;
  // Overlay permission
  hasOverlayPermission: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
  // Overlay control
  startOverlayMonitoring: (packages: string[], roastText: string) => Promise<boolean>;
  stopOverlayMonitoring: () => Promise<boolean>;
  showRoastOverlay: (roastText: string) => Promise<boolean>;
  hideRoastOverlay: () => Promise<boolean>;
  updateOverlayRoast: (roastText: string) => Promise<boolean>;
  isOverlayServiceRunning: () => boolean;
  isOverlayVisible: () => boolean;
} | null = null;

if (Platform.OS === "android") {
  try {
    ExpoUsageStats = requireNativeModule("ExpoUsageStats");
  } catch {
    ExpoUsageStats = null;
  }
}

/** True if the native ExpoUsageStats module was successfully loaded. */
export function isNativeModuleLoaded(): boolean {
  return ExpoUsageStats !== null;
}

// ── Usage Access ──────────────────────────────────────────────────────────────

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
 * Returns true if the native module launched the intent, false otherwise.
 */
export async function requestPermission(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    await ExpoUsageStats.requestPermission();
    return true;
  } catch {
    return false;
  }
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

/** Returns today's phone unlock count from Android lock-screen events. */
export async function getUnlockCount(): Promise<number> {
  if (!ExpoUsageStats) return 0;
  try {
    return await ExpoUsageStats.getUnlockCount();
  } catch {
    return 0;
  }
}

// ── Overlay Permission ────────────────────────────────────────────────────────

/**
 * Returns true if SYSTEM_ALERT_WINDOW (Display over other apps) is granted.
 * Always true on Android < 6 (Marshmallow).
 */
export async function hasOverlayPermission(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.hasOverlayPermission();
  } catch {
    return false;
  }
}

/**
 * Opens Android Settings → Display over other apps so the user can grant
 * SYSTEM_ALERT_WINDOW permission. Returns true if the settings screen launched.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.requestOverlayPermission();
  } catch {
    return false;
  }
}

// ── Overlay Control ───────────────────────────────────────────────────────────

/**
 * Start background monitoring. When any app in [packages] becomes the foreground
 * app, the overlay is shown with [roastText]. Starts a foreground service.
 */
export async function startOverlayMonitoring(
  packages: string[],
  roastText: string,
): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.startOverlayMonitoring(packages, roastText);
  } catch {
    return false;
  }
}

/** Stop background monitoring and hide any visible overlay. */
export async function stopOverlayMonitoring(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.stopOverlayMonitoring();
  } catch {
    return false;
  }
}

/**
 * Immediately show the roast overlay on screen (useful for testing or on-demand
 * display while Bully is in the foreground). Starts the service if needed.
 */
export async function showRoastOverlay(roastText: string): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.showRoastOverlay(roastText);
  } catch {
    return false;
  }
}

/** Hide the overlay if it is currently visible. */
export async function hideRoastOverlay(): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.hideRoastOverlay();
  } catch {
    return false;
  }
}

/**
 * Update the roast text for a running monitoring session. If the overlay is
 * currently visible it will be refreshed with the new text immediately.
 */
export async function updateOverlayRoast(roastText: string): Promise<boolean> {
  if (!ExpoUsageStats) return false;
  try {
    return await ExpoUsageStats.updateOverlayRoast(roastText);
  } catch {
    return false;
  }
}

/** Returns true if the overlay background service is currently running. */
export function isOverlayServiceRunning(): boolean {
  if (!ExpoUsageStats) return false;
  try {
    return ExpoUsageStats.isOverlayServiceRunning();
  } catch {
    return false;
  }
}

/** Returns true if an overlay is currently visible on screen. */
export function isOverlayVisible(): boolean {
  if (!ExpoUsageStats) return false;
  try {
    return ExpoUsageStats.isOverlayVisible();
  } catch {
    return false;
  }
}
