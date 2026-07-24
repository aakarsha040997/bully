import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type RoastLevel, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { PERSONALITY_LABELS } from "@/services/roastEngine";
import type { Personality } from "@/services/roastEngine/types";
import { setPersonality as persistPersonality } from "@/services/storage";
import {
  cancelDailyCheckIn,
  getAllScheduledNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleDailyCheckIn,
  sendRoastNotification,
} from "@/services/notifications";
import {
  hasUsagePermission,
  isNativeModuleLoaded,
  requestUsagePermission,
  getAppUsageStats,
  type AppUsage,
} from "@/services/usageStats";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  1: "Friendly",
  2: "Sarcastic",
  3: "Savage",
  4: "Unhinged",
};

const PERSONALITY_DESCRIPTIONS: Record<Personality, string> = {
  GENTLE: "Encouraging accountability.",
  FRIEND: "Like your best friend calling you out.",
  SARCASTIC: "Dry humor.",
  SAVAGE: "No mercy.",
  GYM_BRO: "Discipline first.",
  CORPORATE_BOSS: "Performance reviews for your life.",
  INDIAN_MOM: "Emotional damage.",
  ANIME_VILLAIN: "Dramatic and overpowered.",
};

const ALL_PERSONALITIES: Personality[] = [
  "GENTLE",
  "FRIEND",
  "SARCASTIC",
  "SAVAGE",
  "GYM_BRO",
  "CORPORATE_BOSS",
  "INDIAN_MOM",
  "ANIME_VILLAIN",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

// ─── UsageAccessCard ──────────────────────────────────────────────────────────

const PRIVACY_READ = [
  "Daily total screen time",
  "Top 10 apps by time",
];

const PRIVACY_NEVER = [
  "Messages or calls",
  "Browser history",
  "Location or photos",
];

const HOW_STEPS = [
  { icon: "gesture-tap", text: 'Tap "Grant" below' },
  { icon: "format-list-bulleted", text: 'Find "Bully" in the list' },
  { icon: "toggle-switch", text: "Toggle the switch ON" },
  { icon: "arrow-left-circle", text: "Return here — Bully checks automatically" },
];

interface UsageAccessCardProps {
  granted: boolean;
  checking: boolean;
  topApps: AppUsage[];
  onGrant: () => void;
  onRetry: () => void;
}

function UsageAccessCard({
  granted,
  checking,
  topApps,
  onGrant,
  onRetry,
}: UsageAccessCardProps) {
  const colors = useColors();
  const guideAnim = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (!granted) {
      Animated.timing(guideAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      Animated.stagger(
        80,
        stepAnims.map((a) =>
          Animated.timing(a, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
  }, [granted]);

  const cardBorderColor = granted
    ? "#00E676" + "40"
    : colors.primary + "40";

  return (
    <View
      style={[
        usageStyles.card,
        { backgroundColor: colors.card, borderColor: cardBorderColor },
      ]}
    >
      {/* Status row */}
      <View style={usageStyles.statusRow}>
        <MaterialCommunityIcons
          name={granted ? "check-circle" : "cellphone-lock"}
          size={20}
          color={granted ? "#00E676" : colors.primary}
        />
        <Text
          style={[
            usageStyles.statusLabel,
            { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Screen Time Access
        </Text>
        <View
          style={[
            usageStyles.badge,
            { backgroundColor: granted ? "#00E67620" : colors.primary + "20" },
          ]}
        >
          <Text
            style={[
              usageStyles.badgeText,
              {
                color: granted ? "#00E676" : colors.primary,
                fontFamily: "Inter_700Bold",
              },
            ]}
          >
            {granted ? "ACTIVE" : "REQUIRED"}
          </Text>
        </View>
      </View>

      {/* Granted: show app usage */}
      {granted && topApps.length > 0 && (
        <View style={[usageStyles.divider, { borderTopColor: colors.border }]}>
          <Text
            style={[
              usageStyles.sectionLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            LAST 24H USAGE
          </Text>
          {topApps.slice(0, 5).map((app, i) => (
            <View key={app.packageName} style={usageStyles.appRow}>
              <Text
                style={[
                  usageStyles.appRank,
                  { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {i + 1}.
              </Text>
              <Text
                style={[
                  usageStyles.appName,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
                numberOfLines={1}
              >
                {app.appName}
              </Text>
              <Text
                style={[
                  usageStyles.appTime,
                  {
                    color: i === 0 ? colors.primary : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {app.totalMinutes}m
              </Text>
            </View>
          ))}
          <View style={usageStyles.activeBadge}>
            <MaterialCommunityIcons
              name="radar"
              size={12}
              color="#00E676"
            />
            <Text
              style={[
                usageStyles.activeText,
                { color: "#00E676", fontFamily: "Inter_500Medium" },
              ]}
            >
              Background monitoring active
            </Text>
          </View>
        </View>
      )}

      {/* Not granted: full onboarding guide */}
      {!granted && (
        <Animated.View
          style={[usageStyles.guide, { opacity: guideAnim }]}
        >
          {/* Why */}
          <View style={[usageStyles.divider, { borderTopColor: colors.border }]}>
            <Text
              style={[
                usageStyles.guideHeading,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              Why Bully needs this
            </Text>
            <Text
              style={[
                usageStyles.guideBody,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Without Usage Access, Bully can only see numbers you type manually. With it, Bully reads your real screen time — so you can't lie.
            </Text>
          </View>

          {/* Privacy grid */}
          <View style={[usageStyles.divider, { borderTopColor: colors.border }]}>
            <View style={usageStyles.privacyGrid}>
              <View style={usageStyles.privacyCol}>
                <Text
                  style={[
                    usageStyles.privacyHeading,
                    { color: "#00E676", fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  WE READ
                </Text>
                {PRIVACY_READ.map((item) => (
                  <View key={item} style={usageStyles.privacyRow}>
                    <MaterialCommunityIcons name="check" size={12} color="#00E676" />
                    <Text
                      style={[
                        usageStyles.privacyItem,
                        { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={usageStyles.privacyCol}>
                <Text
                  style={[
                    usageStyles.privacyHeading,
                    { color: colors.primary, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  NEVER READ
                </Text>
                {PRIVACY_NEVER.map((item) => (
                  <View key={item} style={usageStyles.privacyRow}>
                    <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
                    <Text
                      style={[
                        usageStyles.privacyItem,
                        { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Steps */}
          <View style={[usageStyles.divider, { borderTopColor: colors.border }]}>
            <Text
              style={[
                usageStyles.sectionLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
              ]}
            >
              HOW TO ENABLE
            </Text>
            {HOW_STEPS.map((step, i) => (
              <Animated.View
                key={i}
                style={[
                  usageStyles.stepRow,
                  {
                    opacity: stepAnims[i],
                    transform: [
                      {
                        translateY: stepAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    usageStyles.stepNum,
                    { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" },
                  ]}
                >
                  <Text
                    style={[
                      usageStyles.stepNumText,
                      { color: colors.primary, fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    usageStyles.stepText,
                    { color: colors.foreground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {step.text}
                </Text>
              </Animated.View>
            ))}
          </View>

          {/* Grant button */}
          <Pressable
            onPress={onGrant}
            style={({ pressed }) => [
              usageStyles.grantBtn,
              {
                backgroundColor: pressed
                  ? colors.primary + "CC"
                  : colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name="shield-lock-open" size={18} color="#fff" />
            <Text
              style={[
                usageStyles.grantBtnText,
                { fontFamily: "Inter_700Bold" },
              ]}
            >
              Grant Usage Access
            </Text>
          </Pressable>

          {/* Retry link */}
          <Pressable
            onPress={onRetry}
            style={usageStyles.retryBtn}
            disabled={checking}
          >
            <MaterialCommunityIcons
              name={checking ? "loading" : "refresh"}
              size={14}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                usageStyles.retryText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {checking ? "Checking…" : "Already granted? Check again"}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const usageStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    gap: 0,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusLabel: { flex: 1, fontSize: 14 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, letterSpacing: 1 },
  divider: {
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  guide: { gap: 0 },
  guideHeading: { fontSize: 13, marginBottom: 6 },
  guideBody: { fontSize: 12, lineHeight: 18 },
  privacyGrid: { flexDirection: "row", gap: 12 },
  privacyCol: { flex: 1, gap: 6 },
  privacyHeading: { fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  privacyItem: { fontSize: 11, flex: 1, lineHeight: 16 },
  sectionLabel: { fontSize: 10, letterSpacing: 2 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 11 },
  stepText: { flex: 1, fontSize: 12, lineHeight: 18 },
  grantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  grantBtnText: { color: "#fff", fontSize: 15 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  retryText: { fontSize: 12 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  appRank: { fontSize: 12, width: 16 },
  appName: { flex: 1, fontSize: 13 },
  appTime: { fontSize: 13 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  activeText: { fontSize: 11 },
});

// ─── Settings screen components ───────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text
      style={[
        styles.sectionHeader,
        { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
      ]}
    >
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={colors.mutedForeground}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: colors.foreground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const [screenLimit, setScreenLimit] = useState(
    String(settings.dailyScreenTimeLimit)
  );
  const [permStatus, setPermStatus] = useState<
    "granted" | "denied" | "undetermined" | "loading"
  >("loading");
  const [scheduledCount, setScheduledCount] = useState(0);
  const [usageGranted, setUsageGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [topApps, setTopApps] = useState<AppUsage[]>([]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== "web") {
      getNotificationPermissionStatus().then(setPermStatus);
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
    } else {
      setPermStatus("denied");
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const refresh = () => {
      hasUsagePermission().then((granted) => {
        setUsageGranted(granted);
        if (granted) getAppUsageStats().then(setTopApps);
      });
    };

    refresh();

    // Re-check when the app returns to the foreground — granting Usage Access
    // happens on a separate system screen, so the app backgrounds and comes back.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => sub.remove();
  }, []);

  const handleGrantUsageAccess = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const launched = await requestUsagePermission();
    if (!launched) {
      // Native module unavailable — fall back to opening Usage Access settings
      // via Linking so the button always does something on Android.
      const USAGE_ACCESS_ACTION =
        "android.settings.action.USAGE_ACCESS_SETTINGS";
      await Linking.openURL(
        `intent:#Intent;action=${USAGE_ACCESS_ACTION};end`,
      ).catch(() => Linking.openSettings());
    }
    // Re-check after returning from settings — user may have granted
    setTimeout(() => handleRetryPermission(), 1500);
  };

  const handleRetryPermission = async () => {
    setCheckingPermission(true);
    try {
      const granted = await hasUsagePermission();
      setUsageGranted(granted);
      if (granted) {
        const apps = await getAppUsageStats();
        setTopApps(apps);
      }
    } finally {
      setCheckingPermission(false);
    }
  };

  const toggleDay = (day: string) => {
    Haptics.selectionAsync();
    const days = settings.gymSchedule.days.includes(day)
      ? settings.gymSchedule.days.filter((d) => d !== day)
      : [...settings.gymSchedule.days, day];
    updateSettings({ gymSchedule: { ...settings.gymSchedule, days } });
  };

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermStatus("denied");
        if (Platform.OS !== "web") {
          Alert.alert(
            "Permission needed",
            "Enable notifications in your device settings to get daily roasts.",
            [{ text: "OK" }]
          );
        }
        return;
      }
      setPermStatus("granted");
      await scheduleDailyCheckIn(
        settings.notificationHour,
        settings.notificationMinute,
        "BULLY",
        "Time to check in. What did you actually accomplish today?",
      );
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
      updateSettings({ notificationsEnabled: true });
    } else {
      await cancelDailyCheckIn();
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
      updateSettings({ notificationsEnabled: false });
    }
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    Haptics.selectionAsync();
    updateSettings({ notificationHour: hour, notificationMinute: minute });
    if (settings.notificationsEnabled && permStatus === "granted") {
      await scheduleDailyCheckIn(
        hour,
        minute,
        "BULLY",
        "Time to check in. What did you actually accomplish today?",
      );
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
    }
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission needed", "Enable notifications first.");
      return;
    }
    await sendRoastNotification("Test Notification", "This is what your roasts will look like. Stay accountable.");
  };

  const handleResetAll = () => {
    if (Platform.OS === "web") {
      updateSettings({
        roastLevel: 2,
        gymSchedule: { days: ["Mon", "Wed", "Fri"], time: "07:00" },
        dailyScreenTimeLimit: 120,
        notificationsEnabled: false,
        notificationHour: 8,
        notificationMinute: 0,
      });
      return;
    }
    Alert.alert(
      "Reset All Data",
      "This will reset all settings and streaks. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            cancelDailyCheckIn();
            updateSettings({
              roastLevel: 2,
              gymSchedule: { days: ["Mon", "Wed", "Fri"], time: "07:00" },
              dailyScreenTimeLimit: 120,
              notificationsEnabled: false,
              notificationHour: 8,
              notificationMinute: 0,
            });
          },
        },
      ]
    );
  };

  const hourLabel = String(settings.notificationHour).padStart(2, "0");
  const minuteLabel = String(settings.notificationMinute).padStart(2, "0");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: "Inter_700Bold" },
        ]}
      >
        SETTINGS
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        Make it hurt. Or don't.
      </Text>

      {/* ── Roast Level ── */}
      <SectionHeader title="ROAST LEVEL" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.levelsRow}>
          {([1, 2, 3, 4] as RoastLevel[]).map((level) => {
            const active = settings.roastLevel === level;
            return (
              <Pressable
                key={level}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateSettings({ roastLevel: level });
                }}
                style={[
                  styles.levelBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.levelNum,
                    {
                      color: active ? "#fff" : colors.mutedForeground,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                >
                  {level}
                </Text>
                <Text
                  style={[
                    styles.levelLabel,
                    {
                      color: active ? "#fff" : colors.foreground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {ROAST_LEVEL_LABELS[level]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Personality ── */}
      <SectionHeader title="ROAST PERSONALITY" />
      <View style={styles.personalityGrid}>
        {ALL_PERSONALITIES.map((p) => {
          const active = settings.personality === p;
          return (
            <Pressable
              key={p}
              onPress={() => {
                Haptics.selectionAsync();
                updateSettings({ personality: p });
                persistPersonality(p);
              }}
              style={[
                styles.personalityCard,
                {
                  backgroundColor: active
                    ? colors.primary + "18"
                    : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              {active && (
                <View style={styles.personalityCheck}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.personalityName,
                  {
                    color: active ? colors.primary : colors.foreground,
                    fontFamily: "Inter_700Bold",
                  },
                ]}
              >
                {PERSONALITY_LABELS[p]}
              </Text>
              <Text
                style={[
                  styles.personalityDesc,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {PERSONALITY_DESCRIPTIONS[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Notifications ── */}
      <SectionHeader title="DAILY ROAST NOTIFICATION" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, gap: 0 },
        ]}
      >
        <SettingRow icon="bell-ring" label="Daily roast alarm">
          {Platform.OS === "web" ? (
            <Text
              style={[
                styles.webNote,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Mobile only
            </Text>
          ) : (
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          )}
        </SettingRow>

        {settings.notificationsEnabled && permStatus === "granted" && (
          <>
            <View
              style={[
                styles.timePicker,
                { borderTopColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.timePickerLabel,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                Fire at
              </Text>
              <View style={styles.timePickerControls}>
                {/* Hour scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {HOURS.map((h) => {
                    const active = settings.notificationHour === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() =>
                          handleTimeChange(h, settings.notificationMinute)
                        }
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors.secondary,
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            {
                              color: active ? "#fff" : colors.mutedForeground,
                              fontFamily: "Inter_600SemiBold",
                            },
                          ]}
                        >
                          {String(h).padStart(2, "0")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text
                  style={[
                    styles.timeSep,
                    { color: colors.foreground, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  :
                </Text>

                {/* Minute options */}
                <View style={styles.minuteRow}>
                  {MINUTES.map((m) => {
                    const active = settings.notificationMinute === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() =>
                          handleTimeChange(settings.notificationHour, m)
                        }
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors.secondary,
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            {
                              color: active ? "#fff" : colors.mutedForeground,
                              fontFamily: "Inter_600SemiBold",
                            },
                          ]}
                        >
                          {String(m).padStart(2, "0")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.scheduledBadge}>
                <MaterialCommunityIcons
                  name="clock-check"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.scheduledText,
                    { color: colors.primary, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Fires daily at {hourLabel}:{minuteLabel}
                </Text>
              </View>
            </View>

            <View style={[styles.rowDivider, { borderTopColor: colors.border }]}>
              <Pressable
                onPress={handleTestNotification}
                style={({ pressed }) => [
                  styles.testBtn,
                  {
                    backgroundColor: colors.primary + "15",
                    borderColor: colors.primary + "40",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.testBtnText,
                    { color: colors.primary, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Send a test roast now
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {!settings.notificationsEnabled && Platform.OS !== "web" && (
          <View style={[styles.notifHint, { borderTopColor: colors.border }]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.notifHintText,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Turn on to get daily roasts pushed to your phone — even when
              you're being lazy and not opening the app.
            </Text>
          </View>
        )}
      </View>

      {/* ── Gym Schedule ── */}
      <SectionHeader title="GYM SCHEDULE" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.cardSubLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Workout days
        </Text>
        <View style={styles.daysRow}>
          {DAYS.map((day) => {
            const active = settings.gymSchedule.days.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: active ? "#fff" : colors.mutedForeground,
                      fontFamily: "Inter_600SemiBold",
                    },
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Limits ── */}
      <SectionHeader title="LIMITS" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SettingRow icon="cellphone-clock" label="Daily screen time limit">
          <View style={styles.inputGroup}>
            <TextInput
              value={screenLimit}
              onChangeText={setScreenLimit}
              onBlur={() => {
                const val = parseInt(screenLimit);
                if (!isNaN(val) && val > 0)
                  updateSettings({ dailyScreenTimeLimit: val });
              }}
              keyboardType="numeric"
              style={[
                styles.numberInput,
                {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            />
            <Text
              style={[
                styles.inputUnit,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              min
            </Text>
          </View>
        </SettingRow>
      </View>

      {/* ── Android Tracking ── */}
      {Platform.OS === "android" && (
        <>
          <SectionHeader title="ANDROID TRACKING" />
          <UsageAccessCard
            granted={usageGranted}
            checking={checkingPermission}
            topApps={topApps}
            onGrant={handleGrantUsageAccess}
            onRetry={handleRetryPermission}
          />
          <Text
            style={{
              fontSize: 10,
              color: colors.mutedForeground,
              textAlign: "center",
              marginTop: 2,
              marginBottom: 6,
              fontFamily: "Inter_400Regular",
              opacity: 0.6,
            }}
          >
            {`mod:${isNativeModuleLoaded() ? "ok" : "null"} perm:${usageGranted ? "y" : "n"} apps:${topApps.length}`}
          </Text>
        </>
      )}

      {/* ── Battery Optimization (Android) ── */}
      {Platform.OS === "android" && (
        <>
          <SectionHeader title="BACKGROUND RELIABILITY" />
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                gap: 12,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#FF980020",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MaterialCommunityIcons name="battery-alert" size={20} color="#FF9800" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    styles.batteryTitle,
                    { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Exempt from Battery Saver
                </Text>
                <Text
                  style={[
                    styles.batteryDesc,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Some Android skins (Samsung, MIUI, OPPO) kill background tasks aggressively. Exempt Bully to keep monitoring reliable.
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              {[
                { brand: "Samsung", path: "Settings → Device Care → Battery → Background usage limits → remove Bully" },
                { brand: "Xiaomi / MIUI", path: "Settings → Apps → Manage apps → Bully → Battery saver → No restrictions" },
                { brand: "OPPO / Realme / Vivo", path: "Settings → Battery → App Quick Freeze → disable for Bully" },
                { brand: "OnePlus", path: "Settings → Battery → Battery Optimization → Bully → Don't optimize" },
              ].map(({ brand, path }) => (
                <View
                  key={brand}
                  style={[
                    styles.oemRow,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.oemBrand,
                      { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {brand}
                  </Text>
                  <Text
                    style={[
                      styles.oemPath,
                      { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {path}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Linking.openSettings();
              }}
              style={[
                styles.oemBtn,
                { backgroundColor: "#FF980015", borderColor: "#FF980040" },
              ]}
            >
              <MaterialCommunityIcons name="cog-outline" size={16} color="#FF9800" />
              <Text
                style={[
                  styles.oemBtnText,
                  { color: "#FF9800", fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Open App Settings
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── About ── */}
      <SectionHeader title="ABOUT" />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            gap: 0,
          },
        ]}
      >
        <SettingRow icon="application" label="Version">
          <Text
            style={[
              styles.valueText,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            1.0.0
          </Text>
        </SettingRow>
        <SettingRow icon="robot" label="AI Model">
          <Text
            style={[
              styles.valueText,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            Groq Llama 3.1
          </Text>
        </SettingRow>
        <SettingRow icon="shield-check" label="No hate speech, ever">
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#00E676"
          />
        </SettingRow>
      </View>

      <Pressable
        onPress={handleResetAll}
        style={[
          styles.resetBtn,
          {
            backgroundColor: colors.primary + "15",
            borderColor: colors.primary + "40",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="delete-sweep"
          size={18}
          color={colors.primary}
        />
        <Text
          style={[
            styles.resetText,
            { color: colors.primary, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          Reset All Data
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 36, letterSpacing: 4, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  levelsRow: { flexDirection: "row", gap: 8 },
  levelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  levelNum: { fontSize: 18 },
  levelLabel: { fontSize: 10 },
  cardSubLabel: { fontSize: 12, marginBottom: 4 },
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayLabel: { fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 14 },
  rowRight: { alignItems: "flex-end" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  numberInput: {
    width: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    textAlign: "center",
  },
  inputUnit: { fontSize: 13 },
  valueText: { fontSize: 13 },
  batteryTitle: { fontSize: 14 },
  batteryDesc: { fontSize: 12, lineHeight: 18 },
  oemRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  oemBrand: { fontSize: 12 },
  oemPath: { fontSize: 11, lineHeight: 16 },
  oemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  oemBtnText: { fontSize: 13 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 12,
  },
  resetText: { fontSize: 14 },
  webNote: { fontSize: 12 },
  notifHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notifHintText: { fontSize: 12, flex: 1, lineHeight: 18 },
  timePicker: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  timePickerLabel: { fontSize: 12 },
  timePickerControls: { gap: 8 },
  timeScrollContent: { gap: 6, paddingVertical: 2 },
  timeChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    minWidth: 40,
    alignItems: "center",
  },
  timeChipText: { fontSize: 14 },
  timeSep: { fontSize: 18, textAlign: "center" },
  minuteRow: { flexDirection: "row", gap: 6 },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 4,
  },
  scheduledText: { fontSize: 12 },
  rowDivider: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  testBtnText: { fontSize: 13 },

  personalityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  personalityCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    position: "relative",
  },
  personalityCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  personalityName: { fontSize: 13, paddingRight: 20 },
  personalityDesc: { fontSize: 11, lineHeight: 15 },
});
