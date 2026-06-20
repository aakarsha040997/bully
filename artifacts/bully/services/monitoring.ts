/**
 * Monitoring Engine — pure decision maker.
 *
 * Responsibilities:
 *   1. Read Android UsageStats (source of truth)
 *   2. Build RoastInput from current context
 *   3. Run the rule + roast engine
 *   4. Check cooldowns / global throttle
 *   5. Return a MonitoringDecision
 *
 * Does NOT know React exists.
 * Does NOT know which screen is visible.
 * Calls notifications.sendRoastNotification() for delivery only when
 * the trigger-and-notify helpers are used.
 *
 * Architecture note: WorkManager (background 15-min polling) will call
 * runMonitoringCycle() directly once implemented. For now the app calls
 * it on mount and when thresholds are crossed.
 */

import { getAppUsageStats } from "./usageStats";
import { generateRoast } from "./roastEngine";
import type { RoastInput, MonitoringDecision } from "./roastEngine/types";
import type { Personality, RoastTrigger } from "./roastEngine/types";
import {
  isOnCooldown,
  setCooldown,
  getRecentRoastIds,
  recordRoastId,
} from "./roastEngine/cooldowns";
import {
  getPersonality,
  getLastThreshold,
  setLastThreshold,
  isGlobalThrottled,
  setLastNotificationTs,
  setLastRoast,
} from "./storage";
import { sendRoastNotification } from "./notifications";

export interface MonitoringContext {
  productivityScore: number;
  gymDone: boolean;
  waterGlasses: number;
  readingMinutes: number;
  unlockCount: number;
  screenTimeMinutes: number;
  streak: number;
  personality?: Personality;
}

// ─── Core decision function ───────────────────────────────────────────────────

/**
 * Build and evaluate a MonitoringDecision.
 * Does NOT fire any notifications — pure decision-making.
 */
async function buildDecision(
  ctx: MonitoringContext,
  trigger: RoastTrigger,
): Promise<MonitoringDecision> {
  // Read real usage from Android (or fall back to passed-in ctx values)
  const usageStats = await getAppUsageStats();
  const topApp = usageStats[0] ?? null;
  const realScreenTime =
    usageStats.length > 0
      ? usageStats.reduce((s, a) => s + a.totalMinutes, 0)
      : ctx.screenTimeMinutes;

  const now = new Date();
  const personality = ctx.personality ?? (await getPersonality());
  const previousRoastIds = await getRecentRoastIds();

  const input: RoastInput = {
    appName: topApp?.appName,
    packageName: topApp?.packageName,
    minutes: topApp?.totalMinutes,
    hour: now.getHours(),
    weekday: now.getDay(),
    productivityScore: ctx.productivityScore,
    gymDone: ctx.gymDone,
    waterGlasses: ctx.waterGlasses,
    readingMinutes: ctx.readingMinutes,
    unlockCount: ctx.unlockCount,
    screenTimeMinutes: realScreenTime,
    personality,
    streak: ctx.streak,
    previousRoastIds,
    trigger,
  };

  const roast = generateRoast(input);

  if (!roast) {
    return { shouldNotify: false, roast: null, reason: "no_rule_matched" };
  }

  const onCooldown = await isOnCooldown(roast.id);
  if (onCooldown) {
    return { shouldNotify: false, roast, reason: "on_cooldown" };
  }

  return { shouldNotify: true, roast, reason: "rule_matched" };
}

// ─── Trigger-and-notify helpers (the only place notifications get fired) ──────

/**
 * Run a full monitoring cycle.
 * Evaluates all rules and fires a notification if warranted.
 * Intended for periodic calls (WorkManager, app foreground refresh).
 */
export async function runMonitoringCycle(ctx: MonitoringContext): Promise<MonitoringDecision> {
  try {
    const throttled = await isGlobalThrottled(5);
    if (throttled) {
      return { shouldNotify: false, roast: null, reason: "on_cooldown" };
    }

    const decision = await buildDecision(ctx, "DAILY_CHECK");

    if (decision.shouldNotify && decision.roast) {
      await sendRoastNotification(decision.roast.title, decision.roast.message, decision.roast.severity);
      await setCooldown(decision.roast.id, decision.roast.cooldownMinutes);
      await recordRoastId(decision.roast.id);
      await setLastRoast(decision.roast);
      await setLastNotificationTs();
    }

    return decision;
  } catch {
    return { shouldNotify: false, roast: null, reason: "no_rule_matched" };
  }
}

/**
 * Triggered when screen-time crosses the user's daily limit.
 * Uses a threshold guard to avoid re-firing for the same crossing.
 */
export async function triggerScreenTimeAlert(
  ctx: MonitoringContext,
): Promise<void> {
  try {
    const lastThreshold = await getLastThreshold();
    // Only fire once per 30-minute increment above the limit
    const currentBucket = Math.floor(ctx.screenTimeMinutes / 30);
    const lastBucket = Math.floor(lastThreshold / 30);

    if (currentBucket <= lastBucket) return; // already fired at this level

    const decision = await buildDecision(ctx, "SCREEN_TIME_LIMIT");

    if (decision.shouldNotify && decision.roast) {
      await sendRoastNotification(decision.roast.title, decision.roast.message, decision.roast.severity);
      await setCooldown(decision.roast.id, decision.roast.cooldownMinutes);
      await recordRoastId(decision.roast.id);
      await setLastRoast(decision.roast);
      await setLastNotificationTs();
      await setLastThreshold(ctx.screenTimeMinutes);
    }
  } catch {
    // Silent fail — screen-time alert is best-effort
  }
}

/**
 * Manual verdict request from the dashboard.
 * Returns the decision so the UI can display the roast text inline.
 */
export async function requestManualRoast(
  ctx: MonitoringContext,
): Promise<MonitoringDecision> {
  try {
    const decision = await buildDecision(ctx, "MANUAL");

    if (decision.shouldNotify && decision.roast) {
      await recordRoastId(decision.roast.id);
      await setLastRoast(decision.roast);
    }

    return decision;
  } catch {
    return { shouldNotify: false, roast: null, reason: "no_rule_matched" };
  }
}
