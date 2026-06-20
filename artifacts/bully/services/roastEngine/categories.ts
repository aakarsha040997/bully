import type { RoastCategory } from "./types";

/** Maps Android package names → roast category */
export const APP_CATEGORY_MAP: Record<string, RoastCategory> = {
  // Doomscrolling — short-form, infinite scroll
  "com.instagram.android": "DOOMSCROLLING",
  "com.zhiliaoapp.musically": "DOOMSCROLLING", // TikTok
  "com.ss.android.ugc.trill": "DOOMSCROLLING", // TikTok (alt)
  "com.twitter.android": "DOOMSCROLLING",
  "com.x.android": "DOOMSCROLLING",
  "com.reddit.frontpage": "DOOMSCROLLING",
  "com.snapchat.android": "DOOMSCROLLING",
  "com.pinterest": "DOOMSCROLLING",
  "com.tumblr": "DOOMSCROLLING",
  "com.bereal.android": "DOOMSCROLLING",
  "com.threads.android": "DOOMSCROLLING",

  // Binge — long-form video
  "com.netflix.mediaclient": "BINGE",
  "com.google.android.youtube": "BINGE",
  "com.amazon.avod.thirdpartyclient": "BINGE",
  "com.disney.disneyplus": "BINGE",
  "com.hbo.hbonow": "BINGE",
  "tv.twitch.android.app": "BINGE",
  "com.apple.android.music": "BINGE",

  // Social media — communication / networking
  "com.facebook.katana": "SOCIAL_MEDIA",
  "com.linkedin.android": "SOCIAL_MEDIA",
  "com.facebook.orca": "SOCIAL_MEDIA", // Messenger
  "com.whatsapp": "SOCIAL_MEDIA",
  "org.telegram.messenger": "SOCIAL_MEDIA",
  "com.discord": "SOCIAL_MEDIA",
  "com.slack": "WORK_HOURS",
  "com.microsoft.teams": "WORK_HOURS",
};

/** Friendly display names for categories */
export const CATEGORY_LABELS: Record<RoastCategory, string> = {
  DOOMSCROLLING: "Doomscrolling",
  LATE_NIGHT: "Late Night",
  BINGE: "Binge Watching",
  LOW_PRODUCTIVITY: "Low Productivity",
  NO_GYM: "Skipped Gym",
  LOW_WATER: "Dehydrated",
  NO_READING: "No Reading",
  HIGH_UNLOCKS: "Phone Addiction",
  GOOD_PROGRESS: "Good Progress",
  WEEKEND: "Weekend Mode",
  WORK_HOURS: "Work Hours",
  SOCIAL_MEDIA: "Social Media",
};

/**
 * Returns the roast category for a given app.
 * Falls back to DOOMSCROLLING for unknown apps since most time-wasting
 * apps are some form of infinite scrolling.
 */
export function getCategoryForApp(
  packageName: string | undefined,
  _appName?: string,
): RoastCategory {
  if (!packageName) return "DOOMSCROLLING";
  return APP_CATEGORY_MAP[packageName] ?? "DOOMSCROLLING";
}
