package expo.modules.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class ExpoAlarmModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("Context not available")

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private val prefs: SharedPreferences
        get() = context.getSharedPreferences("expo_alarm_ids", Context.MODE_PRIVATE)

    companion object {
        var onAlarmFired: ((alarmId: String, action: String) -> Unit)? = null

        fun findNextRecurringTrigger(hour: Int, minute: Int, daysOfWeek: List<Int>): Long {
            val now = System.currentTimeMillis()

            for (dayOffset in 0..6) {
                val candidate = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, dayOffset)
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val dayIndex = candidate.get(Calendar.DAY_OF_WEEK) - 1

                if (daysOfWeek.contains(dayIndex) && candidate.timeInMillis > now) {
                    return candidate.timeInMillis
                }
            }

            val candidate = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 7)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            return candidate.timeInMillis
        }
    }

    private fun saveAlarmId(id: String) {
        val ids = HashSet(prefs.getStringSet("ids", emptySet()) ?: emptySet())
        ids.add(id)
        prefs.edit().putStringSet("ids", ids).apply()
    }

    private fun removeAlarmId(id: String) {
        val ids = HashSet(prefs.getStringSet("ids", emptySet()) ?: emptySet())
        ids.remove(id)
        prefs.edit().putStringSet("ids", ids).apply()
    }

    private fun getAllAlarmIds(): Set<String> {
        return HashSet(prefs.getStringSet("ids", emptySet()) ?: emptySet())
    }

    private fun clearAllAlarmIds() {
        prefs.edit().remove("ids").apply()
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

        AsyncFunction("checkCapability") {
            val canSchedule = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }
            return@AsyncFunction mapOf(
                "available" to canSchedule,
                "reason" to if (canSchedule) "Exact alarms supported" else "Exact alarm permission required"
            )
        }

        AsyncFunction("requestPermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                return@AsyncFunction alarmManager.canScheduleExactAlarms()
            }
            return@AsyncFunction true
        }

        AsyncFunction("scheduleAlarm") { config: Map<String, Any?> ->
            val id = config["id"] as? String ?: throw Exception("Missing alarm id")
            val hour = (config["hour"] as? Double)?.toInt() ?: throw Exception("Missing hour")
            val minute = (config["minute"] as? Double)?.toInt() ?: throw Exception("Missing minute")
            val title = config["title"] as? String ?: "Alarm"
            val body = config["body"] as? String ?: ""
            val dateString = config["date"] as? String

            val triggerTime: Long

            @Suppress("UNCHECKED_CAST")
            val daysOfWeek = (config["daysOfWeek"] as? List<Double>)?.map { it.toInt() }

            if (daysOfWeek != null && daysOfWeek.isNotEmpty()) {
                triggerTime = findNextRecurringTrigger(hour, minute, daysOfWeek)
            } else if (dateString != null) {
                val cleanDate = dateString.replace("Z", "+00:00")
                val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US)
                val parsed = formatter.parse(cleanDate)
                    ?: throw Exception("Invalid date format: $dateString")
                triggerTime = parsed.time
            } else {
                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    if (timeInMillis <= System.currentTimeMillis()) {
                        add(Calendar.DAY_OF_YEAR, 1)
                    }
                }
                triggerTime = calendar.timeInMillis
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("alarmId", id)
                putExtra("title", title)
                putExtra("body", body)
                putExtra("hour", hour)
                putExtra("minute", minute)
                if (daysOfWeek != null && daysOfWeek.isNotEmpty()) {
                    putExtra("daysOfWeek", daysOfWeek.toIntArray())
                }
            }

            val requestCode = id.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }

            saveAlarmId(id)
        }

        AsyncFunction("cancelAlarm") { id: String ->
            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                id.hashCode(),
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            pendingIntent?.let { alarmManager.cancel(it) }
            removeAlarmId(id)
        }

        AsyncFunction("cancelAllAlarms") {
            for (id in getAllAlarmIds()) {
                val intent = Intent(context, AlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    id.hashCode(),
                    intent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                )
                pendingIntent?.let { alarmManager.cancel(it) }
            }
            clearAllAlarmIds()
        }
    }

}
