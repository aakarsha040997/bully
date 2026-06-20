import type { RoastRule, RoastInput } from "./types";

/**
 * Rule engine — ordered by priority (highest first).
 * First matching rule wins.
 */
export const RULES: RoastRule[] = [
  // ── Priority 100 — Critical / time-sensitive ──────────────────────────────

  {
    id: "rule_late_night_critical",
    priority: 100,
    enabled: true,
    category: "LATE_NIGHT",
    severity: "NUCLEAR",
    cooldownMinutes: 180,
    condition: (i: RoastInput) => i.hour >= 1 && i.hour <= 4,
  },

  {
    id: "rule_late_night_high",
    priority: 95,
    enabled: true,
    category: "LATE_NIGHT",
    severity: "HIGH",
    cooldownMinutes: 120,
    condition: (i: RoastInput) => i.hour >= 23 || i.hour === 0,
  },

  // ── Priority 80 — Screen time limit exceeded ──────────────────────────────

  {
    id: "rule_screen_time_limit",
    priority: 80,
    enabled: true,
    category: "DOOMSCROLLING",
    severity: "HIGH",
    cooldownMinutes: 60,
    condition: (i: RoastInput) => i.trigger === "SCREEN_TIME_LIMIT",
  },

  // ── Priority 70 — Binge detection ─────────────────────────────────────────

  {
    id: "rule_binge_long",
    priority: 70,
    enabled: true,
    category: "BINGE",
    severity: "HIGH",
    cooldownMinutes: 90,
    condition: (i: RoastInput) => (i.minutes ?? 0) >= 120,
  },

  {
    id: "rule_binge_medium",
    priority: 65,
    enabled: true,
    category: "BINGE",
    severity: "MEDIUM",
    cooldownMinutes: 60,
    condition: (i: RoastInput) => (i.minutes ?? 0) >= 60,
  },

  // ── Priority 60 — Doomscrolling ───────────────────────────────────────────

  {
    id: "rule_doomscroll_heavy",
    priority: 60,
    enabled: true,
    category: "DOOMSCROLLING",
    severity: "HIGH",
    cooldownMinutes: 75,
    condition: (i: RoastInput) => (i.minutes ?? 0) >= 45,
  },

  {
    id: "rule_doomscroll_medium",
    priority: 55,
    enabled: true,
    category: "DOOMSCROLLING",
    severity: "MEDIUM",
    cooldownMinutes: 45,
    condition: (i: RoastInput) => (i.minutes ?? 0) >= 20,
  },

  // ── Priority 50 — Phone addiction ─────────────────────────────────────────

  {
    id: "rule_unlocks_extreme",
    priority: 52,
    enabled: true,
    category: "HIGH_UNLOCKS",
    severity: "HIGH",
    cooldownMinutes: 120,
    condition: (i: RoastInput) => i.unlockCount >= 100,
  },

  {
    id: "rule_unlocks_high",
    priority: 50,
    enabled: true,
    category: "HIGH_UNLOCKS",
    severity: "MEDIUM",
    cooldownMinutes: 90,
    condition: (i: RoastInput) => i.unlockCount >= 60,
  },

  // ── Priority 45 — Work hours distraction ──────────────────────────────────

  {
    id: "rule_work_hours_distraction",
    priority: 45,
    enabled: true,
    category: "WORK_HOURS",
    severity: "MEDIUM",
    cooldownMinutes: 90,
    condition: (i: RoastInput) =>
      i.weekday >= 1 &&
      i.weekday <= 5 &&
      i.hour >= 9 &&
      i.hour <= 17 &&
      (i.minutes ?? 0) >= 15,
  },

  // ── Priority 40 — End-of-day low productivity ─────────────────────────────

  {
    id: "rule_low_productivity_evening",
    priority: 40,
    enabled: true,
    category: "LOW_PRODUCTIVITY",
    severity: "HIGH",
    cooldownMinutes: 240,
    condition: (i: RoastInput) =>
      i.hour >= 20 && i.productivityScore < 30,
  },

  {
    id: "rule_low_productivity_afternoon",
    priority: 38,
    enabled: true,
    category: "LOW_PRODUCTIVITY",
    severity: "MEDIUM",
    cooldownMinutes: 180,
    condition: (i: RoastInput) =>
      i.hour >= 15 && i.hour < 20 && i.productivityScore < 40,
  },

  // ── Priority 35 — No gym ──────────────────────────────────────────────────

  {
    id: "rule_no_gym_evening",
    priority: 35,
    enabled: true,
    category: "NO_GYM",
    severity: "HIGH",
    cooldownMinutes: 1440, // once per day
    condition: (i: RoastInput) => !i.gymDone && i.hour >= 20,
  },

  {
    id: "rule_no_gym_midday",
    priority: 33,
    enabled: true,
    category: "NO_GYM",
    severity: "MEDIUM",
    cooldownMinutes: 360,
    condition: (i: RoastInput) => !i.gymDone && i.hour >= 12 && i.hour < 20,
  },

  // ── Priority 30 — Low water ───────────────────────────────────────────────

  {
    id: "rule_low_water_critical",
    priority: 32,
    enabled: true,
    category: "LOW_WATER",
    severity: "HIGH",
    cooldownMinutes: 180,
    condition: (i: RoastInput) => i.waterGlasses <= 1 && i.hour >= 18,
  },

  {
    id: "rule_low_water_medium",
    priority: 30,
    enabled: true,
    category: "LOW_WATER",
    severity: "MEDIUM",
    cooldownMinutes: 120,
    condition: (i: RoastInput) => i.waterGlasses <= 3 && i.hour >= 15,
  },

  // ── Priority 25 — No reading ──────────────────────────────────────────────

  {
    id: "rule_no_reading_evening",
    priority: 25,
    enabled: true,
    category: "NO_READING",
    severity: "MEDIUM",
    cooldownMinutes: 1440,
    condition: (i: RoastInput) => i.readingMinutes === 0 && i.hour >= 20,
  },

  // ── Priority 20 — Weekend ─────────────────────────────────────────────────

  {
    id: "rule_weekend_waste",
    priority: 20,
    enabled: true,
    category: "WEEKEND",
    severity: "MEDIUM",
    cooldownMinutes: 360,
    condition: (i: RoastInput) =>
      (i.weekday === 0 || i.weekday === 6) &&
      i.screenTimeMinutes >= 180 &&
      i.productivityScore < 50,
  },

  // ── Priority 15 — Social media ────────────────────────────────────────────

  {
    id: "rule_social_media_excess",
    priority: 15,
    enabled: true,
    category: "SOCIAL_MEDIA",
    severity: "LOW",
    cooldownMinutes: 90,
    condition: (i: RoastInput) => (i.minutes ?? 0) >= 30,
  },

  // ── Priority 10 — Good progress (positive reinforcement) ──────────────────

  {
    id: "rule_great_day",
    priority: 10,
    enabled: true,
    category: "GOOD_PROGRESS",
    severity: "LOW",
    cooldownMinutes: 1440,
    condition: (i: RoastInput) =>
      i.productivityScore >= 75 && i.gymDone && i.waterGlasses >= 6,
  },

  {
    id: "rule_decent_day",
    priority: 8,
    enabled: true,
    category: "GOOD_PROGRESS",
    severity: "LOW",
    cooldownMinutes: 720,
    condition: (i: RoastInput) => i.productivityScore >= 60 && i.gymDone,
  },
];

/** Returns rules sorted by priority descending, filtering out disabled rules. */
export function getActiveRules(): RoastRule[] {
  return RULES.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
}

/** Finds the first matching rule for the given input. */
export function matchRule(input: RoastInput): RoastRule | null {
  const rules = getActiveRules();
  return rules.find((r) => r.condition(input)) ?? null;
}
