---
name: Bully app architecture
description: Key decisions, type conventions, and gotchas for the Bully Expo/RN accountability app
---

## Stack
- Expo Router 6, React Native, TypeScript, TanStack Query
- StyleSheet only (no NativeWind / Tailwind)
- @expo/vector-icons (MaterialCommunityIcons)
- Colors always via `useColors()` hook
- Fonts: Inter via @expo-google-fonts/inter (Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold)

## Personality type
`Personality` (from `services/roastEngine/types.ts`) uses `CORPORATE_BOSS`, NOT `BOSS`.
Full set: GENTLE | FRIEND | SARCASTIC | SAVAGE | GYM_BRO | CORPORATE_BOSS | INDIAN_MOM | ANIME_VILLAIN

## Pre-existing TypeScript error
`hooks/useColors.ts` has a TS2352 error that pre-dates all sprint work. Do not treat it as a regression.

## Roast template library
697+ templates in `assets/roasts/*.json` (8 personality files). Engine in `services/roastEngine/`.
`getTemplatesForPersonality(personality)` returns per-personality pool. `fillTemplate()` handles placeholders.

## Service layer pattern
- `services/productivityScore.ts` — modular score (0–100), returns ScoreResult with factors/topWin/topDistraction/reason
- `services/achievements.ts` — 18 achievement defs, checkAndUnlock(), getNextAchievement(), getAllWithStatus()
- Both are pure functions; AppContext wires them into React state via useMemo/useEffect

## AppContext
Exposes: stats, streaks, settings, history, productivityScore, scoreBreakdown, weeklyAvg, trend, achievements, newlyUnlocked, clearNewlyUnlocked

**Why:** Dashboard and streaks screen pull all data from context; services stay pure and testable.

## Achievement toast
Positioned absolutely inside a wrapper View (not inside ScrollView). Uses Animated.spring slide-down, auto-dismiss after 3s.

## Share feature
Uses React Native built-in `Share.share()` (text-only). No native modules needed. react-native-view-shot is NOT installed.

## API server
Port 8080, path `/api`. Groq via OpenAI SDK, model `llama-3.1-8b-instant`. GROQ_API_KEY in secrets.
