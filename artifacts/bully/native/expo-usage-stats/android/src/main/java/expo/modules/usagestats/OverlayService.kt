package expo.modules.usagestats

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class OverlayService : Service() {

    companion object {
        const val TAG = "BullyOverlay"
        private const val CHANNEL_ID = "bully_overlay_service"
        private const val NOTIF_ID = 8421

        const val EXTRA_COMMAND = "command"
        const val EXTRA_PACKAGES = "monitored_packages"
        const val EXTRA_ROAST = "roast_text"

        const val CMD_START = "start"
        const val CMD_STOP = "stop"
        const val CMD_SHOW_NOW = "show_now"
        const val CMD_HIDE_NOW = "hide_now"
        const val CMD_UPDATE_ROAST = "update_roast"

        // Shared state accessible from UsageStatsModule
        @Volatile var monitoredPackages: Set<String> = emptySet()
        @Volatile var currentRoast: String = "You opened this app. You already know what you're doing."
        @Volatile var overlayVisible: Boolean = false
        @Volatile var serviceRunning: Boolean = false
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastForegroundPkg: String = ""
    private var monitoring = false

    // Polls UsageEvents every 1 second to detect foreground app changes
    private val pollTask = object : Runnable {
        override fun run() {
            if (!monitoring) return
            try {
                val fg = getForegroundPackage()
                if (fg.isNotEmpty() && fg != lastForegroundPkg) {
                    Log.d(TAG, "Foreground changed: '$lastForegroundPkg' → '$fg'")
                    lastForegroundPkg = fg
                    if (fg in monitoredPackages) {
                        Log.d(TAG, "Monitored app in foreground: $fg — showing overlay")
                        showOverlayOnMainThread(currentRoast)
                    } else if (overlayVisible) {
                        // User left the monitored app, dismiss
                        Log.d(TAG, "Leaving monitored app scope, hiding overlay")
                        hideOverlayOnMainThread()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "pollTask error: ${e.message}", e)
            }
            mainHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "onCreate")
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        serviceRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val cmd = intent?.getStringExtra(EXTRA_COMMAND) ?: CMD_START
        Log.d(TAG, "onStartCommand: cmd=$cmd")

        when (cmd) {
            CMD_START -> {
                val packages = intent?.getStringArrayListExtra(EXTRA_PACKAGES)?.toSet() ?: emptySet()
                val roast = intent?.getStringExtra(EXTRA_ROAST) ?: currentRoast
                monitoredPackages = packages
                currentRoast = roast
                Log.d(TAG, "CMD_START: monitoring ${packages.size} packages, roast='${roast.take(60)}…'")
                startForegroundService()
                startMonitoring()
            }
            CMD_STOP -> {
                Log.d(TAG, "CMD_STOP: stopping monitoring and service")
                stopMonitoring()
                hideOverlayOnMainThread()
                stopSelf()
            }
            CMD_SHOW_NOW -> {
                val roast = intent?.getStringExtra(EXTRA_ROAST) ?: currentRoast
                currentRoast = roast
                Log.d(TAG, "CMD_SHOW_NOW: force-showing overlay")
                // Ensure foreground before attempting overlay
                if (!monitoring) startForegroundService()
                showOverlayOnMainThread(roast)
            }
            CMD_HIDE_NOW -> {
                Log.d(TAG, "CMD_HIDE_NOW")
                hideOverlayOnMainThread()
            }
            CMD_UPDATE_ROAST -> {
                val roast = intent?.getStringExtra(EXTRA_ROAST) ?: return START_STICKY
                currentRoast = roast
                Log.d(TAG, "CMD_UPDATE_ROAST: '${roast.take(60)}…'")
                // If overlay is currently visible, refresh it
                if (overlayVisible) showOverlayOnMainThread(roast)
            }
        }
        return START_STICKY
    }

    // ── Monitoring ────────────────────────────────────────────────────────────

    private fun startMonitoring() {
        if (monitoring) return
        monitoring = true
        mainHandler.post(pollTask)
        Log.d(TAG, "startMonitoring: polling started")
    }

    private fun stopMonitoring() {
        monitoring = false
        mainHandler.removeCallbacks(pollTask)
        Log.d(TAG, "stopMonitoring: polling stopped")
    }

    /** Queries UsageEvents for the last 5 seconds to get the current foreground app. */
    private fun getForegroundPackage(): String {
        return try {
            val usm = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val events = usm.queryEvents(now - 5_000L, now)
            val ev = UsageEvents.Event()
            var latest = ""
            var latestTs = 0L
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                if (ev.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && ev.timeStamp > latestTs) {
                    latestTs = ev.timeStamp
                    latest = ev.packageName
                }
            }
            latest
        } catch (e: Exception) {
            Log.e(TAG, "getForegroundPackage error: ${e.message}")
            ""
        }
    }

    // ── Overlay ───────────────────────────────────────────────────────────────

    private fun showOverlayOnMainThread(roast: String) {
        mainHandler.post {
            if (!canDrawOverlays()) {
                Log.e(TAG, "showOverlay: SYSTEM_ALERT_WINDOW not granted — cannot show overlay")
                return@post
            }
            // Remove existing overlay first
            removeOverlayView()
            try {
                val view = buildOverlayView(roast)
                val params = buildWindowParams()
                windowManager!!.addView(view, params)
                overlayView = view
                overlayVisible = true
                Log.d(TAG, "showOverlay: ✅ overlay added to WindowManager")
            } catch (e: WindowManager.BadTokenException) {
                Log.e(TAG, "showOverlay: BadTokenException — ${e.message}", e)
            } catch (e: Exception) {
                Log.e(TAG, "showOverlay: failed — ${e.message}", e)
            }
        }
    }

    private fun hideOverlayOnMainThread() {
        mainHandler.post { removeOverlayView() }
    }

    private fun removeOverlayView() {
        val v = overlayView ?: return
        try {
            windowManager?.removeViewImmediate(v)
            Log.d(TAG, "hideOverlay: ✅ overlay removed")
        } catch (e: Exception) {
            Log.e(TAG, "hideOverlay: removeViewImmediate failed — ${e.message}", e)
        } finally {
            overlayView = null
            overlayVisible = false
        }
    }

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val result = Settings.canDrawOverlays(this)
            Log.d(TAG, "canDrawOverlays: $result")
            result
        } else {
            true
        }
    }

    private fun buildWindowParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION")
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
        }
        Log.d(TAG, "buildWindowParams: overlayType=$overlayType API=${Build.VERSION.SDK_INT}")
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }
    }

    // ── Overlay View (programmatic, no XML) ───────────────────────────────────

    private fun buildOverlayView(roast: String): View {
        val ctx: Context = this

        fun dp(v: Int): Int = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics
        ).toInt()

        fun sp(v: Float): Float = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP, v, resources.displayMetrics
        )

        // ── Root: full-screen dim ───────────────────────────────────────────
        val root = FrameLayout(ctx)
        root.setBackgroundColor(Color.argb(200, 0, 0, 0))
        root.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )

        // ── Card ───────────────────────────────────────────────────────────
        val card = LinearLayout(ctx)
        card.orientation = LinearLayout.VERTICAL
        val cardBg = GradientDrawable().apply {
            setColor(Color.parseColor("#0D0D0D"))
            cornerRadius = dp(24).toFloat()
            setStroke(dp(1), Color.argb(100, 255, 38, 74))
        }
        card.background = cardBg
        card.setPadding(dp(24), dp(24), dp(24), dp(28))

        val cardParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER_VERTICAL
            setMargins(dp(20), 0, dp(20), 0)
        }

        // ── Header row ────────────────────────────────────────────────────
        val header = LinearLayout(ctx)
        header.orientation = LinearLayout.HORIZONTAL
        header.gravity = Gravity.CENTER_VERTICAL

        val titleTv = TextView(ctx)
        titleTv.text = "⚡  BULLY"
        titleTv.setTextColor(Color.parseColor("#FF2650"))
        titleTv.textSize = 11f
        titleTv.letterSpacing = 0.18f
        titleTv.typeface = Typeface.create("sans-serif", Typeface.BOLD)
        titleTv.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)

        val closeTv = TextView(ctx)
        closeTv.text = "✕"
        closeTv.setTextColor(Color.parseColor("#666666"))
        closeTv.textSize = 20f
        closeTv.setPadding(dp(10), dp(2), 0, dp(2))
        closeTv.setOnClickListener {
            Log.d(TAG, "Overlay closed via ✕ button")
            hideOverlayOnMainThread()
        }

        header.addView(titleTv)
        header.addView(closeTv)

        // ── Roast text ────────────────────────────────────────────────────
        val roastTv = TextView(ctx)
        roastTv.text = "\u201C$roast\u201D"
        roastTv.setTextColor(Color.WHITE)
        roastTv.textSize = 22f
        roastTv.setLineSpacing(0f, 1.4f)
        roastTv.typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        val roastParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        roastParams.setMargins(0, dp(20), 0, dp(28))
        roastTv.layoutParams = roastParams

        // ── Dismiss button ────────────────────────────────────────────────
        val dismissTv = TextView(ctx)
        dismissTv.text = "Got it. I'll do better."
        dismissTv.setTextColor(Color.parseColor("#FF2650"))
        dismissTv.textSize = 15f
        dismissTv.typeface = Typeface.create("sans-serif", Typeface.BOLD)
        dismissTv.gravity = Gravity.CENTER
        val dismissBg = GradientDrawable().apply {
            setColor(Color.argb(28, 255, 38, 80))
            cornerRadius = dp(14).toFloat()
            setStroke(dp(1), Color.argb(80, 255, 38, 80))
        }
        dismissTv.background = dismissBg
        dismissTv.setPadding(0, dp(16), 0, dp(16))
        dismissTv.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        dismissTv.setOnClickListener {
            Log.d(TAG, "Overlay dismissed via button")
            hideOverlayOnMainThread()
        }

        card.addView(header)
        card.addView(roastTv)
        card.addView(dismissTv)
        root.addView(card, cardParams)

        // Tap on the dim background also dismisses
        root.setOnClickListener {
            Log.d(TAG, "Overlay dismissed via background tap")
            hideOverlayOnMainThread()
        }
        card.setOnClickListener { /* consume — don't dismiss on card tap */ }

        return root
    }

    // ── Foreground service notification ───────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Bully Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Bully is watching for distraction apps"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
            Log.d(TAG, "createNotificationChannel: '$CHANNEL_ID' created")
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Bully is watching 👀")
            .setContentText("Monitoring for distraction apps…")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun startForegroundService() {
        val notif = buildNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // API 29+ requires service type; SPECIAL_USE on API 34+
                if (Build.VERSION.SDK_INT >= 34) {
                    startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
                    Log.d(TAG, "startForeground: SPECIAL_USE (API 34+)")
                } else {
                    startForeground(NOTIF_ID, notif)
                    Log.d(TAG, "startForeground: no type (API 29-33)")
                }
            } else {
                startForeground(NOTIF_ID, notif)
                Log.d(TAG, "startForeground: legacy (API < 29)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground failed: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        Log.d(TAG, "onDestroy")
        serviceRunning = false
        stopMonitoring()
        removeOverlayView()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
