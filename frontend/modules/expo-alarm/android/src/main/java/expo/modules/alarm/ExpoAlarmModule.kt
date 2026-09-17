package expo.modules.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoAlarmModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("Context not available")

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    companion object {
        var onAlarmFired: ((alarmId: String, action: String) -> Unit)? = null
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoAlarm")

        Events("onAlarmFired")

        OnStartObserving {
            onAlarmFired = { alarmId, action ->
                sendEvent("onAlarmFired", mapOf(
                    "alarmId" to alarmId,
                    "action" to action
                ))
            }
        }

        OnStopObserving {
            onAlarmFired = null
        }

        // While an alarm is waiting for a check-in, let the app appear over the lock screen.
        OnActivityEntersForeground {
            setShowOverLockScreen(AlarmStorage.peekPendingAlarm(context) != null)
        }

        AsyncFunction("checkCapability") {
            val canSchedule = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }
            val canFullScreen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                    .canUseFullScreenIntent()
            } else {
                true
            }
            val notificationsEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()

            val reason = when {
                !canSchedule -> "Exact alarm permission required"
                !notificationsEnabled -> "Notifications are turned off, so alarms can't ring"
                !canFullScreen -> "Full-screen alarms are turned off; alarms will ring as notifications"
                else -> "Exact alarms supported"
            }
            return@AsyncFunction mapOf(
                "available" to (canSchedule && notificationsEnabled),
                "reason" to reason,
                "canUseFullScreenIntent" to canFullScreen,
                "notificationsEnabled" to notificationsEnabled
            )
        }

        AsyncFunction("requestPermission") {
            // USE_EXACT_ALARM grants this automatically on Android 13+; the settings screen is only
            // needed on Android 12, where SCHEDULE_EXACT_ALARM must be granted by the user.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    return@AsyncFunction true
                }
                val intent = Intent(
                    android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    android.net.Uri.parse("package:${context.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return@AsyncFunction false
            }
            return@AsyncFunction true
        }

        AsyncFunction("checkNotificationPermission") {
            val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
            return@AsyncFunction mapOf(
                "granted" to enabled,
                "canRequest" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            )
        }

        AsyncFunction("scheduleAlarm") { config: Map<String, Any?> ->
            val id = config["id"] as? String ?: throw Exception("Missing alarm id")
            val hour = (config["hour"] as? Double)?.toInt() ?: throw Exception("Missing hour")
            val minute = (config["minute"] as? Double)?.toInt() ?: throw Exception("Missing minute")
            val title = config["title"] as? String ?: "Alarm"
            val body = config["body"] as? String ?: ""
            val dateString = config["date"] as? String

            @Suppress("UNCHECKED_CAST")
            val daysOfWeek = (config["daysOfWeek"] as? List<Double>)?.map { it.toInt() }

            val configData = AlarmConfigData(
                id = id,
                hour = hour,
                minute = minute,
                date = dateString,
                daysOfWeek = daysOfWeek,
                title = title,
                body = body
            )

            AlarmStorage.saveAlarm(context, configData)
            AlarmSchedulerHelper.scheduleAlarm(context, configData)
        }

        AsyncFunction("cancelAlarm") { id: String ->
            AlarmSchedulerHelper.cancelAlarm(context, id)
            AlarmStorage.removeAlarm(context, id)
        }

        AsyncFunction("cancelAllAlarms") {
            for (config in AlarmStorage.getAllAlarms(context)) {
                AlarmSchedulerHelper.cancelAlarm(context, config.id)
            }
            AlarmStorage.clearAll(context)
        }

        AsyncFunction("consumePendingAlarm") {
            return@AsyncFunction AlarmStorage.consumePendingAlarm(context)
        }

        // Silences a ringing alarm without touching its schedule (repeating alarms keep firing).
        AsyncFunction("stopRinging") { id: String ->
            AlarmSchedulerHelper.stopRinging(context, id)
            setShowOverLockScreen(false)
        }
    }

    private fun setShowOverLockScreen(enabled: Boolean) {
        val activity = appContext.currentActivity ?: return
        activity.runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                activity.setShowWhenLocked(enabled)
                activity.setTurnScreenOn(enabled)
            }
        }
    }
}
