/**
 * Roast Engine — main entry point.
 *
 * generateRoast(input) is the only function consumers need.
 * It runs the rule engine, selects a template from the personality-specific
 * JSON file, fills in placeholders, and returns a RoastOutput ready for delivery.
 *
 * Templates are pre-flavored per personality — no post-transform is applied.
 * To add a new personality pack: drop a JSON file in assets/roasts/ and add
 * an entry in services/roastEngine/templates.ts. No engine changes needed.
 *
 * Does NOT read from storage or fire notifications.
 * Caller is responsible for recording cooldowns after delivery.
 */

import { matchRule } from "./rules";
import { selectTemplate, fillTemplate } from "./selector";
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
  const enriched: RoastInput = { ...input };

  const rule = matchRule(enriched);
  if (!rule) return null;

  // Optionally refine category using the app → category map
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

  // Templates are pre-flavored for the user's personality — fill placeholders only
  const title = fillTemplate(template.title, enriched);
  const message = fillTemplate(template.message, enriched);

  return {
    id: template.id,
    title,
    message,
    severity: rule.severity,
    category,
    cooldownMinutes: rule.cooldownMinutes,
  };
}
