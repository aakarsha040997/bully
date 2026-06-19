import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGenerateRoast } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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

const ROAST_LEVELS = [
  { level: 1, label: "Friendly", desc: "A gentle nudge" },
  { level: 2, label: "Sarcastic", desc: "Witty and cutting" },
  { level: 3, label: "Savage", desc: "No mercy" },
  { level: 4, label: "Unhinged", desc: "Total chaos" },
] as const;

const ACTIVITIES = [
  { key: "Instagram", icon: "instagram" },
  { key: "YouTube Shorts", icon: "youtube" },
  { key: "TikTok", icon: "music-note" },
  { key: "Reddit", icon: "reddit" },
  { key: "Twitter/X", icon: "twitter" },
  { key: "Netflix", icon: "television-play" },
  { key: "Gaming", icon: "gamepad-variant" },
  { key: "Missed Gym", icon: "dumbbell" },
  { key: "Doomscrolling", icon: "cellphone" },
  { key: "Discord", icon: "message" },
  { key: "Staying in Bed", icon: "bed" },
  { key: "Procrastinating", icon: "clock-alert" },
];

const CONTEXTS: Record<string, string[]> = {
  Instagram: ["15 minutes", "30 minutes", "1 hour", "2+ hours", "Lost count"],
  "YouTube Shorts": ["10 videos", "30 videos", "60+ videos", "Still going"],
  TikTok: ["15 minutes", "30 minutes", "1 hour", "2+ hours"],
  Reddit: ["15 minutes", "30 minutes", "1 hour", "Going down a rabbit hole"],
  "Twitter/X": ["15 minutes", "30 minutes", "1 hour", "Pure rage-scrolling"],
  Netflix: ["1 episode", "3 episodes", "Full season", "Lost track"],
  Gaming: ["30 minutes", "1 hour", "3 hours", "All day"],
  "Missed Gym": ["Today", "2 days in a row", "A whole week", "This month"],
  Doomscrolling: ["15 minutes", "30 minutes", "1 hour", "Past midnight"],
  Discord: ["30 minutes", "1 hour", "All afternoon", "While working"],
  "Staying in Bed": ["30 mins past alarm", "1 hour late", "2+ hours late"],
  Procrastinating: ["30 minutes", "1 hour", "All morning", "All day"],
};

export default function RoastsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setTodaysRoast } = useApp();
  const [selectedLevel, setSelectedLevel] = useState(settings.roastLevel);
  const [selectedActivity, setSelectedActivity] = useState<string>("Instagram");
  const [selectedContext, setSelectedContext] = useState<string>("30 minutes");
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { mutate: getRoast, isPending } = useGenerateRoast({
    mutation: {
      onSuccess: (data) => {
        setCurrentRoast(data.roast);
        setTodaysRoast(data.roast);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      },
    },
  });

  const handleRoastMe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    getRoast({
      roastLevel: selectedLevel,
      activityType: selectedActivity,
      context: `${selectedActivity} for ${selectedContext}`,
    });
  };

  const contexts = CONTEXTS[selectedActivity] ?? ["Just now", "30 minutes", "1 hour"];
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
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        GET ROASTED
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Pick your crime. Face the consequences.
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        ROAST LEVEL
      </Text>
      <View style={styles.levelsRow}>
        {ROAST_LEVELS.map(({ level, label, desc }) => {
          const active = selectedLevel === level;
          return (
            <Pressable
              key={level}
              onPress={() => {
                setSelectedLevel(level);
                Haptics.selectionAsync();
              }}
              style={[
                styles.levelCard,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.levelNum, { color: active ? "#fff" : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                {level}
              </Text>
              <Text style={[styles.levelLabel, { color: active ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {label}
              </Text>
              <Text style={[styles.levelDesc, { color: active ? "rgba(255,255,255,0.7)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {desc}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        YOUR CRIME
      </Text>
      <View style={styles.activitiesGrid}>
        {ACTIVITIES.map(({ key, icon }) => {
          const active = selectedActivity === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setSelectedActivity(key);
                setSelectedContext(CONTEXTS[key]?.[1] ?? "30 minutes");
                Haptics.selectionAsync();
              }}
              style={[
                styles.activityChip,
                {
                  backgroundColor: active ? colors.primary + "20" : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={icon as any}
                size={16}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.activityLabel, { color: active ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {key}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        FOR HOW LONG
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contextScroll}>
        {contexts.map((ctx) => {
          const active = selectedContext === ctx;
          return (
            <Pressable
              key={ctx}
              onPress={() => {
                setSelectedContext(ctx);
                Haptics.selectionAsync();
              }}
              style={[
                styles.contextChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.contextLabel, { color: active ? "#fff" : colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {ctx}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <Pressable
          onPress={handleRoastMe}
          disabled={isPending}
          style={({ pressed }) => [
            styles.roastBtn,
            {
              backgroundColor: isPending ? colors.primary + "80" : colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={22} color="#fff" />
          <Text style={[styles.roastBtnText, { fontFamily: "Inter_700Bold" }]}>
            {isPending ? "GENERATING..." : "ROAST ME"}
          </Text>
        </Pressable>
      </Animated.View>

      {currentRoast && (
        <Animated.View
          style={[
            styles.roastOutput,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary + "50",
              opacity: fadeAnim,
            },
          ]}
        >
          <MaterialCommunityIcons name="fire" size={20} color={colors.primary} />
          <Text style={[styles.roastOutputText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            "{currentRoast}"
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 36, letterSpacing: 4, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  sectionLabel: { fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  levelsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  levelCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  levelNum: { fontSize: 20 },
  levelLabel: { fontSize: 11 },
  levelDesc: { fontSize: 9, textAlign: "center" },
  activitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  activityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  activityLabel: { fontSize: 13 },
  contextScroll: { marginBottom: 24 },
  contextChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  contextLabel: { fontSize: 13 },
  roastBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 20,
  },
  roastBtnText: { color: "#fff", fontSize: 18, letterSpacing: 2 },
  roastOutput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  roastOutputText: { fontSize: 18, lineHeight: 28, textAlign: "center" },
});
