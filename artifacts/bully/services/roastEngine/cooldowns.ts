import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  cooldowns: "@bully_re_cooldowns",
  recentIds: "@bully_re_recent_ids",
} as const;

const MAX_RECENT_IDS = 20;

type CooldownMap = Record<string, number>; // templateId → expiresAt (unix ms)

// ─── In-memory cache to avoid repeated AsyncStorage reads ────────────────────

let cooldownCache: CooldownMap | null = null;
let recentCache: string[] | null = null;

// ─── Cooldown operations ──────────────────────────────────────────────────────

export async function getCooldowns(): Promise<CooldownMap> {
  if (cooldownCache) return cooldownCache;
  try {
    const raw = await AsyncStorage.getItem(KEYS.cooldowns);
    cooldownCache = raw ? JSON.parse(raw) : {};
    return cooldownCache as CooldownMap;
  } catch {
    return {};
  }
}

export async function isOnCooldown(templateId: string): Promise<boolean> {
  const map = await getCooldowns();
  const expiresAt = map[templateId];
  if (!expiresAt) return false;
  return Date.now() < expiresAt;
}

export async function setCooldown(
  templateId: string,
  minutes: number,
): Promise<void> {
  const map = await getCooldowns();
  map[templateId] = Date.now() + minutes * 60 * 1000;
  cooldownCache = map;
  // Prune expired entries
  const now = Date.now();
  const pruned: CooldownMap = {};
  for (const [id, exp] of Object.entries(map)) {
    if (exp > now) pruned[id] = exp;
  }
  cooldownCache = pruned;
  await AsyncStorage.setItem(KEYS.cooldowns, JSON.stringify(pruned)).catch(() => {});
}

export async function clearAllCooldowns(): Promise<void> {
  cooldownCache = {};
  await AsyncStorage.removeItem(KEYS.cooldowns).catch(() => {});
}

// ─── Recent roast ID tracking ─────────────────────────────────────────────────

export async function getRecentRoastIds(): Promise<string[]> {
  if (recentCache) return recentCache;
  try {
    const raw = await AsyncStorage.getItem(KEYS.recentIds);
    recentCache = raw ? JSON.parse(raw) : [];
    return recentCache as string[];
  } catch {
    return [];
  }
}

export async function recordRoastId(id: string): Promise<void> {
  const ids = await getRecentRoastIds();
  const updated = [id, ...ids.filter((i) => i !== id)].slice(0, MAX_RECENT_IDS);
  recentCache = updated;
  await AsyncStorage.setItem(KEYS.recentIds, JSON.stringify(updated)).catch(() => {});
}

export async function clearRecentIds(): Promise<void> {
  recentCache = [];
  await AsyncStorage.removeItem(KEYS.recentIds).catch(() => {});
}
