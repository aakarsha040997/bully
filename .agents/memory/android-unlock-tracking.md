---
name: Android unlock tracking
description: Native Usage Access can provide daily phone unlock counts, but the counter only exists in a fresh Android build.
---

Android Usage Access exposes phone unlocks through `UsageEvents.Event.KEYGUARD_HIDDEN`, so the Home Unlocks metric can be automatically populated instead of relying only on manual entry.

**Why:** The Android usage module is compiled into the APK; an expired or older APK cannot receive native-module changes from the Metro bundle.

**How to apply:** When this native counter changes, validate the JS bundle separately, then provide a fresh Android build before expecting unlock counts on a physical device.