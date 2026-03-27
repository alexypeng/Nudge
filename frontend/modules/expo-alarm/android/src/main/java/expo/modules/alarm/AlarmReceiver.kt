package expo.modules.alarm

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra("alarmId") ?: return
    val title = intent.getStringExtra("title") ?: "Alarm"
    val body = intent.getStringExtra("body") ?: "Your alarm is ringing"
    val hour = intent.getIntExtra("hour", -1)
    val minute = intent.getIntExtra("minute", -1)
    val daysOfWeek = intent.getIntArrayExtra("daysOfWeek")

    // Post notification
    val channelId = "expo_alarm_channel"
    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        "Alarms",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Alarm notifications"
        setBypassDnd(true)
        val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
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

    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)?.apply {
        putExtra("alarmId", alarmId)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }

    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        alarmId.hashCode(),
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setSound(alarmSound)
      .setAutoCancel(true)
      .setFullScreenIntent(pendingIntent, true)
      .setContentIntent(pendingIntent)
      .build()

    notificationManager.notify(alarmId.hashCode(), notification)

    // Emit event to JS (only works if app process is alive)
    ExpoAlarmModule.onAlarmFired?.invoke(alarmId, "fired")

    // Reschedule if recurring
    if (daysOfWeek != null && daysOfWeek.isNotEmpty() && hour >= 0 && minute >= 0) {
      val nextTrigger = ExpoAlarmModule.findNextRecurringTrigger(
        hour, minute, daysOfWeek.toList()
      )

      val rescheduleIntent = Intent(context, AlarmReceiver::class.java).apply {
        putExtra("alarmId", alarmId)
        putExtra("title", title)
        putExtra("body", body)
        putExtra("hour", hour)
        putExtra("minute", minute)
        putExtra("daysOfWeek", daysOfWeek)
      }

      val reschedulePending = PendingIntent.getBroadcast(
        context,
        alarmId.hashCode(),
        rescheduleIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          nextTrigger,
          reschedulePending
        )
      } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          nextTrigger,
          reschedulePending
        )
      } else {
        alarmManager.setAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          nextTrigger,
          reschedulePending
        )
      }
    }
  }
}
