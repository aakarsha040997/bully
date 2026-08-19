package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class UsageStatsModule : Module() {

  companion object {
    const val TAG = "BullyUsageStats"
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoUsageStats")

    // ── Usage Access ─────────────────────────────────────────────────────────

    AsyncFunction("hasPermission") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      val granted = checkUsagePermission(context)
      Log.d(TAG, "hasPermission → $granted | device=${Build.MANUFACTURER} ${Build.MODEL} API=${Build.VERSION.SDK_INT}")
      granted
    }

    AsyncFunction("requestPermission") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "requestPermission → opening ACTION_USAGE_ACCESS_SETTINGS for ${context.packageName}")
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        data = Uri.fromParts("package", context.packageName, null)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      val activity = appContext.currentActivity
      if (activity != null) {
        Log.d(TAG, "requestPermission → using currentActivity")
        activity.startActivity(intent)
      } else {
        Log.w(TAG, "requestPermission → no currentActivity, using applicationContext")
        context.startActivity(intent)
      }
      true
    }

    AsyncFunction("getUsageStats") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "getUsageStats called | device=${Build.MANUFACTURER} ${Build.MODEL} API=${Build.VERSION.SDK_INT}")

      val granted = checkUsagePermission(context)
      Log.d(TAG, "getUsageStats: permission granted = $granted")
      if (!granted) {
        return@AsyncFunction emptyList<Map<String, Any>>()
      }

      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val startOfDay = cal.timeInMillis
      val end = System.currentTimeMillis()
      Log.d(TAG, "getUsageStats: querying ${startOfDay}→${end} (${(end - startOfDay) / 60_000}min window)")

      val statsMap = usm.queryAndAggregateUsageStats(startOfDay, end)
      Log.d(TAG, "getUsageStats: raw map size = ${statsMap?.size ?: "null"}")

      if (statsMap == null) {
        Log.w(TAG, "getUsageStats: queryAndAggregateUsageStats returned null")
        return@AsyncFunction emptyList<Map<String, Any>>()
      }

      val pm = context.packageManager
      val skipPrefixes = listOf(
        "android.", "com.android.", "com.miui.", "com.samsung.android.",
        "com.oneplus.", "com.coloros.", "com.oppo.", "com.oplus."
      )
      val skipExact = setOf("android")

      val filtered = statsMap.values
        .filter { it.totalTimeInForeground > 60_000L }
        .filter { stat ->
          val pkg = stat.packageName
          pkg !in skipExact && skipPrefixes.none { pkg.startsWith(it) }
        }
        .sortedByDescending { it.totalTimeInForeground }

      Log.d(TAG, "getUsageStats: after filter/sort → ${filtered.size} apps")

      val result = filtered.take(10).map { stat ->
        val appName = try {
          val info = pm.getApplicationInfo(stat.packageName, 0)
          pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
          Log.w(TAG, "getUsageStats: getApplicationInfo failed for ${stat.packageName}: ${e.message}")
          stat.packageName.substringAfterLast(".")
        }
        mapOf(
          "packageName" to stat.packageName,
          "appName" to appName,
          "totalMinutes" to (stat.totalTimeInForeground / 60_000L).toInt()
        )
      }

      Log.d(TAG, "getUsageStats: returning ${result.size} entries")
      result
    }

    AsyncFunction("getUnlockCount") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      val granted = checkUsagePermission(context)
      if (!granted) {
        return@AsyncFunction 0
      }

      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val startOfDay = cal.timeInMillis
      val events = usm.queryEvents(startOfDay, System.currentTimeMillis())
      val event = UsageEvents.Event()
      var unlocks = 0

      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.KEYGUARD_HIDDEN) {
          unlocks++
        }
      }

      Log.d(TAG, "getUnlockCount → $unlocks")
      unlocks
    }

    // ── Overlay Permission ────────────────────────────────────────────────────

    AsyncFunction("hasOverlayPermission") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
      Log.d(TAG, "hasOverlayPermission → $granted | API=${Build.VERSION.SDK_INT}")
      granted
    }

    AsyncFunction("requestOverlayPermission") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        Log.d(TAG, "requestOverlayPermission → pre-M, always granted")
        return@AsyncFunction true
      }
      Log.d(TAG, "requestOverlayPermission → opening ACTION_MANAGE_OVERLAY_PERMISSION for ${context.packageName}")
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.fromParts("package", context.packageName, null)
      ).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent)
      }
      true
    }

    // ── Overlay Control ───────────────────────────────────────────────────────

    /**
     * Start background monitoring. When any package in [packages] comes to
     * the foreground, an overlay showing [roastText] is displayed.
     */
    AsyncFunction("startOverlayMonitoring") { packages: List<String>, roastText: String ->
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "startOverlayMonitoring: packages=$packages roast='${roastText.take(60)}…'")

      OverlayService.monitoredPackages = packages.toSet()
      OverlayService.currentRoast = roastText

      val intent = Intent(context, OverlayService::class.java).apply {
        putExtra(OverlayService.EXTRA_COMMAND, OverlayService.CMD_START)
        putStringArrayListExtra(OverlayService.EXTRA_PACKAGES, ArrayList(packages))
        putExtra(OverlayService.EXTRA_ROAST, roastText)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      Log.d(TAG, "startOverlayMonitoring: service intent sent")
      true
    }

    /** Stop background monitoring and hide any visible overlay. */
    AsyncFunction("stopOverlayMonitoring") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "stopOverlayMonitoring")
      val intent = Intent(context, OverlayService::class.java).apply {
        putExtra(OverlayService.EXTRA_COMMAND, OverlayService.CMD_STOP)
      }
      context.startService(intent)
      true
    }

    /** Immediately show an overlay with the given roast text (for testing or manual trigger). */
    AsyncFunction("showRoastOverlay") { roastText: String ->
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "showRoastOverlay: '${roastText.take(60)}…'")

      OverlayService.currentRoast = roastText
      val intent = Intent(context, OverlayService::class.java).apply {
        putExtra(OverlayService.EXTRA_COMMAND, OverlayService.CMD_SHOW_NOW)
        putExtra(OverlayService.EXTRA_ROAST, roastText)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      true
    }

    /** Hide the overlay if it is currently visible. */
    AsyncFunction("hideRoastOverlay") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "hideRoastOverlay")
      val intent = Intent(context, OverlayService::class.java).apply {
        putExtra(OverlayService.EXTRA_COMMAND, OverlayService.CMD_HIDE_NOW)
      }
      context.startService(intent)
      true
    }

    /** Update the roast text in a running monitoring session without restarting. */
    AsyncFunction("updateOverlayRoast") { roastText: String ->
      val context = appContext.reactContext ?: throw Exception("No React context")
      Log.d(TAG, "updateOverlayRoast: '${roastText.take(60)}…'")
      OverlayService.currentRoast = roastText
      val intent = Intent(context, OverlayService::class.java).apply {
        putExtra(OverlayService.EXTRA_COMMAND, OverlayService.CMD_UPDATE_ROAST)
        putExtra(OverlayService.EXTRA_ROAST, roastText)
      }
      context.startService(intent)
      true
    }

    /** Returns true if the overlay service is currently running. */
    Function("isOverlayServiceRunning") {
      OverlayService.serviceRunning
    }

    /** Returns true if an overlay is currently visible on screen. */
    Function("isOverlayVisible") {
      OverlayService.overlayVisible
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private fun checkUsagePermission(context: Context): Boolean {
    return try {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      }
      val allowed = mode == AppOpsManager.MODE_ALLOWED
      Log.d(TAG, "checkUsagePermission: mode=$mode allowed=$allowed uid=${Process.myUid()} pkg=${context.packageName}")
      allowed
    } catch (e: Exception) {
      Log.e(TAG, "checkUsagePermission threw: ${e.message}", e)
      false
    }
  }
}
