package expo.modules.alarm

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object AlarmSchedulerHelper {

    const val CHANNEL_ID = "expo_alarm_channel"

    fun getRequestCode(id: String): Int {
        val cleaned = id.replace("-", "")
        return cleaned.substring(0, 8.coerceAtMost(cleaned.length))
            .toLong(16).toInt()
    }

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

    fun computeTriggerTime(config: AlarmConfigData): Long {
        val daysOfWeek = config.daysOfWeek

        if (daysOfWeek != null && daysOfWeek.isNotEmpty()) {
            return findNextRecurringTrigger(config.hour, config.minute, daysOfWeek)
        }

        if (config.date != null) {
            val cleanDate = config.date.replace("Z", "+00:00")
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US)
            val parsed = formatter.parse(cleanDate)
                ?: throw Exception("Invalid date format: ${config.date}")
            return parsed.time
        }

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, config.hour)
            set(Calendar.MINUTE, config.minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }
        return calendar.timeInMillis
    }

    /**
     * Schedules an alarm. Returns false if the trigger time is in the past (one-time alarm).
     */
    fun scheduleAlarm(context: Context, config: AlarmConfigData): Boolean {
        val triggerTime = computeTriggerTime(config)

        // Skip one-time alarms that are in the past
        val isRecurring = config.daysOfWeek != null && config.daysOfWeek.isNotEmpty()
        if (!isRecurring && triggerTime <= System.currentTimeMillis()) {
            return false
        }

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("alarmId", config.id)
            putExtra("title", config.title)
            putExtra("body", config.body)
            putExtra("hour", config.hour)
            putExtra("minute", config.minute)
            if (isRecurring) {
                putExtra("daysOfWeek", config.daysOfWeek!!.toIntArray())
            }
        }

        val requestCode = getRequestCode(config.id)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

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

        return true
    }

    fun cancelAlarm(context: Context, id: String) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            getRequestCode(id),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pendingIntent?.let {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(it)
        }
    }

    fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) return

            val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alarm notifications"
                setBypassDnd(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
                setSound(
                    alarmSound,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
            notificationManager.createNotificationChannel(channel)
        }
    }
}
