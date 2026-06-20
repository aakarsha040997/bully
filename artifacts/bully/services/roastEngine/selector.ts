import type { RoastTemplate, RoastCategory, RoastInput } from "./types";
import { getTemplatesForPersonality } from "./templates";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Format raw screen-time minutes to a human-readable string, e.g. "2h 15m".
 */
function formatScreenTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Compute an effective weight for a template given the input context.
 * Recently shown templates get heavily penalised to avoid repetition.
 */
function effectiveWeight(template: RoastTemplate, recentIds: string[]): number {
  const recencyIndex = recentIds.indexOf(template.id);
  if (recencyIndex === -1) return template.weight;
  const penalty = Math.pow(0.8, recencyIndex + 1);
  return Math.max(1, template.weight * penalty);
}

/**
 * Weighted random selection from an array of (item, weight) pairs.
 */
function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let rand = Math.random() * total;
  for (const { item, weight } of items) {
    rand -= weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1].item;
}

/**
 * Select the best template for the given category and input context.
 * Pulls templates from the personality-specific JSON file so the tone is
 * already baked in — no post-transform needed.
 * Falls back to any template in the category if all are on cooldown.
 */
export function selectTemplate(category: RoastCategory, input: RoastInput): RoastTemplate | null {
  const pool = getTemplatesForPersonality(input.personality);
  const candidates = pool.filter((t) => t.category === category);
  if (candidates.length === 0) return null;

  const weighted = candidates.map((t) => ({
    item: t,
    weight: effectiveWeight(t, input.previousRoastIds),
  }));

  return weightedRandom(weighted);
}

/**
 * Fill a template's message/title string with runtime values from the input.
 * Supports all placeholders used in the JSON template files:
 *   {app}          — top app display name
 *   {topApp}       — alias for {app}
 *   {minutes}      — minutes spent on the app (or total screen time)
 *   {screenTime}   — formatted total screen time, e.g. "2h 15m"
 *   {score}        — productivity score 0–100
 *   {waterGlasses} — glasses of water logged
 *   {glasses}      — alias for {waterGlasses} (legacy)
 *   {unlockCount}  — phone unlock count
 *   {unlocks}      — alias for {unlockCount} (legacy)
 *   {streak}       — current streak in days
 *   {hour}         — current hour 0–23
 *   {weekday}      — day name, e.g. "Saturday"
 */
export function fillTemplate(template: string, input: RoastInput): string {
  const appName = input.appName || "that app";
  const minutes = String(input.minutes ?? input.screenTimeMinutes);
  const screenTime = formatScreenTime(input.screenTimeMinutes);
  const weekday = WEEKDAY_NAMES[input.weekday] ?? "today";

  return template
    .replace(/{app}/g, appName)
    .replace(/{topApp}/g, appName)
    .replace(/{minutes}/g, minutes)
    .replace(/{screenTime}/g, screenTime)
    .replace(/{score}/g, String(input.productivityScore))
    .replace(/{waterGlasses}/g, String(input.waterGlasses))
    .replace(/{glasses}/g, String(input.waterGlasses))
    .replace(/{unlockCount}/g, String(input.unlockCount))
    .replace(/{unlocks}/g, String(input.unlockCount))
    .replace(/{streak}/g, String(input.streak))
    .replace(/{hour}/g, String(input.hour))
    .replace(/{weekday}/g, weekday);
}
