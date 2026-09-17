package expo.modules.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

// Reschedules stored alarms whenever the system drops them (reboot) or their wall-clock
// trigger time moves (clock or time zone change), since triggers are computed in local time.
class BootReceiver : BroadcastReceiver() {
    private val handledActions = setOf(
        Intent.ACTION_BOOT_COMPLETED,
        "android.intent.action.QUICKBOOT_POWERON",
        "com.htc.intent.action.QUICKBOOT_POWERON",
        Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in handledActions) {
            return
        }

        val alarms = AlarmStorage.getAllAlarms(context)
        Log.i("BootReceiver", "Rescheduling ${alarms.size} alarms after ${intent.action}")

        for (config in alarms) {
            try {
                val scheduled = AlarmSchedulerHelper.scheduleAlarm(context, config)
                if (!scheduled) {
                    // One-time alarm whose trigger time has passed — clean up
                    AlarmStorage.removeAlarm(context, config.id)
                    Log.i("BootReceiver", "Removed expired alarm ${config.id}")
                }
            } catch (e: Exception) {
                Log.e("BootReceiver", "Failed to reschedule alarm ${config.id}", e)
            }
        }
    }
}
