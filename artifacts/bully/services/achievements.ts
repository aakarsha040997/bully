/**
 * Achievement engine.
 *
 * Achievements are defined as pure check functions against DailyStats,
 * Streaks, and history. To add a new achievement: add one entry to
 * ACHIEVEMENT_DEFS. No other changes needed.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyStats, Streaks, DailyRecord } from "@/context/AppContext";

export type AchievementCategory =
  | "streak"
  | "productivity"
  | "focus"
  | "health"
  | "consistency";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockedAt?: string;
}

export interface AchievementCheckData {
  stats: DailyStats;
  streaks: Streaks;
  history: DailyRecord[];
  score: number;
}

interface AchievementDef extends Omit<Achievement, "unlockedAt"> {
  check: (data: AchievementCheckData) => boolean;
}

// ─── Rarity colors ─────────────────────────────────────────────────────────────

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "#9E9E9E",
  rare: "#2196F3",
  epic: "#9C27B0",
  legendary: "#FF9800",
};

// ─── Achievement definitions ────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_steps",
    title: "First Steps",
    description: "Log your first day of stats.",
    icon: "shoe-print",
    category: "productivity",
    rarity: "common",
    check: ({ stats }) =>
      stats.screenTimeMinutes > 0 ||
      stats.waterGlasses > 0 ||
      stats.gymDone ||
      stats.readingMinutes > 0,
  },
  {
    id: "gym_day",
    title: "Showed Up",
    description: "Complete your first workout.",
    icon: "dumbbell",
    category: "health",
    rarity: "common",
    check: ({ stats }) => stats.gymDone,
  },
  {
    id: "reader",
    title: "Actually Read",
    description: "Log 30+ minutes of reading.",
    icon: "book-open-variant",
    category: "productivity",
    rarity: "common",
    check: ({ stats }) => stats.readingMinutes >= 30,
  },
  {
    id: "no_shorts",
    title: "Shorts Survivor",
    description: "Log zero shorts watched for a day (while tracking).",
    icon: "youtube-off",
    category: "focus",
    rarity: "common",
    check: ({ stats }) =>
      stats.shortsWatched === 0 && stats.screenTimeMinutes > 0,
  },
  {
    id: "hydrated",
    title: "Actually Hydrated",
    description: "Drink 8 glasses of water in a day.",
    icon: "cup-water",
    category: "health",
    rarity: "common",
    check: ({ stats }) => stats.waterGlasses >= 8,
  },
  {
    id: "digital_detox",
    title: "Digital Detox",
    description: "Stay under 2 hours total screen time.",
    icon: "cellphone-off",
    category: "focus",
    rarity: "rare",
    check: ({ stats }) =>
      stats.screenTimeMinutes > 0 && stats.screenTimeMinutes <= 120,
  },
  {
    id: "unlock_low",
    title: "Phone Discipline",
    description: "Fewer than 30 phone unlocks in a day.",
    icon: "cellphone-lock",
    category: "focus",
    rarity: "rare",
    check: ({ stats }) =>
      stats.unlockCount > 0 && stats.unlockCount < 30,
  },
  {
    id: "high_achiever",
    title: "High Achiever",
    description: "Score 80+ in a single day.",
    icon: "star",
    category: "productivity",
    rarity: "rare",
    check: ({ score }) => score >= 80,
  },
  {
    id: "gym_3",
    title: "Habit Forming",
    description: "Hit the gym 3 days in a row.",
    icon: "fire",
    category: "streak",
    rarity: "common",
    check: ({ streaks }) => streaks.gym >= 3,
  },
  {
    id: "gym_7",
    title: "Iron Week",
    description: "Complete a 7-day gym streak.",
    icon: "lightning-bolt",
    category: "streak",
    rarity: "rare",
    check: ({ streaks }) => streaks.gym >= 7,
  },
  {
    id: "bookworm",
    title: "Bookworm",
    description: "Log 60+ minutes of reading in one day.",
    icon: "bookshelf",
    category: "productivity",
    rarity: "rare",
    check: ({ stats }) => stats.readingMinutes >= 60,
  },
  {
    id: "perfect_day",
    title: "Perfect Day",
    description: "Score 90+ in a single day.",
    icon: "trophy",
    category: "productivity",
    rarity: "epic",
    check: ({ score }) => score >= 90,
  },
  {
    id: "comeback_kid",
    title: "Comeback Kid",
    description: "Score 70+ after a day under 40.",
    icon: "trending-up",
    category: "consistency",
    rarity: "epic",
    check: ({ history, score }) =>
      score >= 70 && history.length > 0 && history[0].score < 40,
  },
  {
    id: "reading_streak",
    title: "Scholar",
    description: "Read every day for a week.",
    icon: "school",
    category: "streak",
    rarity: "epic",
    check: ({ streaks }) => streaks.reading >= 7,
  },
  {
    id: "consistent_week",
    title: "Consistent",
    description: "Score 60+ for 5 out of 7 days.",
    icon: "chart-line",
    category: "consistency",
    rarity: "epic",
    check: ({ history, score }) => {
      const all = [{ score } as DailyRecord, ...history].slice(0, 7);
      return all.filter((r) => r.score >= 60).length >= 5;
    },
  },
  {
    id: "gym_30",
    title: "Iron Month",
    description: "Maintain a 30-day gym streak.",
    icon: "crown",
    category: "streak",
    rarity: "legendary",
    check: ({ streaks }) => streaks.gym >= 30,
  },
  {
    id: "unplugged",
    title: "Unplugged",
    description: "Average under 2h screen time for 5 consecutive days.",
    icon: "wifi-off",
    category: "focus",
    rarity: "legendary",
    check: ({ history }) => {
      const recent = history.slice(0, 5);
      if (recent.length < 5) return false;
      const avg =
        recent.reduce((a, r) => a + r.stats.screenTimeMinutes, 0) / 5;
      return avg <= 120;
    },
  },
  {
    id: "week_warrior",
    title: "Week Warrior",
    description: "Reach a 7-day streak of any kind.",
    icon: "shield-star",
    category: "streak",
    rarity: "rare",
    check: ({ streaks }) =>
      Math.max(streaks.gym, streaks.reading, streaks.study, streaks.noDoomscroll) >= 7,
  },
];

// ─── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@bully_achievements";

export async function loadAchievements(): Promise<Achievement[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function checkAndUnlock(
  data: AchievementCheckData,
  existing: Achievement[]
): Promise<Achievement[]> {
  const existingIds = new Set(existing.map((a) => a.id));
  const newlyUnlocked: Achievement[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (existingIds.has(def.id)) continue;
    if (def.check(data)) {
      newlyUnlocked.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    const updated = [...existing, ...newlyUnlocked];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newlyUnlocked;
}

export function getNextAchievement(
  unlockedIds: Set<string>
): AchievementDef | null {
  const rarityOrder: Record<AchievementRarity, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
  };
  const unearned = ACHIEVEMENT_DEFS.filter((d) => !unlockedIds.has(d.id));
  if (unearned.length === 0) return null;
  return unearned.sort(
    (a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]
  )[0];
}

export function getAllWithStatus(
  unlocked: Achievement[]
): Array<AchievementDef & { unlockedAt?: string }> {
  const unlockedMap = new Map(unlocked.map((a) => [a.id, a.unlockedAt]));
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlockedAt: unlockedMap.get(def.id),
  }));
}
