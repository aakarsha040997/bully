export type Personality = "gentle" | "sarcastic" | "savage" | "gym" | "friend";

export interface RoastContext {
  appName: string;
  minutes: number;
  hour?: number;
  personality?: Personality;
}

const ROASTS = {
  instagram: {
    15: [
      "15 minutes already. Instagram isn't going anywhere.",
      "Quick check? That was 15 minutes ago.",
      "You've been scrolling long enough to forget why you opened it.",
    ],
    30: [
      "30 minutes. Your future is still waiting.",
      "Half an hour disappeared. The reels will survive without you.",
      "You've watched enough strangers for one session.",
    ],
    60: [
      "An hour. Even Instagram is impressed by your commitment.",
      "You've officially spent an hour training your thumb.",
      "That's one hour you'll never get back.",
    ],
  },

  youtube: {
    15: [
      "One more video turned into fifteen minutes.",
      "YouTube always wins if you don't leave.",
      "You're deep in the recommendation rabbit hole.",
    ],
    30: [
      "Thirty minutes later and somehow you're watching a guy restore a toaster.",
      "Algorithms: 1. You: 0.",
      "Half an hour gone.",
    ],
    60: [
      "One hour on YouTube. Educational? Be honest.",
      "You came for one video. The algorithm had other plans.",
      "Congratulations. You're now a full-time viewer.",
    ],
  },

  reddit: {
    15: [
      "Still reading arguments you'll forget tomorrow?",
      "Reddit will always have another opinion.",
      "You don't need to win every internet debate.",
    ],
    30: [
      "Thirty minutes of reading comments from strangers.",
      "You've consumed enough hot takes for today.",
      "Close Reddit before Reddit closes your productivity.",
    ],
    60: [
      "One hour on Reddit. The comments weren't worth it.",
      "You've unlocked Professional Doomscroller.",
      "Time to return to real life.",
    ],
  },

  generic: {
    15: [
      "Fifteen minutes gone.",
      "Back to reality?",
      "Tiny distractions become big regrets.",
    ],
    30: [
      "Thirty minutes later...",
      "This app isn't building your future.",
      "Time to close it.",
    ],
    60: [
      "One hour disappeared.",
      "You've been here longer than planned.",
      "Let's do something future-you will appreciate.",
    ],
  },
};

function level(minutes: number): 15 | 30 | 60 {
  if (minutes >= 60) return 60;
  if (minutes >= 30) return 30;
  return 15;
}

function random<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateRoast(context: RoastContext): string {
  const app = context.appName.toLowerCase();

  let category: "instagram" | "youtube" | "reddit" | "generic" = "generic";

  if (app.includes("instagram")) category = "instagram";
  else if (app.includes("youtube")) category = "youtube";
  else if (app.includes("reddit")) category = "reddit";

  const bucket = level(context.minutes);

  const options = ROASTS[category][bucket];

  return random(options);
}
