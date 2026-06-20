import type { RoastTemplate, RoastCategory, RoastInput } from "./types";
import { TEMPLATES } from "./templates";

/**
 * Compute an effective weight for a template given the input context.
 * Recently shown templates get heavily penalised.
 */
function effectiveWeight(
  template: RoastTemplate,
  recentIds: string[],
): number {
  const recencyIndex = recentIds.indexOf(template.id);
  if (recencyIndex === -1) return template.weight;

  // Exponential penalty: first repeat is ~80% likely, 10th repeat is ~10%
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
 * Falls back to any template in the category if all are on cooldown.
 */
export function selectTemplate(
  category: RoastCategory,
  input: RoastInput,
): RoastTemplate | null {
  const candidates = TEMPLATES.filter((t) => t.category === category);
  if (candidates.length === 0) return null;

  const weighted = candidates.map((t) => ({
    item: t,
    weight: effectiveWeight(t, input.previousRoastIds),
  }));

  return weightedRandom(weighted);
}

/**
 * Fill a template's message string with values from the input.
 */
export function fillTemplate(template: string, input: RoastInput): string {
  return template
    .replace(/{app}/g, input.appName || "that app")
    .replace(/{minutes}/g, String(input.minutes ?? input.screenTimeMinutes))
    .replace(/{score}/g, String(input.productivityScore))
    .replace(/{glasses}/g, String(input.waterGlasses))
    .replace(/{unlocks}/g, String(input.unlockCount))
    .replace(/{streak}/g, String(input.streak));
}
