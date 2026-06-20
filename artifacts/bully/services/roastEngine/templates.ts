import type { RoastTemplate, Personality } from "./types";

const gentleTemplates: RoastTemplate[] = require("../../assets/roasts/gentle.json");
const friendTemplates: RoastTemplate[] = require("../../assets/roasts/friend.json");
const sarcasticTemplates: RoastTemplate[] = require("../../assets/roasts/sarcastic.json");
const savageTemplates: RoastTemplate[] = require("../../assets/roasts/savage.json");
const gymTemplates: RoastTemplate[] = require("../../assets/roasts/gym.json");
const bossTemplates: RoastTemplate[] = require("../../assets/roasts/boss.json");
const indianMomTemplates: RoastTemplate[] = require("../../assets/roasts/indianMom.json");
const animeVillainTemplates: RoastTemplate[] = require("../../assets/roasts/animeVillain.json");

const PERSONALITY_TEMPLATE_MAP: Record<Personality, RoastTemplate[]> = {
  GENTLE: gentleTemplates,
  FRIEND: friendTemplates,
  SARCASTIC: sarcasticTemplates,
  SAVAGE: savageTemplates,
  GYM_BRO: gymTemplates,
  CORPORATE_BOSS: bossTemplates,
  INDIAN_MOM: indianMomTemplates,
  ANIME_VILLAIN: animeVillainTemplates,
};

/**
 * Returns the template library for the given personality.
 * Each personality ships its own JSON file so new packs can be added
 * without touching the engine — just drop a new JSON file and add an entry here.
 */
export function getTemplatesForPersonality(personality: Personality): RoastTemplate[] {
  return PERSONALITY_TEMPLATE_MAP[personality] ?? savageTemplates;
}
