import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGenerateDailyReport } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
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
          <Text style={[styles.scoreNumber, { color, fontFamily: "Inter_700Bold" }]}>
            {score}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            / 100
          </Text>
        </View>
      </View>
      <Text style={[styles.scoreTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        Productivity Score
      </Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: accent ? colors.primary + "40" : colors.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={accent ? colors.primary : colors.mutedForeground}
      />
      <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        {value}
        {unit && (
          <Text style={[styles.statUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {" "}{unit}
          </Text>
        )}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, streaks, productivityScore, todaysRoast, setTodaysRoast } = useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const screenTimeH = Math.floor(stats.screenTimeMinutes / 60);
  const screenTimeM = stats.screenTimeMinutes % 60;
  const screenTimeStr = screenTimeH > 0 ? `${screenTimeH}h ${screenTimeM}m` : `${screenTimeM}m`;

  const handleGetVerdict = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    getVerdict({
      screenTime: screenTimeStr,
      topApp: "Instagram",
      gymMissed: !stats.gymDone,
      waterGlasses: stats.waterGlasses,
      readingMinutes: stats.readingMinutes,
      shortsWatched: stats.shortsWatched,
      productivityScore,
    });
  };

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
      <View style={styles.header}>
        <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          BULLY
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No excuses. Just results.
        </Text>
      </View>

      <ScoreRing score={productivityScore} />

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
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.primary} />
          <Text style={[styles.roastCardTitle, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            TODAY'S VERDICT
          </Text>
        </View>
        <Text style={[styles.roastText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          "{todaysRoast}"
        </Text>
        <Pressable
          onPress={handleGetVerdict}
          style={({ pressed }) => [
            styles.newVerdictBtn,
            { backgroundColor: colors.primary + "20", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {isPending ? (
            <Text style={[styles.newVerdictText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Analyzing...
            </Text>
          ) : (
            <Text style={[styles.newVerdictText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Get Today's Verdict
            </Text>
          )}
        </Pressable>
      </Animated.View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        TODAY'S STATS
      </Text>

      <View style={styles.statsGrid}>
        <StatCard icon="cellphone" label="Screen Time" value={screenTimeStr} />
        <StatCard icon="cellphone-lock" label="Unlocks" value={stats.unlockCount} />
        <StatCard icon="dumbbell" label="Gym Streak" value={streaks.gym} unit="days" accent />
        <StatCard icon="cup-water" label="Water" value={stats.waterGlasses} unit="glasses" />
        <StatCard icon="book-open-variant" label="Reading" value={stats.readingMinutes} unit="min" />
        <StatCard icon="youtube" label="Shorts" value={stats.shortsWatched} unit="watched" />
      </View>
    </ScrollView>
  );
}

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
    marginBottom: 28,
  },
  roastCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  roastCardTitle: { fontSize: 11, letterSpacing: 2 },
  roastText: { fontSize: 17, lineHeight: 26, marginBottom: 16 },
  newVerdictBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  newVerdictText: { fontSize: 14, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  statValue: { fontSize: 22, lineHeight: 26 },
  statUnit: { fontSize: 13 },
  statLabel: { fontSize: 12 },
});
