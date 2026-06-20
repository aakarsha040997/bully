import type { RoastTemplate } from "./types";

/**
 * Master template library.
 * Placeholders: {app} {minutes} {score} {glasses} {unlocks} {streak}
 * Weight: 10 = normal, 15 = preferred, 5 = rare/harsh
 */
export const TEMPLATES: RoastTemplate[] = [
  // ─── DOOMSCROLLING ──────────────────────────────────────────────────────────

  {
    id: "doom_001",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "Still scrolling?",
    message:
      "{minutes} minutes on {app}. The algorithm doesn't care about your goals. You should.",
  },
  {
    id: "doom_002",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "You're being farmed.",
    message:
      "You've spent {minutes} minutes feeding {app}'s engagement metrics. What did you get in return?",
  },
  {
    id: "doom_003",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "Infinite scroll, finite life.",
    message:
      "{minutes} minutes on {app}. That's {minutes} minutes you can't get back. Was any of it worth remembering?",
  },
  {
    id: "doom_004",
    category: "DOOMSCROLLING",
    weight: 15,
    title: "The scroll never ends.",
    message:
      "You opened {app} for 'just a minute'. {minutes} minutes later, here we are.",
  },
  {
    id: "doom_005",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "Reality check.",
    message:
      "Every person you're watching on {app} is doing something with their life. You're watching them do it.",
  },
  {
    id: "doom_006",
    category: "DOOMSCROLLING",
    weight: 5,
    title: "Pathetic.",
    message:
      "{minutes} minutes of {app}. Your brain is running on dopamine scraps. You're better than this.",
  },
  {
    id: "doom_007",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "Put it down.",
    message:
      "The content on {app} will still be there tomorrow. Your goals, however, are aging faster than you think.",
  },
  {
    id: "doom_008",
    category: "DOOMSCROLLING",
    weight: 10,
    title: "You're not relaxing.",
    message:
      "Scrolling {app} for {minutes} minutes isn't rest. It's anxiety with better thumbnails.",
  },

  // ─── LATE_NIGHT ─────────────────────────────────────────────────────────────

  {
    id: "night_001",
    category: "LATE_NIGHT",
    weight: 10,
    title: "What are you doing?",
    message:
      "It's past midnight and you're on your phone. Tomorrow's version of you is already exhausted.",
  },
  {
    id: "night_002",
    category: "LATE_NIGHT",
    weight: 10,
    title: "No growth happens at midnight.",
    message:
      "Nothing productive has ever started at this hour. Put the phone down and sleep.",
  },
  {
    id: "night_003",
    category: "LATE_NIGHT",
    weight: 10,
    title: "Sleep debt is real.",
    message:
      "Every hour you lose tonight will cost you two hours of focus tomorrow. Do the math.",
  },
  {
    id: "night_004",
    category: "LATE_NIGHT",
    weight: 15,
    title: "Stop.",
    message:
      "The phone goes down. Right now. Your future self is begging you.",
  },
  {
    id: "night_005",
    category: "LATE_NIGHT",
    weight: 10,
    title: "Night owls don't win.",
    message:
      "You're not a night owl. You're just someone with bad habits who keeps telling himself that story.",
  },
  {
    id: "night_006",
    category: "LATE_NIGHT",
    weight: 5,
    title: "Dead serious.",
    message:
      "Consistent late nights are how people waste entire years. This is not a drill.",
  },

  // ─── BINGE ──────────────────────────────────────────────────────────────────

  {
    id: "binge_001",
    category: "BINGE",
    weight: 10,
    title: "One more episode.",
    message:
      "{minutes} minutes of {app}. You said one episode. I was watching.",
  },
  {
    id: "binge_002",
    category: "BINGE",
    weight: 10,
    title: "That's a lot of content.",
    message:
      "You've watched {minutes} minutes of {app} today. Meanwhile your actual life is buffering.",
  },
  {
    id: "binge_003",
    category: "BINGE",
    weight: 10,
    title: "Entertainment ≠ rest.",
    message:
      "{minutes} minutes on {app} isn't relaxation. It's procrastination with a better soundtrack.",
  },
  {
    id: "binge_004",
    category: "BINGE",
    weight: 15,
    title: "The show will wait.",
    message:
      "{app} will still be there after you do something real. The reverse is not guaranteed.",
  },
  {
    id: "binge_005",
    category: "BINGE",
    weight: 10,
    title: "Characters > your goals?",
    message:
      "You're emotionally invested in fictional characters while your actual story has zero plot development.",
  },
  {
    id: "binge_006",
    category: "BINGE",
    weight: 5,
    title: "Couch rot.",
    message:
      "{minutes} minutes of {app}. Your potential is actively decomposing.",
  },

  // ─── LOW_PRODUCTIVITY ───────────────────────────────────────────────────────

  {
    id: "low_prod_001",
    category: "LOW_PRODUCTIVITY",
    weight: 10,
    title: "Score: {score}",
    message:
      "A productivity score of {score} isn't a number — it's a confession.",
  },
  {
    id: "low_prod_002",
    category: "LOW_PRODUCTIVITY",
    weight: 10,
    title: "Be honest with yourself.",
    message:
      "{score}/100 today. You know what you spent your time on. The question is whether you're okay with that.",
  },
  {
    id: "low_prod_003",
    category: "LOW_PRODUCTIVITY",
    weight: 15,
    title: "Today's forecast: wasted.",
    message:
      "Your productivity score is {score}. This is not who you said you wanted to be.",
  },
  {
    id: "low_prod_004",
    category: "LOW_PRODUCTIVITY",
    weight: 10,
    title: "The gap is widening.",
    message:
      "Every low-output day is a deposit into the 'falling behind' account. Balance: growing.",
  },
  {
    id: "low_prod_005",
    category: "LOW_PRODUCTIVITY",
    weight: 10,
    title: "Mediocrity is a choice.",
    message:
      "You didn't accidentally score {score} today. You made a series of small choices that got you here.",
  },
  {
    id: "low_prod_006",
    category: "LOW_PRODUCTIVITY",
    weight: 5,
    title: "Brutal honesty.",
    message:
      "If someone else had your schedule today, they'd be disappointed. You should be too.",
  },

  // ─── NO_GYM ─────────────────────────────────────────────────────────────────

  {
    id: "gym_001",
    category: "NO_GYM",
    weight: 10,
    title: "No gym. Again.",
    message:
      "You didn't go to the gym today. Your future body is filing a formal complaint.",
  },
  {
    id: "gym_002",
    category: "NO_GYM",
    weight: 10,
    title: "The dumbbells are lonely.",
    message:
      "Those weights you bought aren't going to lift themselves. Neither are your standards, apparently.",
  },
  {
    id: "gym_003",
    category: "NO_GYM",
    weight: 15,
    title: "Skipped gym. Again.",
    message:
      "Every missed session is a vote for the version of yourself you don't want to be.",
  },
  {
    id: "gym_004",
    category: "NO_GYM",
    weight: 10,
    title: "Your excuse was creative.",
    message:
      "You had a reason to skip gym today. You'll have another tomorrow. And the day after.",
  },
  {
    id: "gym_005",
    category: "NO_GYM",
    weight: 10,
    title: "The streak is broken.",
    message:
      "No gym today. The discipline you're trying to build doesn't take days off.",
  },
  {
    id: "gym_006",
    category: "NO_GYM",
    weight: 5,
    title: "Soft.",
    message:
      "No gym. High screen time. You're training the exact opposite person you claim you want to be.",
  },

  // ─── LOW_WATER ──────────────────────────────────────────────────────────────

  {
    id: "water_001",
    category: "LOW_WATER",
    weight: 10,
    title: "Drink water.",
    message:
      "{glasses} glasses today. You are mostly made of water. Act like it.",
  },
  {
    id: "water_002",
    category: "LOW_WATER",
    weight: 10,
    title: "You're basically a raisin.",
    message:
      "Only {glasses} glasses of water today. Dehydration is why your brain feels like static.",
  },
  {
    id: "water_003",
    category: "LOW_WATER",
    weight: 15,
    title: "Hydration = performance.",
    message:
      "{glasses} glasses. Even your plants get more water than that. And they're thriving.",
  },
  {
    id: "water_004",
    category: "LOW_WATER",
    weight: 10,
    title: "Simple things first.",
    message:
      "If you can't drink {glasses} glasses of water, the bigger goals are going to be a challenge.",
  },
  {
    id: "water_005",
    category: "LOW_WATER",
    weight: 10,
    title: "Your brain is thirsty.",
    message:
      "Only {glasses} glasses of water logged. Dehydrated brain = worse decisions. See the irony?",
  },

  // ─── NO_READING ─────────────────────────────────────────────────────────────

  {
    id: "read_001",
    category: "NO_READING",
    weight: 10,
    title: "Zero reading minutes.",
    message:
      "Not a single minute of reading today. Every book you own is silently judging you.",
  },
  {
    id: "read_002",
    category: "NO_READING",
    weight: 10,
    title: "Scrolling vs. learning.",
    message:
      "You had time for {app}. You had zero minutes for reading. That priority list says everything.",
  },
  {
    id: "read_003",
    category: "NO_READING",
    weight: 15,
    title: "The compound effect.",
    message:
      "20 pages a day is a book a month. You read zero today. That's fine. Keep doing that.",
  },
  {
    id: "read_004",
    category: "NO_READING",
    weight: 10,
    title: "Readers lead.",
    message:
      "The people ahead of you read more than they scroll. No reading today means falling further behind.",
  },
  {
    id: "read_005",
    category: "NO_READING",
    weight: 5,
    title: "Atrophy.",
    message:
      "Zero reading minutes. Your mind is the only tool you have. Stop letting it rust.",
  },

  // ─── HIGH_UNLOCKS ────────────────────────────────────────────────────────────

  {
    id: "unlock_001",
    category: "HIGH_UNLOCKS",
    weight: 10,
    title: "{unlocks} unlocks.",
    message:
      "You've unlocked your phone {unlocks} times today. That's not curiosity. That's compulsion.",
  },
  {
    id: "unlock_002",
    category: "HIGH_UNLOCKS",
    weight: 10,
    title: "Dopamine loop.",
    message:
      "{unlocks} phone unlocks. You're checking for something that isn't there. The anxiety is the addiction.",
  },
  {
    id: "unlock_003",
    category: "HIGH_UNLOCKS",
    weight: 15,
    title: "Can't stop, won't stop.",
    message:
      "{unlocks} times you reached for your phone today. How many of those actually needed to happen?",
  },
  {
    id: "unlock_004",
    category: "HIGH_UNLOCKS",
    weight: 10,
    title: "The reflex is the problem.",
    message:
      "{unlocks} unlocks. The reflex to grab your phone is stronger than your attention span. Both fixable.",
  },
  {
    id: "unlock_005",
    category: "HIGH_UNLOCKS",
    weight: 5,
    title: "Broken focus.",
    message:
      "Every one of those {unlocks} unlocks interrupted a thought. Your brain can't build anything in fragments.",
  },

  // ─── GOOD_PROGRESS ──────────────────────────────────────────────────────────

  {
    id: "good_001",
    category: "GOOD_PROGRESS",
    weight: 10,
    title: "Not bad.",
    message:
      "Score: {score}. Gym done. Water logged. This is who you're trying to be. Don't waste the momentum.",
  },
  {
    id: "good_002",
    category: "GOOD_PROGRESS",
    weight: 10,
    title: "Actually decent.",
    message:
      "{score}/100 today. You showed up. Don't let tomorrow undo it.",
  },
  {
    id: "good_003",
    category: "GOOD_PROGRESS",
    weight: 15,
    title: "Streak: {streak} days.",
    message:
      "{streak} days in a row. The version of you a year from now remembers today as part of the foundation.",
  },
  {
    id: "good_004",
    category: "GOOD_PROGRESS",
    weight: 10,
    title: "Keep going.",
    message:
      "You hit {score} today. That's earned. Wake up tomorrow and do it again.",
  },
  {
    id: "good_005",
    category: "GOOD_PROGRESS",
    weight: 5,
    title: "Fine. Good job.",
    message:
      "Score of {score}. Gym. Water. Reading. I'm begrudgingly impressed. Don't get comfortable.",
  },

  // ─── WEEKEND ────────────────────────────────────────────────────────────────

  {
    id: "weekend_001",
    category: "WEEKEND",
    weight: 10,
    title: "Weekend brain is on.",
    message:
      "It's the weekend but your goals don't take Saturday off. Neither do your competitors.",
  },
  {
    id: "weekend_002",
    category: "WEEKEND",
    weight: 15,
    title: "Rest ≠ rot.",
    message:
      "Rest is productive. What you're doing right now is not rest — it's avoidance with the weekend as an excuse.",
  },
  {
    id: "weekend_003",
    category: "WEEKEND",
    weight: 10,
    title: "Weekends compound.",
    message:
      "104 weekend days a year. That's 104 chances to get ahead or fall further behind. This one counts.",
  },
  {
    id: "weekend_004",
    category: "WEEKEND",
    weight: 5,
    title: "Convenient.",
    message:
      "The weekend became your excuse for everything you said you'd do 'when you had time'.",
  },

  // ─── WORK_HOURS ─────────────────────────────────────────────────────────────

  {
    id: "work_001",
    category: "WORK_HOURS",
    weight: 10,
    title: "It's a workday.",
    message:
      "You're burning focus on {app} during work hours. Busy and productive are not the same thing.",
  },
  {
    id: "work_002",
    category: "WORK_HOURS",
    weight: 15,
    title: "Context switch costs.",
    message:
      "Every time you check {app} mid-task costs you 23 minutes of focus. How many times today?",
  },
  {
    id: "work_003",
    category: "WORK_HOURS",
    weight: 10,
    title: "Deep work is dying.",
    message:
      "{app} during work hours means your best thinking is being interrupted by noise. Protect your focus blocks.",
  },
  {
    id: "work_004",
    category: "WORK_HOURS",
    weight: 5,
    title: "Someone else is focused.",
    message:
      "Right now, someone in your field is doing deep work. You're on {app}. The gap widens.",
  },

  // ─── SOCIAL_MEDIA ───────────────────────────────────────────────────────────

  {
    id: "social_001",
    category: "SOCIAL_MEDIA",
    weight: 10,
    title: "Connection or comparison?",
    message:
      "{minutes} minutes on {app}. Be honest — were you connecting or comparing yourself to people you don't actually know?",
  },
  {
    id: "social_002",
    category: "SOCIAL_MEDIA",
    weight: 10,
    title: "The highlight reel lie.",
    message:
      "Everything you see on {app} is curated. You're measuring your reality against someone else's highlight reel.",
  },
  {
    id: "social_003",
    category: "SOCIAL_MEDIA",
    weight: 15,
    title: "What did you actually get?",
    message:
      "{minutes} minutes on {app}. Name one thing you learned or built from that time.",
  },
  {
    id: "social_004",
    category: "SOCIAL_MEDIA",
    weight: 10,
    title: "Social media ≠ social life.",
    message:
      "{app} for {minutes} minutes. When did you last have a real conversation with a real person?",
  },
];
