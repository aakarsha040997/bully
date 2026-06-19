import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
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

import { type Streaks, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface StreakCardProps {
  streakKey: keyof Streaks;
  label: string;
  icon: string;
  count: number;
  onIncrement: () => void;
  onReset: () => void;
}

function StreakCard({ streakKey, label, icon, count, onIncrement, onReset }: StreakCardProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.08, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onIncrement();
  };

  const isOnFire = count >= 7;
  const accentColor = isOnFire ? "#FF9800" : count > 0 ? colors.primary : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: count > 0 ? accentColor + "40" : colors.border,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + "15" }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={accentColor} />
          {isOnFire && (
            <MaterialCommunityIcons
              name="fire"
              size={14}
              color="#FF9800"
              style={styles.fireOverlay}
            />
          )}
        </View>
        <View>
          <Text style={[styles.cardLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {label}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {count === 0
              ? "Start today"
              : count === 1
              ? "1 day — keep going"
              : `${count} days strong`}
          </Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={[styles.streakNum, { color: accentColor, fontFamily: "Inter_700Bold" }]}>
          {count}
        </Text>
        <View style={styles.cardActions}>
          <Pressable
            onPress={handleIncrement}
            style={[styles.actionBtn, { backgroundColor: accentColor + "20" }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={accentColor} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReset();
            }}
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          >
            <MaterialCommunityIcons name="refresh" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const STREAK_CONFIG = [
  { key: "gym" as keyof Streaks, label: "Gym", icon: "dumbbell" },
  { key: "study" as keyof Streaks, label: "Study", icon: "book-open-variant" },
  { key: "reading" as keyof Streaks, label: "Reading", icon: "book-outline" },
  { key: "noDoomscroll" as keyof Streaks, label: "No Doomscroll", icon: "cellphone-off" },
  { key: "wakeUp" as keyof Streaks, label: "Early Wake-Up", icon: "alarm" },
];

export default function StreaksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { streaks, incrementStreak, resetStreak } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const totalStreak = Object.values(streaks).reduce((a, b) => a + b, 0);
  const bestStreak = Math.max(...Object.values(streaks));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        STREAKS
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Consistency is the only flex.
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.primary} />
          <Text style={[styles.summaryNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {totalStreak}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Total Days
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="trophy" size={22} color="#FFD700" />
          <Text style={[styles.summaryNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {bestStreak}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Best Streak
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="fire" size={22} color="#FF9800" />
          <Text style={[styles.summaryNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {Object.values(streaks).filter((v) => v >= 7).length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            On Fire
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        YOUR HABITS
      </Text>

      {STREAK_CONFIG.map(({ key, label, icon }) => (
        <StreakCard
          key={key}
          streakKey={key}
          label={label}
          icon={icon}
          count={streaks[key]}
          onIncrement={() => incrementStreak(key)}
          onReset={() => resetStreak(key)}
        />
      ))}

      <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.mutedForeground} />
        <Text style={[styles.tipText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Tap + to log today's activity. Tap the refresh icon to reset a broken streak.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 36, letterSpacing: 4, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryNum: { fontSize: 28 },
  summaryLabel: { fontSize: 10, textAlign: "center" },
  sectionLabel: { fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fireOverlay: { position: "absolute", top: -4, right: -4 },
  cardLabel: { fontSize: 15 },
  cardSub: { fontSize: 12, marginTop: 1 },
  cardRight: { alignItems: "center", gap: 6 },
  streakNum: { fontSize: 32, lineHeight: 36 },
  cardActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  tipText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
