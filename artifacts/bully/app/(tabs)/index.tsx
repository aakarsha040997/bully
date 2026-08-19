import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useGenerateDailyReport } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { triggerScreenTimeAlert } from "@/services/monitoring";
import {
  hasUsagePermission,
  getTotalScreenMinutes,
  getTopApp,
  getAppUsageStats,
  getUnlockCount,
  updateOverlayRoast,
  type AppUsage,
} from "@/services/usageStats";
import { RARITY_COLORS } from "@/services/achievements";
import type { Personality } from "@/services/roastEngine/types";
import type { ScoreTrend } from "@/services/productivityScore";
import type { DailyRecord } from "@/context/AppContext";

// ─── Personality display names ──────────────────────────────────────────────────

const PERSONALITY_LABELS: Record<Personality, string> = {
  SAVAGE: "Savage",
  SARCASTIC: "Sarcastic",
  CORPORATE_BOSS: "Boss",
  GENTLE: "Gentle",
  GYM_BRO: "Gym Bro",
  INDIAN_MOM: "Indian Mom",
  ANIME_VILLAIN: "Anime",
  FRIEND: "Friend",
};

// ─── PersonalityBadge ───────────────────────────────────────────────────────────

function PersonalityBadge({ personality }: { personality: Personality }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.personalityBadge,
        { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" },
      ]}
    >
      <MaterialCommunityIcons name="robot" size={11} color={colors.primary} />
      <Text
        style={[
          styles.personalityBadgeText,
          { color: colors.primary, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {PERSONALITY_LABELS[personality] ?? personality}
      </Text>
    </View>
  );
}

// ─── Score Donut ─────────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  reason,
  trend,
  weeklyAvg,
}: {
  score: number;
  reason: string;
  trend: ScoreTrend;
  weeklyAvg: number;
}) {
  const colors = useColors();

  const ringColor =
    score >= 70 ? "#00E676" : score >= 40 ? "#FF9800" : colors.primary;
  const trendIcon =
    trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "trending-neutral";
  const trendColor =
    trend === "up" ? "#00E676" : trend === "down" ? colors.primary : colors.mutedForeground;

  const SIZE = 140;
  const STROKE = 14;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(score, 100)) / 100);

  return (
    <View style={styles.scoreContainer}>
      <View style={styles.scoreRow}>
        <View style={{ width: 60 }} />
        <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
          <Svg
            width={SIZE}
            height={SIZE}
            style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
          >
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={ringColor + "22"}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={[styles.scoreNumber, { color: ringColor, fontFamily: "Inter_700Bold" }]}>
            {score}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            / 100
          </Text>
        </View>
        <View style={styles.scoreSideStats}>
          <View style={styles.scoreSideStat}>
            <Text style={[styles.scoreSideValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {weeklyAvg > 0 ? weeklyAvg : "—"}
            </Text>
            <Text style={[styles.scoreSideLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              weekly avg
            </Text>
          </View>
          <View style={styles.scoreSideStat}>
            <MaterialCommunityIcons name={trendIcon as any} size={22} color={trendColor} />
            <Text style={[styles.scoreSideLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              trend
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.scoreTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        Productivity Score
      </Text>
      {reason.length > 0 && (
        <Text style={[styles.scoreReason, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {reason}
        </Text>
      )}
    </View>
  );
}

// ─── Highlights Row ─────────────────────────────────────────────────────────────

interface HighlightCardProps {
  type: "win" | "miss";
  label: string;
  icon: string;
  points: number;
}

function HighlightCard({ type, label, icon, points }: HighlightCardProps) {
  const colors = useColors();
  const isWin = type === "win";
  const accent = isWin ? "#00E676" : "#FF9800";

  return (
    <View
      style={[
        styles.highlightCard,
        { backgroundColor: colors.card, borderColor: accent + "40" },
      ]}
    >
      <View style={[styles.highlightIconWrap, { backgroundColor: accent + "20" }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
      </View>
      <Text
        style={[
          styles.highlightMeta,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {isWin ? "TOP WIN" : "DISTRACTION"}
      </Text>
      <Text
        style={[
          styles.highlightLabel,
          { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.highlightPoints,
          { color: accent, fontFamily: "Inter_700Bold" },
        ]}
      >
        {points > 0 ? `+${points}` : points} pts
      </Text>
    </View>
  );
}

function HighlightsRow({
  topWin,
  topDistraction,
}: {
  topWin: { label: string; icon: string; points: number } | null;
  topDistraction: { label: string; icon: string; points: number } | null;
}) {
  if (!topWin && !topDistraction) return null;

  return (
    <View style={styles.highlightsRow}>
      {topWin && (
        <HighlightCard type="win" label={topWin.label} icon={topWin.icon} points={topWin.points} />
      )}
      {topDistraction && (
        <HighlightCard type="miss" label={topDistraction.label} icon={topDistraction.icon} points={topDistraction.points} />
      )}
    </View>
  );
}

// ─── Weekly Trend ───────────────────────────────────────────────────────────────

function ScoreDot({
  score,
  isToday,
  dateLabel,
}: {
  score: number;
  isToday?: boolean;
  dateLabel: string;
}) {
  const colors = useColors();
  const dotColor =
    score >= 70 ? "#00E676" : score >= 40 ? "#FF9800" : colors.primary;

  return (
    <View style={styles.dotWrap}>
      <View
        style={[
          styles.scoreDot,
          {
            backgroundColor: dotColor + (isToday ? "25" : "18"),
            borderColor: dotColor,
            borderWidth: isToday ? 2 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.dotScore,
            {
              color: dotColor,
              fontFamily: "Inter_700Bold",
              fontSize: isToday ? 11 : 10,
            },
          ]}
        >
          {score}
        </Text>
      </View>
      <Text
        style={[
          styles.dotLabel,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {dateLabel}
      </Text>
    </View>
  );
}

function WeeklyTrend({
  history,
  todayScore,
}: {
  history: DailyRecord[];
  todayScore: number;
}) {
  const colors = useColors();

  if (history.length === 0 && todayScore === 50) return null;

  const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const dots = useMemo(() => {
    const past = [...history].reverse().slice(-6).map((r) => {
      const d = new Date(r.date);
      return { score: r.score, label: DAY_ABBR[d.getDay()] ?? "—", isToday: false };
    });
    const todayLabel = DAY_ABBR[new Date().getDay()] ?? "—";
    return [...past, { score: todayScore, label: todayLabel, isToday: true }];
  }, [history, todayScore]);

  return (
    <View
      style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
        ]}
      >
        THIS WEEK
      </Text>
      <View style={styles.dotsRow}>
        {dots.map((d, i) => (
          <ScoreDot key={i} score={d.score} isToday={d.isToday} dateLabel={d.label} />
        ))}
      </View>
    </View>
  );
}

// ─── Next Achievement Banner ────────────────────────────────────────────────────

function NextAchievementBanner({
  achievement,
}: {
  achievement: { title: string; description: string; icon: string; rarity: string } | null;
}) {
  const colors = useColors();
  if (!achievement) return null;

  const rarityColor = RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS] ?? colors.mutedForeground;

  return (
    <View
      style={[
        styles.nextAchievCard,
        { backgroundColor: colors.card, borderColor: rarityColor + "40" },
      ]}
    >
      <View style={[styles.nextAchievIcon, { backgroundColor: rarityColor + "20" }]}>
        <MaterialCommunityIcons name={achievement.icon as any} size={18} color={rarityColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.nextAchievMeta,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          NEXT ACHIEVEMENT
        </Text>
        <Text
          style={[
            styles.nextAchievTitle,
            { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {achievement.title}
        </Text>
        <Text
          style={[
            styles.nextAchievDesc,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
          numberOfLines={1}
        >
          {achievement.description}
        </Text>
      </View>
      <MaterialCommunityIcons name="lock-outline" size={16} color={colors.mutedForeground} />
    </View>
  );
}

// ─── Achievement Toast ──────────────────────────────────────────────────────────

function AchievementToast({
  achievement,
  onDismiss,
  topInset,
}: {
  achievement: { title: string; icon: string; rarity: string };
  onDismiss: () => void;
  topInset: number;
}) {
  const colors = useColors();
  const slideY = useRef(new Animated.Value(-120)).current;
  const rarityColor =
    RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS] ?? "#FF9800";

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(slideY, {
        toValue: topInset + 12,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }),
      Animated.delay(2800),
      Animated.timing(slideY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.card,
          borderColor: rarityColor + "70",
          transform: [{ translateY: slideY }],
        },
      ]}
    >
      <Pressable onPress={onDismiss} style={styles.toastInner}>
        <View style={[styles.toastIconWrap, { backgroundColor: rarityColor + "25" }]}>
          <MaterialCommunityIcons name={achievement.icon as any} size={22} color={rarityColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.toastMeta,
              { color: rarityColor, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            ACHIEVEMENT UNLOCKED
          </Text>
          <Text
            style={[
              styles.toastTitle,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            {achievement.title}
          </Text>
        </View>
        <MaterialCommunityIcons name="close" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Logging Stat Card ──────────────────────────────────────────────────────────

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
      Animated.timing(flashAnim, { toValue: 1.06, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
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
        {warning && <MaterialCommunityIcons name="alert" size={12} color="#FF9800" />}
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
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
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
          <MaterialCommunityIcons name="minus" size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={handleIncrement}
          style={({ pressed }) => [
            styles.logBtn,
            {
              backgroundColor: accent ? colors.primary + "20" : colors.secondary,
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

// ─── Gym Toggle ─────────────────────────────────────────────────────────────────

function GymToggle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 60 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
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
              { color: done ? "#00E676" : colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            {done ? "GYM DONE" : "GYM TODAY?"}
          </Text>
          <Text
            style={[
              styles.gymToggleSub,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
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

// ─── Screen Time Card ────────────────────────────────────────────────────────────

function ScreenTimeCard({
  totalMinutes,
  dailyLimit,
  usageApps,
}: {
  totalMinutes: number;
  dailyLimit: number;
  usageApps: AppUsage[];
}) {
  const colors = useColors();
  const pct = dailyLimit > 0 ? Math.min(totalMinutes / dailyLimit, 1) : 0;
  const arcColor = pct >= 1 ? colors.primary : pct >= 0.7 ? "#FF9800" : "#00E676";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const SIZE = 88;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - pct);

  const apps = usageApps.slice(0, 4);
  const totalAppMins = apps.reduce((s, a) => s + a.totalMinutes, 0) || 1;

  return (
    <View style={[stStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[stStyles.label, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        SCREEN TIME TODAY
      </Text>
      <View style={stStyles.body}>
        {/* Donut */}
        <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
          <Svg
            width={SIZE}
            height={SIZE}
            style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
          >
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={arcColor + "22"} strokeWidth={STROKE} fill="none" />
            {pct > 0 && (
              <Circle
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                stroke={arcColor} strokeWidth={STROKE} fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            )}
          </Svg>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: arcColor }}>{timeStr}</Text>
          {dailyLimit > 0 && (
            <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {Math.round(pct * 100)}%
            </Text>
          )}
        </View>

        {/* App breakdown */}
        <View style={{ flex: 1, gap: 8 }}>
          {apps.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
              {Platform.OS === "android"
                ? "Grant Usage Access in Settings to see app breakdown."
                : "Auto-tracked on Android."}
            </Text>
          ) : (
            apps.map((app, i) => {
              const barPct = app.totalMinutes / totalAppMins;
              return (
                <View key={app.packageName} style={{ gap: 3 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 }}>
                      {app.appName}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 6 }}>
                      {app.totalMinutes}m
                    </Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{
                      height: 3,
                      width: `${Math.round(barPct * 100)}%`,
                      backgroundColor: i === 0 ? colors.primary : colors.mutedForeground + "60",
                      borderRadius: 2,
                    }} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
}

const stStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  label: { fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  body: { flexDirection: "row", gap: 16, alignItems: "center" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    stats,
    streaks,
    settings,
    productivityScore,
    scoreBreakdown,
    weeklyAvg,
    trend,
    todaysRoast,
    setTodaysRoast,
    updateStats,
    history,
    newlyUnlocked,
    clearNewlyUnlocked,
  } = useApp();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [screenTimeWarningFired, setScreenTimeWarningFired] = useState(false);
  const [topApp, setTopApp] = useState<AppUsage | null>(null);
  const [usageApps, setUsageApps] = useState<AppUsage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const roastCardY = useRef<number>(0);

  // Roast popup modal
  const [roastModalVisible, setRoastModalVisible] = useState(false);
  const [modalRoast, setModalRoast] = useState("");
  const slideAnim = useRef(new Animated.Value(600)).current;

  const showRoastModal = (text: string) => {
    setModalRoast(text);
    setRoastModalVisible(true);
    slideAnim.setValue(600);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const hideRoastModal = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setRoastModalVisible(false));
  };

  const { mutate: getVerdict, isPending } = useGenerateDailyReport({
    mutation: {
      onSuccess: (data) => {
        setTodaysRoast(data.verdict);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        updateOverlayRoast(data.verdict).catch(() => {});
        showRoastModal(data.verdict);
      },
      onError: () => {
        const fallback = "AI is offline. Your stats speak for themselves — and they're not flattering.";
        setTodaysRoast(fallback);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        updateOverlayRoast(fallback).catch(() => {});
        showRoastModal(fallback);
      },
    },
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      let cancelled = false;
      (async () => {
        const granted = await hasUsagePermission();
        if (!granted || cancelled) return;
        const [totalMins, top, apps] = await Promise.all([
          getTotalScreenMinutes(),
          getTopApp(),
          getAppUsageStats(),
        ]);
        const unlockCount = await getUnlockCount();
        if (cancelled) return;
        updateStats({ screenTimeMinutes: totalMins, unlockCount });
        setTopApp(top);
        setUsageApps(apps.slice(0, 4));
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (
      !screenTimeWarningFired &&
      stats.screenTimeMinutes >= settings.dailyScreenTimeLimit &&
      settings.dailyScreenTimeLimit > 0 &&
      settings.notificationsEnabled
    ) {
      setScreenTimeWarningFired(true);
      triggerScreenTimeAlert({
        productivityScore,
        gymDone: stats.gymDone,
        waterGlasses: stats.waterGlasses,
        readingMinutes: stats.readingMinutes,
        unlockCount: stats.unlockCount,
        screenTimeMinutes: stats.screenTimeMinutes,
        streak: streaks.gym,
        personality: settings.personality,
      }).catch(() => {});
    }
  }, [stats.screenTimeMinutes, settings.dailyScreenTimeLimit, settings.notificationsEnabled, screenTimeWarningFired]);

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

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const trendStr = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
    await Share.share({
      message:
        `📊 Bully Score: ${productivityScore}/100 ${trendStr}\n\n` +
        `"${todaysRoast}"\n\n` +
        `${scoreBreakdown.reason}\n\n` +
        `Weekly avg: ${weeklyAvg > 0 ? weeklyAvg : "—"}\n\n` +
        `#Bully #Accountability #NoExcuses`,
    });
  };

  const addUnlocks = useCallback(
    (delta: number) => updateStats({ unlockCount: Math.max(0, stats.unlockCount + delta) }),
    [stats.unlockCount, updateStats]
  );
  const addWater = useCallback(
    (delta: number) => updateStats({ waterGlasses: Math.max(0, stats.waterGlasses + delta) }),
    [stats.waterGlasses, updateStats]
  );
  const addReading = useCallback(
    (delta: number) => updateStats({ readingMinutes: Math.max(0, stats.readingMinutes + delta) }),
    [stats.readingMinutes, updateStats]
  );
  const toggleGym = useCallback(
    () => updateStats({ gymDone: !stats.gymDone }),
    [stats.gymDone, updateStats]
  );

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>

      {/* ── Roast Popup Modal (MyGate-style) ── */}
      <Modal
        visible={roastModalVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideRoastModal}
      >
        {/* Dim overlay — tap to dismiss */}
        <Pressable style={styles.modalBackdrop} onPress={hideRoastModal}>
          {/* Card slides up from bottom */}
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            // Prevent taps inside card from closing
            onStartShouldSetResponder={() => true}
          >
            {/* Red lightning icon badge */}
            <View style={[styles.modalIconBadge, { backgroundColor: colors.primary + "20" }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={32} color={colors.primary} />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.modalLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              TODAY'S VERDICT
            </Text>

            {/* Roast text */}
            <Text
              style={[
                styles.modalRoastText,
                { color: colors.foreground, fontFamily: "Inter_500Medium" },
              ]}
            >
              "{modalRoast}"
            </Text>

            {/* Action row */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  hideRoastModal();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimeout(handleShare, 350);
                }}
                style={({ pressed }) => [
                  styles.modalShareBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="share-variant" size={18} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  hideRoastModal();
                }}
                style={({ pressed }) => [
                  styles.modalDismissBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, flex: 1 },
                ]}
              >
                <Text style={[styles.modalDismissText, { fontFamily: "Inter_700Bold" }]}>
                  Got it. I'll do better.
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              numberOfLines={1}
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
          <PersonalityBadge personality={settings.personality} />
        </View>

        {/* Score ring with reason + trend */}
        <ScoreRing
          score={productivityScore}
          reason={scoreBreakdown.reason}
          trend={trend}
          weeklyAvg={weeklyAvg}
        />

        {/* Highlights: top win + biggest distraction */}
        <HighlightsRow
          topWin={scoreBreakdown.topWin}
          topDistraction={scoreBreakdown.topDistraction}
        />

        {/* Today's verdict */}
        <Animated.View
          onLayout={(e) => { roastCardY.current = e.nativeEvent.layout.y; }}
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
            <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.primary} />
            <Text
              style={[
                styles.roastCardTitle,
                { color: colors.primary, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              TODAY'S VERDICT
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={14}
                color={colors.mutedForeground}
              />
            </Pressable>
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
              { backgroundColor: colors.primary + "20", opacity: pressed ? 0.7 : 1 },
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

        {/* Weekly trend */}
        <WeeklyTrend history={history} todayScore={productivityScore} />

        {/* Screen time donut */}
        <ScreenTimeCard
          totalMinutes={stats.screenTimeMinutes}
          dailyLimit={settings.dailyScreenTimeLimit}
          usageApps={usageApps}
        />

        {/* Log section */}
        <View style={styles.sectionRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            LOG TODAY
          </Text>
          <Text
            style={[
              styles.sectionHint,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            tap + / − to update
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
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

        {/* Over-limit warning */}
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
              Screen time limit hit ({settings.dailyScreenTimeLimit} min). You know what you're doing.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Achievement toast — absolute, above scroll */}
      {newlyUnlocked.length > 0 && (
        <AchievementToast
          achievement={newlyUnlocked[0]}
          onDismiss={clearNewlyUnlocked}
          topInset={topInset}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: { flex: 1 },
  appName: { fontSize: 40, letterSpacing: 5 },
  tagline: { fontSize: 13, marginTop: 2, letterSpacing: 1 },

  personalityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  personalityBadgeText: { fontSize: 11, letterSpacing: 0.5 },

  scoreContainer: { alignItems: "center", marginBottom: 20 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 10,
  },
  scoreNumber: { fontSize: 40, lineHeight: 44 },
  scoreLabel: { fontSize: 12, marginTop: -4 },
  scoreSideStats: { width: 60, gap: 16 },
  scoreSideStat: { alignItems: "center", gap: 2 },
  scoreSideValue: { fontSize: 18, lineHeight: 22 },
  scoreSideLabel: { fontSize: 10, letterSpacing: 0.3 },
  scoreTitle: { fontSize: 13, letterSpacing: 1 },
  scoreReason: { fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 30 },

  highlightsRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  highlightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  highlightCardEmpty: {},
  highlightIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  highlightMeta: { fontSize: 9, letterSpacing: 1.5 },
  highlightLabel: { fontSize: 13 },
  highlightPoints: { fontSize: 14 },

  // Roast popup modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
  },
  modalRoastText: {
    fontSize: 20,
    lineHeight: 30,
    textAlign: "center",
    marginVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    alignSelf: "stretch",
  },
  modalShareBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDismissBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalDismissText: {
    color: "#fff",
    fontSize: 15,
  },

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
  roastText: { fontSize: 22, lineHeight: 32, marginBottom: 16 },
  shareBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
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
    marginBottom: 12,
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

  trendCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  dotWrap: { alignItems: "center", gap: 4 },
  scoreDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dotScore: { lineHeight: 14 },
  dotLabel: { fontSize: 9, letterSpacing: 0.5 },

  nextAchievCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  nextAchievIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  nextAchievMeta: { fontSize: 9, letterSpacing: 1.5, marginBottom: 1 },
  nextAchievTitle: { fontSize: 14 },
  nextAchievDesc: { fontSize: 11, marginTop: 1 },

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
  logCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  logCardLabel: { fontSize: 11, flex: 1 },
  logCardBody: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  logCardValue: { fontSize: 26, lineHeight: 30 },
  logCardUnit: { fontSize: 12 },
  logCardControls: { flexDirection: "row", gap: 6 },
  logBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { fontSize: 13, flex: 1, lineHeight: 18 },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  toastInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  toastIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  toastMeta: { fontSize: 9, letterSpacing: 1.5 },
  toastTitle: { fontSize: 15 },
});
