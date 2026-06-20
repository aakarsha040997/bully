import {
  getTopApp,
  getTotalScreenMinutes,
  hasUsagePermission,
} from "./usageStats";

import { generateRoast } from "./roastEngine";

export interface MonitoringResult {
  shouldNotify: boolean;
  title?: string;
  message?: string;
  appName?: string;
  minutes?: number;
}

const THRESHOLDS = [15, 30, 60];

let lastThresholdTriggered = -1;

/**
 * Reads Android UsageStats and decides whether Bully should interrupt the user.
 *
 * This function NEVER sends notifications.
 * It only returns a decision.
 */
export async function checkUsage(): Promise<MonitoringResult> {
  const granted = await hasUsagePermission();

  if (!granted) {
    return {
      shouldNotify: false,
    };
  }

  const topApp = await getTopApp();

  if (!topApp) {
    return {
      shouldNotify: false,
    };
  }

  const minutes = topApp.totalMinutes;

  let threshold = -1;

  for (const value of THRESHOLDS) {
    if (minutes >= value) {
      threshold = value;
    }
  }

  if (threshold === -1) {
    return {
      shouldNotify: false,
    };
  }

  if (threshold === lastThresholdTriggered) {
    return {
      shouldNotify: false,
    };
  }

  lastThresholdTriggered = threshold;

  const roast = generateRoast({
    appName: topApp.appName,
    minutes,
  });

  return {
    shouldNotify: true,
    title: "Bully",
    message: roast,
    appName: topApp.appName,
    minutes,
  };
}

/**
 * Returns a quick dashboard snapshot.
 */
export async function getDashboardSnapshot() {
  const [screenTime, topApp] = await Promise.all([
    getTotalScreenMinutes(),
    getTopApp(),
  ]);

  return {
    screenTime,
    topApp,
  };
}
