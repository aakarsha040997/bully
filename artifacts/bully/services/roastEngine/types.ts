export type RoastSeverity = "LOW" | "MEDIUM" | "HIGH" | "NUCLEAR";

export type RoastCategory =
  | "DOOMSCROLLING"
  | "LATE_NIGHT"
  | "BINGE"
  | "LOW_PRODUCTIVITY"
  | "NO_GYM"
  | "LOW_WATER"
  | "NO_READING"
  | "HIGH_UNLOCKS"
  | "GOOD_PROGRESS"
  | "WEEKEND"
  | "WORK_HOURS"
  | "SOCIAL_MEDIA";

export type Personality =
  | "GENTLE"
  | "FRIEND"
  | "SARCASTIC"
  | "SAVAGE"
  | "GYM_BRO"
  | "CORPORATE_BOSS"
  | "INDIAN_MOM"
  | "ANIME_VILLAIN";

export type RoastTrigger =
  | "SCREEN_TIME_LIMIT"
  | "APP_USAGE"
  | "LATE_NIGHT"
  | "MANUAL"
  | "DAILY_CHECK"
  | "UNLOCK_COUNT"
  | "SCHEDULED";

export interface RoastInput {
  appName?: string;
  packageName?: string;
  /** Minutes spent on topApp specifically */
  minutes?: number;
  /** 0–23 */
  hour: number;
  /** 0=Sun … 6=Sat */
  weekday: number;
  productivityScore: number;
  gymDone: boolean;
  waterGlasses: number;
  readingMinutes: number;
  unlockCount: number;
  screenTimeMinutes: number;
  personality: Personality;
  streak: number;
  previousRoastIds: string[];
  trigger: RoastTrigger;
}

export interface RoastOutput {
  id: string;
  title: string;
  message: string;
  severity: RoastSeverity;
  category: RoastCategory;
  cooldownMinutes: number;
}

export interface RoastRule {
  id: string;
  /** Higher number = evaluated first */
  priority: number;
  condition: (input: RoastInput) => boolean;
  category: RoastCategory;
  severity: RoastSeverity;
  cooldownMinutes: number;
  enabled: boolean;
}

export interface RoastTemplate {
  id: string;
  category: RoastCategory;
  /** Higher = more likely to be selected */
  weight: number;
  title: string;
  /** Placeholders: {app} {minutes} {score} {glasses} {unlocks} {streak} */
  message: string;
}

export interface MonitoringDecision {
  shouldNotify: boolean;
  roast: RoastOutput | null;
  reason: "rule_matched" | "no_rule_matched" | "on_cooldown" | "permission_denied";
}
