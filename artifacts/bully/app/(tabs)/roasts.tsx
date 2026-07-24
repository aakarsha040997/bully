import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGenerateRoast } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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

const DURATIONS = [
  "15 minutes",
  "30 minutes",
  "1 hour",
  "2+ hours",
  "All day",
  "Lost count",
];

const FALLBACK_ROASTS = [
  "No internet? Even your WiFi gave up on you. Impressive.",
  "The AI is offline. Unlike your bad habits, which are very much online.",
  "Can't reach the server. You've successfully broken even the roast machine.",
  "Network error. Your procrastination skills, however, are working perfectly.",
  "Offline mode engaged. The universe is protecting you from how bad this roast would've been.",
];

function buildContext(activities: string[], duration: string): string {
  if (activities.length === 0) return `doing nothing for ${duration}`;
  if (activities.length === 1) return `${activities[0]} for ${duration}`;
  const last = activities[activities.length - 1];
  const rest = activities.slice(0, -1).join(", ");
  return `${rest} and ${last} for ${duration} each`;
}

export default function RoastsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setTodaysRoast } = useApp();
  const [selectedLevel, setSelectedLevel] = useState(settings.roastLevel);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(["Instagram"]);
  const [selectedDuration, setSelectedDuration] = useState("30 minutes");
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isOffline, setIsOffline] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [modalRoast, setModalRoast] = useState("");
  const [modalOffline, setModalOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const showModal = (text: string, offline = false) => {
    setModalRoast(text);
    setModalOffline(offline);
    setModalVisible(true);
    slideAnim.setValue(600);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({ message: `Bully just roasted me:\n\n"${modalRoast}"` }).catch(() => {});
  };

  // ── API call ───────────────────────────────────────────────────────────────
  const { mutate: getRoast, isPending } = useGenerateRoast({
    mutation: {
      onSuccess: (data) => {
        setIsOffline(false);
        setCurrentRoast(data.roast);
        setTodaysRoast(data.roast);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showModal(data.roast, false);
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      },
      onError: () => {
        setIsOffline(true);
        const fallback = FALLBACK_ROASTS[Math.floor(Math.random() * FALLBACK_ROASTS.length)];
        setCurrentRoast(fallback);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showModal(fallback, true);
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      },
    },
  });

  const toggleActivity = (key: string) => {
    Haptics.selectionAsync();
    setSelectedActivities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const handleRoastMe = () => {
    if (selectedActivities.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    const context = buildContext(selectedActivities, selectedDuration);
    getRoast({
      data: {
        roastLevel: selectedLevel,
        activityType: selectedActivities.join(", "),
        context,
      },
    });
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const selectedCount = selectedActivities.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Roast popup modal — slides up from the bottom */}
      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={hideModal}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Tap inside card without closing */}
            <Pressable onPress={() => {}} style={{ alignItems: "center", gap: 12, width: "100%" }}>

              {/* Icon badge */}
              <View
                style={[
                  styles.modalIconBadge,
                  { backgroundColor: modalOffline ? colors.secondary : colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name={modalOffline ? "wifi-off" : "fire"}
                  size={32}
                  color={modalOffline ? colors.mutedForeground : colors.primary}
                />
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.modalLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {modalOffline ? "OFFLINE ROAST" : "YOUR ROAST IS READY"}
              </Text>

              {/* Roast text */}
              <Text
                style={[
                  styles.modalRoastText,
                  {
                    color: modalOffline ? colors.mutedForeground : colors.foreground,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {"\u201C"}{modalRoast}{"\u201D"}
              </Text>

              {/* Action row */}
              <View style={styles.modalActions}>
                {!modalOffline && (
                  <Pressable
                    onPress={() => { hideModal(); setTimeout(handleShare, 300); }}
                    style={({ pressed }) => [
                      styles.modalShareBtn,
                      { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <MaterialCommunityIcons name="share-variant" size={18} color={colors.mutedForeground} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    hideModal();
                  }}
                  style={({ pressed }) => [
                    styles.modalDismissBtn,
                    {
                      backgroundColor: modalOffline ? colors.secondary : colors.primary,
                      opacity: pressed ? 0.85 : 1,
                      flex: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalDismissText,
                      {
                        fontFamily: "Inter_700Bold",
                        color: modalOffline ? colors.foreground : "#fff",
                      },
                    ]}
                  >
                    {modalOffline ? "Close" : "Got it. I'll do better."}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Main scroll content */}
      <ScrollView
        style={styles.container}
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
          Pick your crimes. Face the consequences.
        </Text>

        {/* Roast Level */}
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

        {/* Your Crimes */}
        <View style={styles.crimesHeader}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            YOUR CRIMES
          </Text>
          <View style={styles.crimesBadgeRow}>
            {selectedCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.countBadgeText, { fontFamily: "Inter_700Bold" }]}>
                  {selectedCount}
                </Text>
              </View>
            )}
            <Text style={[styles.crimesSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {selectedCount === 0 ? "tap to select" : "selected"}
            </Text>
            {selectedCount > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedActivities([]);
                }}
              >
                <Text style={[styles.clearText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  clear
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.activitiesGrid}>
          {ACTIVITIES.map(({ key, icon }) => {
            const active = selectedActivities.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggleActivity(key)}
                style={({ pressed }) => [
                  styles.activityChip,
                  {
                    backgroundColor: active ? colors.primary + "20" : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.75 : 1,
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
                {active && (
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Duration */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          FOR HOW LONG
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contextScroll}>
          {DURATIONS.map((dur) => {
            const active = selectedDuration === dur;
            return (
              <Pressable
                key={dur}
                onPress={() => {
                  setSelectedDuration(dur);
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
                  {dur}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Context preview */}
        {selectedCount > 1 && (
          <View style={[styles.previewPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="eye-outline" size={14} color={colors.mutedForeground} />
            <Text
              style={[styles.previewText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              numberOfLines={2}
            >
              {"\u201C"}{buildContext(selectedActivities, selectedDuration)}{"\u201D"}
            </Text>
          </View>
        )}

        {/* CTA button */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Pressable
            onPress={handleRoastMe}
            disabled={isPending || selectedCount === 0}
            style={({ pressed }) => [
              styles.roastBtn,
              {
                backgroundColor:
                  selectedCount === 0
                    ? colors.secondary
                    : isPending
                    ? colors.primary + "80"
                    : colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={22} color="#fff" />
            <Text style={[styles.roastBtnText, { fontFamily: "Inter_700Bold" }]}>
              {isPending
                ? "GENERATING..."
                : selectedCount === 0
                ? "SELECT A CRIME"
                : selectedCount === 1
                ? "ROAST ME"
                : `ROAST ALL ${selectedCount}`}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Result card (shows below after dismissing modal) */}
        {currentRoast && (
          <Animated.View
            style={[
              styles.roastOutput,
              {
                backgroundColor: colors.card,
                borderColor: isOffline ? colors.border : colors.primary + "50",
                opacity: fadeAnim,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isOffline ? "wifi-off" : "fire"}
              size={20}
              color={isOffline ? colors.mutedForeground : colors.primary}
            />
            <Text
              style={[
                styles.roastOutputText,
                {
                  color: isOffline ? colors.mutedForeground : colors.foreground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {"\u201C"}{currentRoast}{"\u201D"}
            </Text>
            {isOffline && (
              <Text style={[styles.offlineLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                offline — local roast
              </Text>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
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
  crimesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  crimesBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  countBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: "#fff", fontSize: 11 },
  crimesSub: { fontSize: 11 },
  clearText: { fontSize: 11 },
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
  contextScroll: { marginBottom: 16 },
  contextChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  contextLabel: { fontSize: 13 },
  previewPill: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
  },
  previewText: { fontSize: 12, flex: 1, lineHeight: 17, fontStyle: "italic" },
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
  offlineLabel: { fontSize: 11, letterSpacing: 1 },

  // Modal
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
  modalLabel: { fontSize: 10, letterSpacing: 2.5 },
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
    width: "100%",
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
  modalDismissText: { fontSize: 15 },
});
