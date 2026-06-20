/**
 * Modular productivity score engine.
 *
 * Score range: 0–100
 * Each factor contributes a positive or negative delta from a base of 50.
 * Adding a new factor = add one entry to FACTOR_DEFS. No other changes needed.
 */

import type { DailyStats, Streaks, DailyRecord } from "@/context/AppContext";

export interface ScoreFactor {
  id: string;
  label: string;
  points: number;
  icon: string;
}

export interface ScoreResult {
  score: number;
  factors: ScoreFactor[];
  topWin: ScoreFactor | null;
  topDistraction: ScoreFactor | null;
  reason: string;
}

export type ScoreTrend = "up" | "down" | "stable";

// ─── Factor calculators ────────────────────────────────────────────────────────

type FactorInput = { stats: DailyStats; streaks: Streaks };

interface FactorDef {
  id: string;
  label: string;
  icon: string;
  calc: (input: FactorInput) => number;
}

const FACTOR_DEFS: FactorDef[] = [
  {
    id: "screen_time",
    label: "Screen Time",
    icon: "cellphone",
    calc: ({ stats }) => -Math.min(25, Math.floor(stats.screenTimeMinutes / 12)),
  },
  {
    id: "entertainment",
    label: "Shorts / Reels",
    icon: "youtube",
    calc: ({ stats }) => -Math.min(10, Math.floor(stats.shortsWatched / 10)),
  },
  {
    id: "unlocks",
    label: "Phone Unlocks",
    icon: "cellphone-lock",
    calc: ({ stats }) =>
      stats.unlockCount > 50
        ? -Math.min(5, Math.floor((stats.unlockCount - 50) / 10))
        : 0,
  },
  {
    id: "gym",
    label: "Workout Done",
    icon: "dumbbell",
    calc: ({ stats }) => (stats.gymDone ? 20 : 0),
  },
  {
    id: "reading",
    label: "Reading",
    icon: "book-open-variant",
    calc: ({ stats }) => Math.min(10, Math.floor(stats.readingMinutes / 15)),
  },
  {
    id: "water",
    label: "Hydration",
    icon: "cup-water",
    calc: ({ stats }) => Math.min(10, stats.waterGlasses * 2),
  },
  {
    id: "streak",
    label: "Streak Bonus",
    icon: "fire",
    calc: ({ streaks }) => {
      const best = Math.max(streaks.gym, streaks.reading, streaks.study);
      if (best >= 7) return 5;
      if (best >= 3) return 3;
      return 0;
    },
  },
];

// ─── Main calculation ──────────────────────────────────────────────────────────

export function calculateScore(
  stats: DailyStats,
  streaks: Streaks
): ScoreResult {
  const input: FactorInput = { stats, streaks };
  const factors: ScoreFactor[] = [];

  let score = 50;

  for (const def of FACTOR_DEFS) {
    const points = def.calc(input);
    if (points !== 0) {
      factors.push({ id: def.id, label: def.label, icon: def.icon, points });
      score += points;
    }
  }

  score = Math.max(0, Math.min(100, score));

  const positives = factors
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points);
  const negatives = factors
    .filter((f) => f.points < 0)
    .sort((a, b) => a.points - b.points);

  const topWin = positives[0] ?? null;
  const topDistraction = negatives[0] ?? null;

  let reason: string;
  if (score >= 80) {
    reason = topWin
      ? `${topWin.label} is carrying today.`
      : "Strong day across the board.";
  } else if (score >= 60) {
    reason = topWin
      ? `${topWin.label} helped today.`
      : "Decent day. Room to grow.";
  } else if (score >= 40) {
    reason = topDistraction
      ? `${topDistraction.label} dragged the score.`
      : "Mixed signals today.";
  } else {
    reason = topDistraction
      ? `${topDistraction.label} is the main culprit.`
      : "Low output day. Tomorrow is different.";
  }

  return { score, factors, topWin, topDistraction, reason };
}

// ─── History helpers ────────────────────────────────────────────────────────────

export function weeklyAverage(history: DailyRecord[]): number {
  if (history.length === 0) return 0;
  return Math.round(
    history.reduce((sum, r) => sum + r.score, 0) / history.length
  );
}

export function scoreTrend(
  history: DailyRecord[],
  todayScore: number
): ScoreTrend {
  if (history.length === 0) return "stable";
  const sample = history.slice(0, 3);
  const avg = sample.reduce((s, r) => s + r.score, 0) / sample.length;
  if (todayScore > avg + 5) return "up";
  if (todayScore < avg - 5) return "down";
  return "stable";
}
