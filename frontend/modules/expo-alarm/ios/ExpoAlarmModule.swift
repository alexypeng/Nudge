import ExpoModulesCore
import AlarmKit

struct AlarmIDStore {
   private let defaults = UserDefaults.standard
   private let key = "expo_alarm_id_map"

   private func load() -> [String: String] {
    defaults.dictionary(forKey: key) as? [String: String] ?? [:]
   }

   func save(backendId: String, uuid: UUID) {
    var map = load()
    map[backendId] = uuid.uuidString
    defaults.set(map, forKey: key)
   }

   func uuid(for backendId: String) -> UUID? {
    guard let uuidString = load()[backendId] else {return nil}
    return UUID(uuidString: uuidString)
   }

   func backendId(for uuid: UUID) -> String? {
    load().first(where: { $0.value == uuid.uuidString })?.key
      }

      func remove(backendId: String) {
          var map = load()
          map.removeValue(forKey: backendId)
          defaults.set(map, forKey: key)
      }

      func removeAll() {
          defaults.removeObject(forKey: key)
      }
}

public class ExpoAlarmModule: Module {
  private let store = AlarmIDStore()
  private var observerTask: Task<Void, Never>? = nil

  public func definition() -> ModuleDefinition {
    Name("ExpoAlarm")
    Events("onAlarmFired")

    AsyncFunction("checkCapability") { () -> [String: Any] in
      let state = AlarmManager.shared.authorizationState
      switch state {
      case .authorized:
        return ["available": true, "reason": "AlarmKit authorized"]
      case .denied:
        return ["available": false, "reason": "Alarm permission denied"]
      case .notDetermined:
        return ["available": false, "reason": "Alarm permission not yet requested"]
      @unknown default:
        return ["available": false, "reason": "Unknown authorization state"]
      }
    }

    AsyncFunction("requestPermission") { () async -> Bool in
      let state = await AlarmManager.shared.requestAuthorization()
      return state == .authorized
    }

    AsyncFunction("scheduleAlarm") { (config: [String: Any], promise: Promise) in
      guard let id = config["id"] as? String,
            let hour = config["hour"] as? Int,
            let minute = config["minute"] as? Int,
            let title = config["title"] as? String,
            let body = config["body"] as? String else {
        promise.reject(
          NSError(domain: "ExpoAlarm", code: 1,
                  userInfo: [NSLocalizedDescriptionKey: "Missing required fields"])
        )
        return
      }

      let alarmUUID = UUID()
      self.store.save(backendId: id, uuid: alarmUUID)

      let daysOfWeek = config["daysOfWeek"] as? [Int]

      Task {
        do {
          if let days = daysOfWeek, !days.isEmpty {
            let weekdays = days.compactMap { self.intToWeekday($0) }

            let _ = try await AlarmManager.shared.schedule(id: alarmUUID) {
              Alarm.Schedule.relative(
                .repeats: .weekly(weekdays)
              )

              AlarmPresentation.Alert(
                title: title,
                stopButton: AlarmButton(label: "Dismiss"),
                secondaryButton: .openAppButton()
              )
            }
          } else {
            let _ = try await AlarmManager.shared.schedule(id: alarmUUID) {
              Alarm.Schedule.relative(
                .repeats: .never
              )

              AlarmPresentation.Alert(
                title: title,
                stopButton: AlarmButton(label: "Dismiss"),
                secondaryButton: .openAppButton()
              )
            }
          }

          promise.resolve(nil)
        } catch {
          self.store.remove(backendId: id)
          promise.reject(error)
        }
      }
    }

    AsyncFunction("cancelAlarm") { (id: String) async in
      guard let uuid = self.store.uuid(for: id) else { return }
      do {
        try await AlarmManager.shared.cancel(id: uuid)
      } catch {
        print("ExpoAlarm: Failed to cancel - \(error)")
      }
      self.store.remove(backendId: id)
    }

    AsyncFunction("cancelAllAlarms") { () async in
      let alarms = AlarmManager.shared.alarms
      for alarm in alarms {
        do {
          try await AlarmManager.shared.cancel(id: alarm.id)
        } catch {
          print("ExpoAlarm: Failed to cancel \(alarm.id) - \(error)")
        }
      }
      self.store.removeAll()
    }

    OnStartObserving {
      self.observerTask = Task {
        for await alarms in AlarmManager.shared.alarmUpdates {
          for alarm in alarms {
            guard let backendId = self.store.backendId(for: alarm.id) else { continue }
            self.sendEvent("onAlarmFired", [
              "alarmId": backendId,
              "action": "fired"
            ])
          }
        }
      }
    }

    OnStopObserving {
      self.observerTask?.cancel()
      self.observerTask = nil
    }
  }

  private func intToWeekday(_ day: Int) -> Locale.Weekday? {
    switch day {
    case 0: return .sunday
    case 1: return .monday
    case 2: return .tuesday
    case 3: return .wednesday
    case 4: return .thursday
    case 5: return .friday
    case 6: return .saturday
    default: return nil
    }
  }
}