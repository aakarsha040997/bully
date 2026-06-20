/**
 * Notification Service — delivery only.
 *
 * Responsibilities:
 *   - Notification channel configuration (Android 8+)
 *   - Permission management
 *   - Immediate roast delivery (with per-severity channel routing)
 *   - Daily scheduled check-in
 *
 * Does NOT generate roast text.
 * Does NOT decide when to send a notification.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ─── Channel IDs ─────────────────────────────────────────────────────────────

export const CHANNELS = {
  roasts: "bully-roasts",
  alerts: "bully-alerts",
  daily: "bully-daily",
} as const;

export type NotificationChannel = (typeof CHANNELS)[keyof typeof CHANNELS];

// ─── Channel setup ────────────────────────────────────────────────────────────

/**
 * Create or update Android notification channels.
 * Safe to call on every app start — setNotificationChannelAsync is idempotent.
 * Must be called before any notification is sent.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Promise.all([
    Notifications.setNotificationChannelAsync(CHANNELS.roasts, {
      name: "Roasts",
      description: "Bully roasts based on your daily habits",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#FF1744",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: "default",
      enableLights: true,
      enableVibrate: true,
    }),

    Notifications.setNotificationChannelAsync(CHANNELS.alerts, {
      name: "Urgent Alerts",
      description: "Immediate alerts when you cross screen-time limits",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#FF1744",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      bypassDnd: false,
    }),

    Notifications.setNotificationChannelAsync(CHANNELS.daily, {
      name: "Daily Check-In",
      description: "Your scheduled daily accountability notification",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: "#FF1744",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: "default",
      enableLights: true,
      enableVibrate: true,
    }),
  ]);
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } =
    (await Notifications.getPermissionsAsync()) as any;
  if (existing === "granted") return true;

  const { status } = (await Notifications.requestPermissionsAsync()) as any;
  return status === "granted";
}

export async function getNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  if (Platform.OS === "web") return "denied";
  const { status } = (await Notifications.getPermissionsAsync()) as any;
  return (status as "granted" | "denied" | "undetermined") ?? "denied";
}

// ─── Immediate roast delivery ─────────────────────────────────────────────────

type RoastSeverity = "NUCLEAR" | "HIGH" | "MEDIUM" | "LOW" | undefined;

function channelForSeverity(severity: RoastSeverity): NotificationChannel {
  if (severity === "NUCLEAR" || severity === "HIGH") return CHANNELS.alerts;
  return CHANNELS.roasts;
}

/**
 * Fire an immediate notification with the provided title and message.
 * Routes to the correct Android channel based on severity.
 */
export async function sendRoastNotification(
  title: string,
  message: string,
  severity?: RoastSeverity,
): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const channelId = channelForSeverity(severity);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      sound: true,
      data: { type: "roast" },
      ...(Platform.OS === "android" && { channelId }),
    },
    trigger: null,
  });
}

// ─── Scheduled daily check-in ─────────────────────────────────────────────────

const DAILY_ROAST_ID = "bully-daily-roast";

/**
 * Schedule (or reschedule) the daily check-in notification.
 * The caller provides the already-composed title and body.
 */
export async function scheduleDailyCheckIn(
  hour: number,
  minute: number,
  title: string,
  body: string,
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  await cancelDailyCheckIn();

  return Notifications.scheduleNotificationAsync({
    identifier: DAILY_ROAST_ID,
    content: {
      title,
      body,
      sound: true,
      data: { type: "daily_roast" },
      ...(Platform.OS === "android" && { channelId: CHANNELS.daily }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyCheckIn(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ROAST_ID);
  } catch {}
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getAllScheduledNotifications() {
  if (Platform.OS === "web") return [];
  return Notifications.getAllScheduledNotificationsAsync();
}
