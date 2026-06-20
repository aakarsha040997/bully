import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGenerateDailyReport } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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

import { useApp, type DailyRecord, type DailyStats } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function shortDay(dateStr: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  try {
    return days[new Date(dateStr).getDay()];
  } catch {
    return "—";
  }
}

function weekRange(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(now)}`;
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

interface BarChartProps {
  values: number[];
  labels: string[];
  /** Index that represents "today" — highlighted in accent colour */
  todayIndex: number;
  accentColor: string;
  dimColor: string;
  maxHeight?: number;
}

function BarChart({
  values,
  labels,
  todayIndex,
  accentColor,
  dimColor,
  maxHeight = 72,
}: BarChartProps) {
  const colors = useColors();
  const max = Math.max(...values, 1);
  return (
    <View style={bc.row}>
      {values.map((val, i) => {
        const height = Math.max(4, (val / max) * maxHeight);
        const isToday = i === todayIndex;
        return (
          <View key={i} style={bc.col}>
            <View
              style={[
                bc.bar,
                {
                  height,
                  backgroundColor: isToday ? accentColor : dimColor,
                  borderRadius: 4,
                },
              ]}
            />
            <Text
              style={[
                bc.label,
                {
                  color: isToday ? accentColor : colors.mutedForeground,
                  fontFamily: isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const bc = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  col: { flex: 1, alignItems: "center", gap: 5 },
  bar: { width: "100%" },
  label: { fontSize: 9, letterSpacing: 0.3 },
});

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        sp.pill,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={15}
        color={colors.mutedForeground}
      />
      <Text
        style={[sp.value, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
      >
        {value}
      </Text>
      <Text
        style={[sp.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
      >
        {label}
      </Text>
    </View>
  );
}

const sp = StyleSheet.create({
  pill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  value: { fontSize: 20 },
  label: { fontSize: 10, letterSpacing: 0.5, textAlign: "center" },
});

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        sc.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          sc.title,
          { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const sc = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, gap: 14 },
  title: { fontSize: 10, letterSpacing: 2 },
});

// ─── Streak Row ───────────────────────────────────────────────────────────────

function StreakRow({
  icon,
  label,
  count,
}: {
  icon: string;
  label: string;
  count: number;
}) {
  const colors = useColors();
  const color = count >= 7 ? "#00E676" : count >= 3 ? "#FF9800" : colors.primary;
  return (
    <View style={str.row}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text
        style={[str.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
      >
        {label}
      </Text>
      <Text style={[str.count, { color, fontFamily: "Inter_700Bold" }]}>
        {count} {count === 1 ? "day" : "days"}
      </Text>
    </View>
  );
}

const str = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: { flex: 1, fontSize: 13 },
  count: { fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WeeklyReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, stats, productivityScore, streaks, todaysRoast, settings } =
    useApp();

  const [weeklyVerdict, setWeeklyVerdict] = useState<string | null>(null);

  // Combine today + history into chronological week data (oldest → newest)
  const weekDays = useMemo(() => {
    const todayRecord: DailyRecord = {
      date: new Date().toDateString(),
      score: productivityScore,
      stats,
    };
    // history[0] is yesterday, history[n] is oldest — reverse so we go old→new
    const historical = [...history].reverse();
    return [...historical, todayRecord].slice(-7);
  }, [history, stats, productivityScore]);

  const todayIndex = weekDays.length - 1;

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalScreenMins = weekDays.reduce(
    (s, d) => s + d.stats.screenTimeMinutes,
    0,
  );
  const avgScore =
    weekDays.length > 0
      ? Math.round(
          weekDays.reduce((s, d) => s + d.score, 0) / weekDays.length,
        )
      : 0;
  const gymDays = weekDays.filter((d) => d.stats.gymDone).length;
  const totalReadingMins = weekDays.reduce(
    (s, d) => s + d.stats.readingMinutes,
    0,
  );
  const avgWater =
    weekDays.length > 0
      ? Math.round(
          weekDays.reduce((s, d) => s + d.stats.waterGlasses, 0) /
            weekDays.length,
        )
      : 0;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const scoreValues = weekDays.map((d) => d.score);
  const screenValues = weekDays.map((d) => d.stats.screenTimeMinutes);
  const dayLabels = weekDays.map((d, i) =>
    i === todayIndex ? "Now" : shortDay(d.date),
  );

  // ── Weekly verdict via AI ──────────────────────────────────────────────────
  const screenTimeStr = fmtMins(stats.screenTimeMinutes);
  const { mutate: getVerdict, isPending } = useGenerateDailyReport({
    mutation: {
      onSuccess: (data) => {
        setWeeklyVerdict(data.verdict);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    },
  });

  const handleGetWeeklyVerdict = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    getVerdict({
      data: {
        screenTime: `${fmtMins(totalScreenMins)} total this week`,
        topApp: "see weekly usage",
        gymMissed: gymDays === 0,
        waterGlasses: avgWater,
        readingMinutes: totalReadingMins,
        shortsWatched: weekDays.reduce((s, d) => s + d.stats.shortsWatched, 0),
        productivityScore: avgScore,
      },
    });
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const scoreColor =
    avgScore >= 70 ? "#00E676" : avgScore >= 40 ? "#FF9800" : colors.primary;

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
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          WEEKLY REPORT
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {weekRange()}
        </Text>
      </View>

      {/* Summary pills */}
      <View style={styles.pillRow}>
        <StatPill
          icon="cellphone"
          label="screen time"
          value={fmtMins(totalScreenMins)}
        />
        <StatPill
          icon="lightning-bolt"
          label="avg score"
          value={String(avgScore)}
        />
        <StatPill icon="dumbbell" label="gym days" value={String(gymDays)} />
      </View>

      {/* Score trend */}
      <SectionCard title="PRODUCTIVITY SCORE">
        <View style={styles.chartHeader}>
          <Text
            style={[
              styles.chartMainVal,
              { color: scoreColor, fontFamily: "Inter_700Bold" },
            ]}
          >
            {avgScore}
          </Text>
          <Text
            style={[
              styles.chartMainLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            weekly average
          </Text>
        </View>
        {weekDays.length > 0 ? (
          <BarChart
            values={scoreValues}
            labels={dayLabels}
            todayIndex={todayIndex}
            accentColor={scoreColor}
            dimColor={scoreColor + "40"}
          />
        ) : (
          <Text
            style={[
              styles.emptyNote,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Log a few days to see the trend.
          </Text>
        )}
      </SectionCard>

      {/* Screen time chart */}
      <SectionCard title="SCREEN TIME">
        <View style={styles.chartHeader}>
          <Text
            style={[
              styles.chartMainVal,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            {fmtMins(totalScreenMins)}
          </Text>
          <Text
            style={[
              styles.chartMainLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            total this week
          </Text>
        </View>
        {weekDays.length > 0 ? (
          <BarChart
            values={screenValues}
            labels={dayLabels}
            todayIndex={todayIndex}
            accentColor={colors.primary}
            dimColor={colors.primary + "35"}
          />
        ) : (
          <Text
            style={[
              styles.emptyNote,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Log screen time to see the chart.
          </Text>
        )}
      </SectionCard>

      {/* This week habits */}
      <SectionCard title="HABITS THIS WEEK">
        <View style={styles.habitGrid}>
          <View
            style={[
              styles.habitCell,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <MaterialCommunityIcons
              name="book-open-variant"
              size={18}
              color={colors.primary}
            />
            <Text
              style={[
                styles.habitVal,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {totalReadingMins}m
            </Text>
            <Text
              style={[
                styles.habitLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              reading
            </Text>
          </View>
          <View
            style={[
              styles.habitCell,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <MaterialCommunityIcons
              name="cup-water"
              size={18}
              color="#2196F3"
            />
            <Text
              style={[
                styles.habitVal,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {avgWater}
            </Text>
            <Text
              style={[
                styles.habitLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              avg water
            </Text>
          </View>
          <View
            style={[
              styles.habitCell,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <MaterialCommunityIcons
              name="youtube"
              size={18}
              color="#FF5252"
            />
            <Text
              style={[
                styles.habitVal,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {weekDays.reduce((s, d) => s + d.stats.shortsWatched, 0)}
            </Text>
            <Text
              style={[
                styles.habitLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              shorts
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Streaks */}
      <SectionCard title="STREAKS">
        <StreakRow icon="dumbbell" label="Gym" count={streaks.gym} />
        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />
        <StreakRow
          icon="book-open-variant"
          label="Reading"
          count={streaks.reading}
        />
        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />
        <StreakRow
          icon="eye-off"
          label="No doomscroll"
          count={streaks.noDoomscroll}
        />
        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />
        <StreakRow icon="alarm" label="Early wake-up" count={streaks.wakeUp} />
      </SectionCard>

      {/* Today's roast */}
      {todaysRoast ? (
        <SectionCard title="TODAY'S VERDICT">
          <Text
            style={[
              styles.roastText,
              { color: colors.foreground, fontFamily: "Inter_500Medium" },
            ]}
          >
            "{todaysRoast}"
          </Text>
        </SectionCard>
      ) : null}

      {/* Weekly verdict card */}
      <View
        style={[
          styles.verdictCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary + "50",
          },
        ]}
      >
        <View style={styles.verdictHeader}>
          <MaterialCommunityIcons
            name="chart-bar"
            size={18}
            color={colors.primary}
          />
          <Text
            style={[
              styles.verdictTitle,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            WEEKLY VERDICT
          </Text>
        </View>

        {weeklyVerdict ? (
          <Text
            style={[
              styles.verdictText,
              { color: colors.foreground, fontFamily: "Inter_500Medium" },
            ]}
          >
            "{weeklyVerdict}"
          </Text>
        ) : (
          <Text
            style={[
              styles.verdictPlaceholder,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Get your AI-generated weekly performance review.
          </Text>
        )}

        <Pressable
          onPress={handleGetWeeklyVerdict}
          style={({ pressed }) => [
            styles.verdictBtn,
            {
              backgroundColor: colors.primary + "20",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.verdictBtnText,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {isPending ? "Analyzing..." : weeklyVerdict ? "Regenerate" : "Get Weekly Verdict"}
          </Text>
        </Pressable>
      </View>

      {/* Footer note */}
      <Text
        style={[
          styles.footerNote,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        Data shown covers today + last {Math.min(history.length, 6)} logged days. History is stored locally on device.
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: { marginBottom: 20 },
  title: { fontSize: 32, letterSpacing: 4, marginBottom: 4 },
  subtitle: { fontSize: 13, letterSpacing: 0.5 },

  pillRow: { flexDirection: "row", gap: 8, marginBottom: 10 },

  chartHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  chartMainVal: { fontSize: 28 },
  chartMainLabel: { fontSize: 12 },

  emptyNote: { fontSize: 13, textAlign: "center", paddingVertical: 20 },

  habitGrid: { flexDirection: "row", gap: 8 },
  habitCell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  habitVal: { fontSize: 18 },
  habitLabel: { fontSize: 10, letterSpacing: 0.5 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  roastText: { fontSize: 16, lineHeight: 24 },

  verdictCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 10,
    gap: 12,
  },
  verdictHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  verdictTitle: { fontSize: 11, letterSpacing: 2 },
  verdictText: { fontSize: 16, lineHeight: 24 },
  verdictPlaceholder: { fontSize: 13, lineHeight: 20 },
  verdictBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  verdictBtnText: { fontSize: 14, letterSpacing: 0.5 },

  footerNote: { fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 16 },
});
