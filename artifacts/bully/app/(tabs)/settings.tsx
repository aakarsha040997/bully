import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type RoastLevel, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  1: "Friendly",
  2: "Sarcastic",
  3: "Savage",
  4: "Unhinged",
};

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
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
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, streaks, stats } = useApp();
  const [screenLimit, setScreenLimit] = useState(String(settings.dailyScreenTimeLimit));
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const toggleDay = (day: string) => {
    Haptics.selectionAsync();
    const days = settings.gymSchedule.days.includes(day)
      ? settings.gymSchedule.days.filter((d) => d !== day)
      : [...settings.gymSchedule.days, day];
    updateSettings({ gymSchedule: { ...settings.gymSchedule, days } });
  };

  const handleResetAll = () => {
    if (Platform.OS === "web") {
      updateSettings({
        roastLevel: 2,
        gymSchedule: { days: ["Mon", "Wed", "Fri"], time: "07:00" },
        dailyScreenTimeLimit: 120,
        notificationsEnabled: true,
      });
      return;
    }
    Alert.alert("Reset All Data", "This will reset all streaks and stats. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          updateSettings({
            roastLevel: 2,
            gymSchedule: { days: ["Mon", "Wed", "Fri"], time: "07:00" },
            dailyScreenTimeLimit: 120,
            notificationsEnabled: true,
          });
        },
      },
    ]);
  };

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
        SETTINGS
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Make it hurt. Or don't.
      </Text>

      <SectionHeader title="ROAST LEVEL" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                <Text style={[styles.levelNum, { color: active ? "#fff" : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                  {level}
                </Text>
                <Text style={[styles.levelLabel, { color: active ? "#fff" : colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {ROAST_LEVEL_LABELS[level]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionHeader title="GYM SCHEDULE" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardSubLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
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
                <Text style={[styles.dayLabel, { color: active ? "#fff" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionHeader title="LIMITS" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="cellphone-clock" label="Daily screen time limit">
          <View style={styles.inputGroup}>
            <TextInput
              value={screenLimit}
              onChangeText={setScreenLimit}
              onBlur={() => {
                const val = parseInt(screenLimit);
                if (!isNaN(val) && val > 0) updateSettings({ dailyScreenTimeLimit: val });
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
            <Text style={[styles.inputUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              min
            </Text>
          </View>
        </SettingRow>
      </View>

      <SectionHeader title="ABOUT" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
        <SettingRow icon="application" label="Version">
          <Text style={[styles.valueText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            1.0.0
          </Text>
        </SettingRow>
        <SettingRow icon="robot" label="AI Model">
          <Text style={[styles.valueText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            GPT-4o-mini
          </Text>
        </SettingRow>
        <SettingRow icon="shield-check" label="No hate speech, ever">
          <MaterialCommunityIcons name="check-circle" size={20} color="#00E676" />
        </SettingRow>
      </View>

      <Pressable
        onPress={handleResetAll}
        style={[styles.resetBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
      >
        <MaterialCommunityIcons name="delete-sweep" size={18} color={colors.primary} />
        <Text style={[styles.resetText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
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
  sectionHeader: { fontSize: 11, letterSpacing: 2, marginBottom: 10, marginTop: 8 },
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
});
