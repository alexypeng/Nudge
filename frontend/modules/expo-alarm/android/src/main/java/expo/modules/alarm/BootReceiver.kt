package expo.modules.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON" &&
            intent.action != "com.htc.intent.action.QUICKBOOT_POWERON") {
            return
        }

        val alarms = AlarmStorage.getAllAlarms(context)
        Log.i("BootReceiver", "Rescheduling ${alarms.size} alarms after boot")

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
