package expo.modules.alarm

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("alarmId") ?: return
        val title = intent.getStringExtra("title") ?: "Alarm"
        val body = intent.getStringExtra("body") ?: "Your alarm is ringing"
        val hour = intent.getIntExtra("hour", -1)
        val minute = intent.getIntExtra("minute", -1)
        val daysOfWeek = intent.getIntArrayExtra("daysOfWeek")

        AlarmSchedulerHelper.ensureNotificationChannel(context)

        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)?.apply {
                putExtra("alarmId", alarmId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context,
                AlarmSchedulerHelper.getRequestCode(alarmId),
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

        val notification = NotificationCompat.Builder(context, AlarmSchedulerHelper.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(alarmSound)
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(AlarmSchedulerHelper.getRequestCode(alarmId), notification)

        // Emit event to JS (only works if app process is alive)
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
