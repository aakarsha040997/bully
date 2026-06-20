import type { Personality, RoastInput } from "./types";

type Transform = (
  title: string,
  message: string,
  input: RoastInput,
) => { title: string; message: string };

// ─── Individual transforms ───────────────────────────────────────────────────

const gentle: Transform = (title, message) => ({
  title: "Hey, a quick check-in",
  message: `I noticed ${message.charAt(0).toLowerCase() + message.slice(1)} It's okay — we all have tough days. But your goals are still waiting. You can do this. 💙`,
});

const friend: Transform = (title, message, input) => {
  const openers = ["Bro...", "Okay but real talk —", "Dude.", "Fr fr,", "Yo,"];
  const opener = openers[input.unlockCount % openers.length];
  const closers = [
    "You got this tho.",
    "Just saying.",
    "I'm not judging but also I'm judging.",
    "No cap.",
  ];
  const closer = closers[input.screenTimeMinutes % closers.length];
  return {
    title,
    message: `${opener} ${message.charAt(0).toLowerCase() + message.slice(1)} ${closer}`,
  };
};

const sarcastic: Transform = (title, message, input) => {
  const opens = [
    "Wow, impressive.",
    "Oh sure, absolutely.",
    "Great job today.",
    "Stellar work.",
    "Peak performance right here.",
  ];
  const open = opens[input.hour % opens.length];
  return {
    title: open,
    message: `${message} Truly inspiring stuff.`,
  };
};

const savage: Transform = (_title, message) => ({
  title: "Let's be real.",
  message: `${message} No filter. No excuses. Fix it.`,
});

const gymBro: Transform = (title, message, input) => {
  const gymRefs = [
    "This is not a PR worth celebrating.",
    "Your discipline muscles are atrophying.",
    "You wouldn't skip leg day this hard.",
    "That's not the gains mindset.",
    "Even your rest days have more structure.",
  ];
  const ref = gymRefs[input.productivityScore % gymRefs.length];
  return {
    title: "NO DAYS OFF",
    message: `${message} ${ref} Get after it.`,
  };
};

const corporateBoss: Transform = (_title, message, input) => {
  const subject = `Re: Performance Concerns — ${new Date().toLocaleDateString(
    "en-US",
    { weekday: "long" },
  )}`;
  const kpis = [
    "Your KPIs are not aligning with our Q4 objectives.",
    "This does not reflect our core value of excellence.",
    "Please action this immediately to course-correct.",
    "I'll need a written explanation for this by EOD.",
  ];
  const kpi = kpis[input.waterGlasses % kpis.length];
  return {
    title: subject,
    message: `Per our last check-in: ${message.charAt(0).toLowerCase() + message.slice(1)} ${kpi}`,
  };
};

const indianMom: Transform = (_title, message, input) => {
  const betaOpens = [
    "Beta,",
    "Arre yaar,",
    "Sun,",
    "Hai Ram,",
    "Tch, tch, tch.",
  ];
  const open = betaOpens[input.unlockCount % betaOpens.length];
  const comparisons = [
    "Sharma ji ka beta would never.",
    "Your cousin Rahul is already doing so well and you're doing THIS?",
    "What will people think?",
    "I didn't sacrifice everything for this, beta.",
    "Log kya kahenge?",
  ];
  const comparison = comparisons[input.hour % comparisons.length];
  return {
    title: `${open} I'm worried about you.`,
    message: `${open} ${message.charAt(0).toLowerCase() + message.slice(1)} ${comparison}`,
  };
};

const animeVillain: Transform = (_title, message, input) => {
  const openers = [
    "Pathetic.",
    "Tch.",
    "How disappointing.",
    "Just as I expected from you.",
    "Your power level is embarrassing.",
  ];
  const closers = [
    "The protagonist arc you speak of remains dormant.",
    "Your potential remains sealed. Tragic.",
    "You are not worthy of the final boss yet.",
    "Even my weakest minion has more discipline.",
  ];
  const opener = openers[input.productivityScore % openers.length];
  const closer = closers[input.hour % closers.length];
  return {
    title: opener,
    message: `${message} ${closer}`,
  };
};

// ─── Personality map ─────────────────────────────────────────────────────────

export const PERSONALITY_TRANSFORMS: Record<Personality, Transform> = {
  GENTLE: gentle,
  FRIEND: friend,
  SARCASTIC: sarcastic,
  SAVAGE: savage,
  GYM_BRO: gymBro,
  CORPORATE_BOSS: corporateBoss,
  INDIAN_MOM: indianMom,
  ANIME_VILLAIN: animeVillain,
};

export const PERSONALITY_LABELS: Record<Personality, string> = {
  GENTLE: "Gentle",
  FRIEND: "Supportive Friend",
  SARCASTIC: "Sarcastic",
  SAVAGE: "Savage",
  GYM_BRO: "Gym Bro",
  CORPORATE_BOSS: "Corporate Boss",
  INDIAN_MOM: "Indian Mom",
  ANIME_VILLAIN: "Anime Villain",
};

export function applyPersonality(
  title: string,
  message: string,
  personality: Personality,
  input: RoastInput,
): { title: string; message: string } {
  return PERSONALITY_TRANSFORMS[personality](title, message, input);
}
