/**
 * Wrapper around the expo-usage-stats native module.
 * Android is the source of truth for all app usage.
 * Safe to import on iOS/web (returns empty/false values).
 */

import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
}

let native: {
  isNativeModuleLoaded: () => boolean;
  // Usage Access
  hasPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  getUsageStats: () => Promise<AppUsage[]>;
  // Overlay
  hasOverlayPermission: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
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
    native = require("expo-usage-stats");
  } catch {
    native = null;
  }
}

export const isUsageTrackingSupported = Platform.OS === "android";

// ── Usage Access ──────────────────────────────────────────────────────────────

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

export async function getUsageForPackage(packageName: string): Promise<AppUsage | null> {
  const stats = await getAppUsageStats();
  return stats.find((app) => app.packageName === packageName) ?? null;
}

export async function getUsageForPackages(packageNames: string[]): Promise<AppUsage[]> {
  const stats = await getAppUsageStats();
  return stats.filter((app) => packageNames.includes(app.packageName));
}

// ── Overlay Permission ────────────────────────────────────────────────────────

/**
 * Returns true if SYSTEM_ALERT_WINDOW ("Display over other apps") is granted.
 * Always false on non-Android platforms.
 */
export async function hasOverlayPermission(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.hasOverlayPermission();
  } catch {
    return false;
  }
}

/**
 * Opens Android Settings → "Display over other apps" so the user can grant
 * SYSTEM_ALERT_WINDOW. Returns true if the settings screen launched.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.requestOverlayPermission();
  } catch {
    return false;
  }
}

// ── Overlay Control ───────────────────────────────────────────────────────────

/**
 * Start background monitoring: when any app in [packages] comes to the
 * foreground, show a roast overlay above it. Requires both Usage Access and
 * SYSTEM_ALERT_WINDOW permissions.
 */
export async function startOverlayMonitoring(
  packages: string[],
  roastText: string,
): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.startOverlayMonitoring(packages, roastText);
  } catch {
    return false;
  }
}

/** Stop background monitoring and dismiss any visible overlay. */
export async function stopOverlayMonitoring(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.stopOverlayMonitoring();
  } catch {
    return false;
  }
}

/**
 * Immediately show the roast overlay (for testing or on-demand display).
 * Does not require monitoring to be active.
 */
export async function showRoastOverlay(roastText: string): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.showRoastOverlay(roastText);
  } catch {
    return false;
  }
}

/** Hide the overlay if it is currently visible. */
export async function hideRoastOverlay(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.hideRoastOverlay();
  } catch {
    return false;
  }
}

/**
 * Push a new roast text to a running monitoring session. If the overlay is
 * currently showing, it refreshes immediately.
 */
export async function updateOverlayRoast(roastText: string): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.updateOverlayRoast(roastText);
  } catch {
    return false;
  }
}
