import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import {
  cancelDailyRoast,
  getAllScheduledNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleDailyRoast,
  fireScreenTimeAlert,
} from "@/services/notifications";
import {
  hasUsagePermission,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

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
    hasUsagePermission().then((granted) => {
      setUsageGranted(granted);
      if (granted) getAppUsageStats().then(setTopApps);
    });
  }, []);

  const handleGrantUsageAccess = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestUsagePermission();
    // Re-check after returning from settings (user may have granted)
    setTimeout(async () => {
      const granted = await hasUsagePermission();
      setUsageGranted(granted);
      if (granted) {
        const apps = await getAppUsageStats();
        setTopApps(apps);
      }
    }, 1000);
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
      await scheduleDailyRoast(
        settings.notificationHour,
        settings.notificationMinute,
        settings.roastLevel
      );
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
      updateSettings({ notificationsEnabled: true });
    } else {
      await cancelDailyRoast();
      getAllScheduledNotifications().then((n) => setScheduledCount(n.length));
      updateSettings({ notificationsEnabled: false });
    }
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    Haptics.selectionAsync();
    updateSettings({ notificationHour: hour, notificationMinute: minute });
    if (settings.notificationsEnabled && permStatus === "granted") {
      await scheduleDailyRoast(hour, minute, settings.roastLevel);
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
    await fireScreenTimeAlert(settings.roastLevel);
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
            cancelDailyRoast();
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
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: usageGranted ? "#00E676" + "40" : colors.border, gap: 0 },
            ]}
          >
            <SettingRow icon="chart-bar" label="Usage Access">
              {usageGranted ? (
                <View style={styles.grantedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#00E676" />
                  <Text style={[styles.grantedText, { color: "#00E676", fontFamily: "Inter_500Medium" }]}>Active</Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleGrantUsageAccess}
                  style={[styles.grantBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={[styles.grantBtnText, { fontFamily: "Inter_600SemiBold" }]}>Grant</Text>
                </Pressable>
              )}
            </SettingRow>

            {!usageGranted && (
              <View style={[styles.notifHint, { borderTopColor: colors.border }]}>
                <MaterialCommunityIcons name="information-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.notifHintText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Grant Usage Access so Bully can read your real screen time and top apps — no more manual logging.
                </Text>
              </View>
            )}

            {usageGranted && topApps.length > 0 && (
              <View style={[styles.appsSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.appsSectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  LAST 24H USAGE
                </Text>
                {topApps.slice(0, 5).map((app, i) => (
                  <View key={app.packageName} style={styles.appRow}>
                    <Text style={[styles.appRank, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      {i + 1}.
                    </Text>
                    <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                      {app.appName}
                    </Text>
                    <Text style={[styles.appTime, { color: i === 0 ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                      {app.totalMinutes}m
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
  grantedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  grantedText: { fontSize: 12 },
  grantBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  grantBtnText: { color: "#fff", fontSize: 13 },
  appsSection: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  appsSectionLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  appRank: { fontSize: 12, width: 16 },
  appName: { flex: 1, fontSize: 13 },
  appTime: { fontSize: 13 },
});
