package expo.modules.usagestats

import android.app.AppOpsManager
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

    AsyncFunction("hasPermission") {
      val context = appContext.reactContext ?: throw Exception("No React context")
      val granted = checkPermission(context)
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

      val granted = checkPermission(context)
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

      Log.d(TAG, "getUsageStats: after filter/sort → ${filtered.size} apps (had ${statsMap.size} total, ${statsMap.values.count { it.totalTimeInForeground > 60_000L }} above 1-min threshold)")
      filtered.take(5).forEach {
        Log.d(TAG, "  ${it.packageName} → ${it.totalTimeInForeground / 60_000}min")
      }

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
  }

  private fun checkPermission(context: Context): Boolean {
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
      Log.d(TAG, "checkPermission: mode=$mode allowed=$allowed uid=${Process.myUid()} pkg=${context.packageName}")
      allowed
    } catch (e: Exception) {
      Log.e(TAG, "checkPermission threw: ${e.message}", e)
      false
    }
  }
}
