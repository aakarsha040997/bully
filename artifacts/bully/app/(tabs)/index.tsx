import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGenerateDailyReport } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { fireScreenTimeAlert } from "@/services/notifications";
import {
  hasUsagePermission,
  getTotalScreenMinutes,
  getTopApp,
  type AppUsage,
} from "@/services/usageStats";

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const colors = useColors();
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const color =
    score >= 70 ? "#00E676" : score >= 40 ? "#FF9800" : colors.primary;

  return (
    <View style={styles.scoreContainer}>
      <View style={[styles.scoreRingOuter, { borderColor: color + "33" }]}>
        <View style={[styles.scoreRingInner, { borderColor: color }]}>
          <Text
            style={[styles.scoreNumber, { color, fontFamily: "Inter_700Bold" }]}
          >
            {score}
          </Text>
          <Text
            style={[
              styles.scoreLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            / 100
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.scoreTitle,
          { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        Productivity Score
      </Text>
    </View>
  );
}

// ─── Logging Stat Card ─────────────────────────────────────────────────────────

interface LogCardProps {
  icon: string;
  label: string;
  value: number;
  displayValue: string;
  unit: string;
  step: number;
  onIncrement: () => void;
  onDecrement: () => void;
  accent?: boolean;
  warning?: boolean;
}

function LogCard({
  icon,
  label,
  value,
  displayValue,
  unit,
  onIncrement,
  onDecrement,
  accent,
  warning,
}: LogCardProps) {
  const colors = useColors();
  const flashAnim = useRef(new Animated.Value(1)).current;

  const borderColor = warning
    ? "#FF9800" + "60"
    : accent
    ? colors.primary + "50"
    : colors.border;

  const iconColor = warning
    ? "#FF9800"
    : accent
    ? colors.primary
    : colors.mutedForeground;

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1.06,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onIncrement();
  };

  const handleDecrement = () => {
    if (value <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDecrement();
  };

  return (
    <Animated.View
      style={[
        styles.logCard,
        {
          backgroundColor: colors.card,
          borderColor,
          transform: [{ scale: flashAnim }],
        },
      ]}
    >
      <View style={styles.logCardHeader}>
        <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
        <Text
          style={[
            styles.logCardLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {label}
        </Text>
        {warning && (
          <MaterialCommunityIcons name="alert" size={12} color="#FF9800" />
        )}
      </View>

      <View style={styles.logCardBody}>
        <Text
          style={[
            styles.logCardValue,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          {displayValue}
        </Text>
        {unit ? (
          <Text
            style={[
              styles.logCardUnit,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      <View style={styles.logCardControls}>
        <Pressable
          onPress={handleDecrement}
          style={({ pressed }) => [
            styles.logBtn,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: pressed || value <= 0 ? 0.4 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="minus"
            size={14}
            color={colors.mutedForeground}
          />
        </Pressable>
        <Pressable
          onPress={handleIncrement}
          style={({ pressed }) => [
            styles.logBtn,
            {
              backgroundColor: accent
                ? colors.primary + "20"
                : colors.secondary,
              borderColor: accent ? colors.primary + "50" : colors.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={14}
            color={accent ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Gym Toggle ────────────────────────────────────────────────────────────────

function GymToggle({
  done,
  onToggle,
}: {
  done: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        useNativeDriver: true,
        speed: 60,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
      }),
    ]).start();
    onToggle();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.gymToggle,
          {
            backgroundColor: done ? "#00E67620" : colors.card,
            borderColor: done ? "#00E676" : colors.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={done ? "check-circle" : "dumbbell"}
          size={28}
          color={done ? "#00E676" : colors.mutedForeground}
        />
        <View>
          <Text
            style={[
              styles.gymToggleTitle,
              {
                color: done ? "#00E676" : colors.foreground,
                fontFamily: "Inter_700Bold",
              },
            ]}
          >
            {done ? "GYM DONE" : "GYM TODAY?"}
          </Text>
          <Text
            style={[
              styles.gymToggleSub,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            {done ? "Your future self approves." : "Tap to log your workout"}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View
          style={[
            styles.gymToggleBadge,
            {
              backgroundColor: done ? "#00E676" : colors.secondary,
              borderColor: done ? "#00E676" : colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={done ? "check" : "plus"}
            size={16}
            color={done ? "#000" : colors.mutedForeground}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, streaks, settings, productivityScore, todaysRoast, setTodaysRoast, updateStats } =
    useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [screenTimeWarningFired, setScreenTimeWarningFired] = useState(false);
  const [autoTracking, setAutoTracking] = useState(false);
  const [topApp, setTopApp] = useState<AppUsage | null>(null);

  const { mutate: getVerdict, isPending } = useGenerateDailyReport({
    mutation: {
      onSuccess: (data) => {
        setTodaysRoast(data.verdict);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    },
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Auto-fill stats from Android UsageStatsManager if permission granted
  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      const granted = await hasUsagePermission();
      if (!granted) return;
      setAutoTracking(true);
      const [totalMins, top] = await Promise.all([
        getTotalScreenMinutes(),
        getTopApp(),
      ]);
      updateStats({ screenTimeMinutes: totalMins });
      setTopApp(top);
    })();
  }, []);

  // Fire screen-time notification when limit is exceeded
  useEffect(() => {
    if (
      !screenTimeWarningFired &&
      stats.screenTimeMinutes >= settings.dailyScreenTimeLimit &&
      settings.dailyScreenTimeLimit > 0 &&
      settings.notificationsEnabled
    ) {
      setScreenTimeWarningFired(true);
      fireScreenTimeAlert(settings.roastLevel);
    }
  }, [
    stats.screenTimeMinutes,
    settings.dailyScreenTimeLimit,
    settings.notificationsEnabled,
    settings.roastLevel,
    screenTimeWarningFired,
  ]);

  const screenTimeH = Math.floor(stats.screenTimeMinutes / 60);
  const screenTimeM = stats.screenTimeMinutes % 60;
  const screenTimeStr =
    screenTimeH > 0 ? `${screenTimeH}h ${screenTimeM}m` : `${screenTimeM}m`;

  const isOverLimit =
    stats.screenTimeMinutes >= settings.dailyScreenTimeLimit &&
    settings.dailyScreenTimeLimit > 0;

  const handleGetVerdict = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    getVerdict({
      data: {
        screenTime: screenTimeStr,
        topApp: topApp?.appName ?? "Instagram",
        gymMissed: !stats.gymDone,
        waterGlasses: stats.waterGlasses,
        readingMinutes: stats.readingMinutes,
        shortsWatched: stats.shortsWatched,
        productivityScore,
      },
    });
  };

  const addScreenTime = useCallback(
    (delta: number) => {
      const next = Math.max(0, stats.screenTimeMinutes + delta);
      updateStats({ screenTimeMinutes: next });
    },
    [stats.screenTimeMinutes, updateStats]
  );

  const addUnlocks = useCallback(
    (delta: number) => {
      updateStats({ unlockCount: Math.max(0, stats.unlockCount + delta) });
    },
    [stats.unlockCount, updateStats]
  );

  const addWater = useCallback(
    (delta: number) => {
      updateStats({ waterGlasses: Math.max(0, stats.waterGlasses + delta) });
    },
    [stats.waterGlasses, updateStats]
  );

  const addReading = useCallback(
    (delta: number) => {
      updateStats({
        readingMinutes: Math.max(0, stats.readingMinutes + delta),
      });
    },
    [stats.readingMinutes, updateStats]
  );

  const addShorts = useCallback(
    (delta: number) => {
      updateStats({ shortsWatched: Math.max(0, stats.shortsWatched + delta) });
    },
    [stats.shortsWatched, updateStats]
  );

  const toggleGym = useCallback(() => {
    updateStats({ gymDone: !stats.gymDone });
  }, [stats.gymDone, updateStats]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.appName,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          BULLY
        </Text>
        <Text
          style={[
            styles.tagline,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          No excuses. Just results.
        </Text>
      </View>

      {/* Score */}
      <ScoreRing score={productivityScore} />

      {/* Today's verdict */}
      <Animated.View
        style={[
          styles.roastCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary + "50",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.roastCardHeader}>
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={18}
            color={colors.primary}
          />
          <Text
            style={[
              styles.roastCardTitle,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            TODAY'S VERDICT
          </Text>
        </View>
        <Text
          style={[
            styles.roastText,
            { color: colors.foreground, fontFamily: "Inter_500Medium" },
          ]}
        >
          "{todaysRoast}"
        </Text>
        <Pressable
          onPress={handleGetVerdict}
          style={({ pressed }) => [
            styles.newVerdictBtn,
            {
              backgroundColor: colors.primary + "20",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.newVerdictText,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {isPending ? "Analyzing..." : "Get Today's Verdict"}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Gym Toggle */}
      <GymToggle done={stats.gymDone} onToggle={toggleGym} />

      {/* Divider */}
      <View style={styles.sectionRow}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          LOG TODAY
        </Text>
        <Text
          style={[
            styles.sectionHint,
            {
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
            },
          ]}
        >
          tap + / − to update
        </Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <LogCard
          icon="cellphone"
          label="Screen Time"
          value={stats.screenTimeMinutes}
          displayValue={screenTimeStr}
          unit=""
          step={15}
          onIncrement={() => addScreenTime(15)}
          onDecrement={() => addScreenTime(-15)}
          warning={isOverLimit}
        />
        <LogCard
          icon="cellphone-lock"
          label="Unlocks"
          value={stats.unlockCount}
          displayValue={String(stats.unlockCount)}
          unit="times"
          step={1}
          onIncrement={() => addUnlocks(1)}
          onDecrement={() => addUnlocks(-1)}
        />
        <LogCard
          icon="cup-water"
          label="Water"
          value={stats.waterGlasses}
          displayValue={String(stats.waterGlasses)}
          unit="glasses"
          step={1}
          onIncrement={() => addWater(1)}
          onDecrement={() => addWater(-1)}
          accent
        />
        <LogCard
          icon="book-open-variant"
          label="Reading"
          value={stats.readingMinutes}
          displayValue={String(stats.readingMinutes)}
          unit="min"
          step={15}
          onIncrement={() => addReading(15)}
          onDecrement={() => addReading(-15)}
          accent
        />
        <LogCard
          icon="youtube"
          label="Shorts"
          value={stats.shortsWatched}
          displayValue={String(stats.shortsWatched)}
          unit="watched"
          step={10}
          onIncrement={() => addShorts(10)}
          onDecrement={() => addShorts(-10)}
        />
        <LogCard
          icon="fire"
          label="Gym Streak"
          value={streaks.gym}
          displayValue={String(streaks.gym)}
          unit="days"
          step={1}
          onIncrement={() => {}}
          onDecrement={() => {}}
          accent
        />
      </View>

      {/* Over-limit warning banner */}
      {isOverLimit && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: "#FF980015", borderColor: "#FF980050" },
          ]}
        >
          <MaterialCommunityIcons name="alert-circle" size={16} color="#FF9800" />
          <Text
            style={[
              styles.warningText,
              { color: "#FF9800", fontFamily: "Inter_500Medium" },
            ]}
          >
            Screen time limit hit ({settings.dailyScreenTimeLimit} min). You
            know what you're doing.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 28 },
  appName: { fontSize: 42, letterSpacing: 8 },
  tagline: { fontSize: 13, marginTop: 2, letterSpacing: 1 },

  scoreContainer: { alignItems: "center", marginBottom: 28 },
  scoreRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: { fontSize: 40, lineHeight: 44 },
  scoreLabel: { fontSize: 12, marginTop: -4 },
  scoreTitle: { fontSize: 13, marginTop: 10, letterSpacing: 1 },

  roastCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  roastCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  roastCardTitle: { fontSize: 11, letterSpacing: 2 },
  roastText: { fontSize: 17, lineHeight: 26, marginBottom: 16 },
  newVerdictBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  newVerdictText: { fontSize: 14, letterSpacing: 0.5 },

  gymToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  gymToggleTitle: { fontSize: 16, letterSpacing: 0.5 },
  gymToggleSub: { fontSize: 12, marginTop: 2 },
  gymToggleBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, letterSpacing: 2 },
  sectionHint: { fontSize: 11 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  logCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  logCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logCardLabel: { fontSize: 11, flex: 1 },
  logCardBody: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  logCardValue: { fontSize: 26, lineHeight: 30 },
  logCardUnit: { fontSize: 12 },
  logCardControls: {
    flexDirection: "row",
    gap: 6,
  },
  logBtn: {
    flex: 1,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  warningText: { fontSize: 13, flex: 1, lineHeight: 18 },
});
