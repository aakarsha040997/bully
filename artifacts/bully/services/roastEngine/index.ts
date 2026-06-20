/**
 * Roast Engine — main entry point.
 *
 * generateRoast(input) is the only function consumers need.
 * It runs the rule engine, selects a template, applies personality, and
 * returns a fully-formed RoastOutput ready for delivery.
 *
 * Does NOT read from storage or fire notifications.
 * Caller is responsible for recording cooldowns after delivery.
 */

import { matchRule } from "./rules";
import { selectTemplate, fillTemplate } from "./selector";
import { applyPersonality } from "./personalities";
import { getCategoryForApp } from "./categories";
import type { RoastInput, RoastOutput } from "./types";

export type { RoastInput, RoastOutput, Personality, RoastCategory, RoastSeverity, MonitoringDecision } from "./types";
export { PERSONALITY_LABELS } from "./personalities";
export { CATEGORY_LABELS } from "./categories";

/**
 * Generate a roast for the given input context.
 * Returns null if no rule matches (engine stays silent).
 */
export function generateRoast(input: RoastInput): RoastOutput | null {
  // Enrich input — infer category from the top app if not from a specific trigger
  const enriched: RoastInput = {
    ...input,
    packageName: input.packageName,
    appName: input.appName,
  };

  const rule = matchRule(enriched);
  if (!rule) return null;

  // Determine which category's templates to draw from.
  // If the rule's category is DOOMSCROLLING/BINGE/SOCIAL_MEDIA/WORK_HOURS,
  // let the app mapping further refine it.
  let category = rule.category;
  if (
    (category === "DOOMSCROLLING" ||
      category === "BINGE" ||
      category === "SOCIAL_MEDIA" ||
      category === "WORK_HOURS") &&
    input.packageName
  ) {
    category = getCategoryForApp(input.packageName, input.appName);
  }

  const template = selectTemplate(category, enriched);
  if (!template) return null;

  // Fill in placeholder variables
  const rawTitle = fillTemplate(template.title, enriched);
  const rawMessage = fillTemplate(template.message, enriched);

  // Apply personality transform
  const { title, message } = applyPersonality(
    rawTitle,
    rawMessage,
    enriched.personality,
    enriched,
  );

  return {
    id: template.id,
    title,
    message,
    severity: rule.severity,
    category,
    cooldownMinutes: rule.cooldownMinutes,
  };
}
