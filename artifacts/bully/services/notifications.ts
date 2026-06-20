/**
 * Notification Service — delivery only.
 *
 * Responsibilities:
 *   - Permission management
 *   - Scheduling / cancelling notifications
 *   - Sending a pre-composed roast notification
 *
 * Does NOT generate roast text.
 * Does NOT decide when to send a notification.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ─── Permission helpers ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = (await Notifications.getPermissionsAsync()) as any;
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

/**
 * Fire an immediate notification with the provided title and message.
 * This is the only notification delivery function that should be called
 * from the monitoring engine.
 */
export async function sendRoastNotification(
  title: string,
  message: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      sound: true,
      data: { type: "roast" },
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
    content: { title, body, sound: true, data: { type: "daily_roast" } },
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
