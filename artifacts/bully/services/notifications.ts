import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type RoastLevel = 1 | 2 | 3 | 4;

const ROAST_BANK: Record<RoastLevel, string[]> = {
  1: [
    "Hey, don't forget your goals today. You've got this.",
    "Just a reminder — your future self is counting on you.",
    "Check in with yourself. Are you making progress?",
    "Small steps today = big wins tomorrow. Keep it moving.",
    "Don't let the day slip by. Do one productive thing right now.",
  ],
  2: [
    "Your goals aren't going to achieve themselves. Just saying.",
    "Another day, another chance you might actually use it.",
    "Your screen time called. It wants you to put the phone down.",
    "Checking in. You've been suspiciously quiet about your progress.",
    "Today's productivity report: still pending. Fix that.",
  ],
  3: [
    "You said you'd be productive today. Clock's ticking.",
    "Your future self is rolling his eyes at you right now.",
    "Zero progress is still a choice. A terrible one.",
    "Your dumbbells are collecting dust. Go say hi.",
    "The only thing you're consistently doing is being inconsistent.",
  ],
  4: [
    "Get off the couch. Seriously. Right now.",
    "Your phone battery works harder than you do today.",
    "Even your alarm gave up on you. Don't give up on yourself.",
    "You're one decision away from not being a disaster. Make it.",
    "Bro. The day is almost over. What did you actually do?",
  ],
};

const SCREEN_TIME_ROASTS: Record<RoastLevel, string[]> = {
  1: [
    "Heads up — you've hit your screen time limit for the day.",
    "You've reached your daily screen limit. Time for something else.",
  ],
  2: [
    "Screen time limit exceeded. Your eyes need a break. Your goals need you.",
    "You blew past your screen time limit. Impressive dedication to the wrong thing.",
  ],
  3: [
    "You've hit your screen time limit. Your phone is more disciplined than you are.",
    "Daily screen limit: gone. Productivity: also gone. Correlation? Probably.",
  ],
  4: [
    "Screen time limit? Destroyed it. Your goals? Also destroyed, apparently.",
    "You nuked your screen time limit. At least you're committed to something.",
  ],
};

export function getRandomRoast(level: RoastLevel): string {
  const bank = ROAST_BANK[level];
  return bank[Math.floor(Math.random() * bank.length)];
}

export function getScreenTimeRoast(level: RoastLevel): string {
  const bank = SCREEN_TIME_ROASTS[level];
  return bank[Math.floor(Math.random() * bank.length)];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  if (Platform.OS === "web") return "denied";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

const DAILY_ROAST_ID_KEY = "bully-daily-roast";
const SCREEN_TIME_ID_KEY = "bully-screen-time";

export async function scheduleDailyRoast(
  hour: number,
  minute: number,
  roastLevel: RoastLevel
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  await cancelDailyRoast();

  const roast = getRandomRoast(roastLevel);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ROAST_ID_KEY,
    content: {
      title: "BULLY",
      body: roast,
      sound: true,
      data: { type: "daily_roast" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelDailyRoast(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ROAST_ID_KEY);
  } catch {}
}

export async function fireScreenTimeAlert(roastLevel: RoastLevel): Promise<void> {
  if (Platform.OS === "web") return;
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(SCREEN_TIME_ID_KEY);
  } catch {}

  await Notifications.scheduleNotificationAsync({
    identifier: SCREEN_TIME_ID_KEY,
    content: {
      title: "Screen time limit hit",
      body: getScreenTimeRoast(roastLevel),
      sound: true,
      data: { type: "screen_time" },
    },
    trigger: null,
  });
}

export async function getAllScheduledNotifications() {
  if (Platform.OS === "web") return [];
  return Notifications.getAllScheduledNotificationsAsync();
}
