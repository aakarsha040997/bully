---
name: Expo native package version mismatch crashes APK on launch
description: How a wrong major version of an expo-* native module causes an instant native crash, and how to detect/fix it
---

# Expo native package versions must match the installed SDK

If an `expo-*` package with native code is pinned to a major version far ahead of
the project's Expo SDK, the APK crashes **immediately on launch** during native
module registration — before any JS runs.

Observed crash (SDK 54 with `expo-background-fetch@56.x`):
`java.lang.NoClassDefFoundError ... Lexpo/modules/kotlin/types/AnyTypeCache;`
`Caused by: java.lang.ClassNotFoundException: expo.modules.kotlin.types.AnyTypeCache`
thrown from `expo.modules.backgroundfetch.BackgroundFetchModule.definition`.

**Why:** the 56.x native module expected a newer `expo-modules-core` (one that ships
`AnyTypeCache`) than the SDK-54 core (`expo-modules-core@3.0.30`) actually bundled.
Version skew between a native module and `expo-modules-core` = missing class at init.

**The dev-server warning is NOT benign.** `expo start` printing
"The following packages should be updated for best compatibility ... expected version ~X"
predicts exactly this native crash. Do not dismiss it.

**How to apply / fix:**
- Always add/upgrade native expo packages with `npx expo install <pkg>` (never raw
  `pnpm add`/`npm install`), so versions are pinned to the SDK's expected range.
- Verify with `npx expo install --check` → must say "Dependencies are up to date".
- This is a pnpm workspace: lockfile is `pnpm-lock.yaml` (no package-lock.json). After
  changing versions run `pnpm install` then `pnpm prune` to drop orphaned store entries.
- A runtime native crash like this cannot be reproduced in the web preview or Expo Go;
  it only shows in a dev/preview build. Capture it via on-device Bug report (Developer
  options) → logcat, search `FATAL EXCEPTION`.
