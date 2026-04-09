package expo.modules.alarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class AlarmConfigData(
    val id: String,
    val hour: Int,
    val minute: Int,
    val date: String?,
    val daysOfWeek: List<Int>?,
    val title: String,
    val body: String
)

object AlarmStorage {
    private const val PREFS_NAME = "expo_alarm_configs"
    private const val LEGACY_PREFS_NAME = "expo_alarm_ids"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveAlarm(context: Context, config: AlarmConfigData) {
        val json = JSONObject().apply {
            put("id", config.id)
            put("hour", config.hour)
            put("minute", config.minute)
            config.date?.let { put("date", it) }
            config.daysOfWeek?.let { put("daysOfWeek", JSONArray(it)) }
            put("title", config.title)
            put("body", config.body)
        }
        prefs(context).edit().putString(config.id, json.toString()).apply()
    }

    fun removeAlarm(context: Context, id: String) {
        prefs(context).edit().remove(id).apply()
    }

    fun getAllAlarms(context: Context): List<AlarmConfigData> {
        return prefs(context).all.values.mapNotNull { value ->
            try {
                val json = JSONObject(value as String)
                AlarmConfigData(
                    id = json.getString("id"),
                    hour = json.getInt("hour"),
                    minute = json.getInt("minute"),
                    date = if (json.has("date")) json.getString("date") else null,
                    daysOfWeek = if (json.has("daysOfWeek")) {
                        val arr = json.getJSONArray("daysOfWeek")
                        (0 until arr.length()).map { arr.getInt(it) }
                    } else null,
                    title = json.getString("title"),
                    body = json.getString("body")
                )
            } catch (e: Exception) {
                null
            }
        }
    }

    fun clearAll(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun migrateLegacyIds(context: Context) {
        val oldPrefs = context.getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE)
        if (oldPrefs.contains("ids")) {
            oldPrefs.edit().clear().apply()
        }
    }
}
