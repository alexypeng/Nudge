package expo.modules.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        // Stop ringing on its own if nobody opens the app; long past the 5-minute on-time window.
        private const val RING_TIMEOUT_MS = 10 * 60 * 1000L
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("alarmId") ?: return
        val title = intent.getStringExtra("title") ?: "Alarm"
        val body = intent.getStringExtra("body") ?: "Your alarm is ringing"
        val hour = intent.getIntExtra("hour", -1)
        val minute = intent.getIntExtra("minute", -1)
        val daysOfWeek = intent.getIntArrayExtra("daysOfWeek")

        // Recorded before anything else so a cold start of the app still lands on the check-in screen.
        AlarmStorage.setPendingAlarm(context, alarmId)

        AlarmSchedulerHelper.ensureNotificationChannel(context)

        val openApp = AlarmSchedulerHelper.launchAppIntent(context, alarmId)
        val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

        val builder = NotificationCompat.Builder(context, AlarmSchedulerHelper.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(alarmSound)
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            // Keeps ringing until the user opens the app to check in (or the timeout passes).
            .setOngoing(true)
            .setAutoCancel(false)
            .setTimeoutAfter(RING_TIMEOUT_MS)

        if (openApp != null) {
            builder
                .setFullScreenIntent(openApp, true)
                .setContentIntent(openApp)
                .addAction(0, "Stop", openApp)
        }

        val notification = builder.build().apply {
            flags = flags or Notification.FLAG_INSISTENT
        }

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(AlarmSchedulerHelper.getRequestCode(alarmId), notification)

        // Only reaches JS if the app process is alive; otherwise the pending alarm is picked up on launch.
        ExpoAlarmModule.onAlarmFired?.invoke(alarmId, "fired")

        // Reschedule if recurring
        if (daysOfWeek != null && daysOfWeek.isNotEmpty() && hour >= 0 && minute >= 0) {
            val configData = AlarmConfigData(
                id = alarmId,
                hour = hour,
                minute = minute,
                date = null,
                daysOfWeek = daysOfWeek.toList(),
                title = title,
                body = body
            )
            AlarmSchedulerHelper.scheduleAlarm(context, configData)
        }
    }
}
