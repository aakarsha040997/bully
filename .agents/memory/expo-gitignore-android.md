---
name: Expo gitignore android pattern
description: android/ in .gitignore without leading slash silently ignores module source dirs too
---

## Rule
Always use `/android/` (with leading slash) in `.gitignore` for Expo projects, never bare `android/`.

**Why:** Git's bare `android/` pattern matches any `android/` directory at any depth, including `modules/*/android/`. EAS uploads only git-tracked files, so a bare `android/` pattern silently drops all native module Kotlin source from the build server. The result is the module compiles in Gradle (because `build.gradle` and `expo-module.config.json` are tracked), but `ExpoModulesPackageList.kt` omits it and `requireNativeModule` returns null at runtime. The Config Plugin approach then fails too because `fs.readdirSync(srcDir)` throws ENOENT — the files simply aren't there.

**How to apply:** In any Expo project that has local native modules under `modules/*/android/`, verify `.gitignore` uses `/android/` not `android/`. Confirm with `git check-ignore -v modules/<name>/android/**/*.kt` — exit 0 means ignored (bad), exit 1 means tracked (good).
