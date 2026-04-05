import ExpoModulesCore
import AlarmKit
import SwiftUI

struct NudgeAlarmMetadata: AlarmMetadata {
  init() {}
}

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
    guard let uuidString = load()[backendId] else { return nil }
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
      do {
        let state = try await AlarmManager.shared.requestAuthorization()
        return state == .authorized
      } catch {
        print("ExpoAlarm: requestAuthorization failed - \(error)")
        return false
      }
    }

    AsyncFunction("scheduleAlarm") { (config: [String: Any], promise: Promise) in
      guard let id = config["id"] as? String,
            let hour = config["hour"] as? Int,
            let minute = config["minute"] as? Int,
            let title = config["title"] as? String,
            let _ = config["body"] as? String else {
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
          let authState = AlarmManager.shared.authorizationState
          print("ExpoAlarm: authorizationState = \(authState)")

          let time = Alarm.Schedule.Relative.Time(hour: hour, minute: minute)
          let recurrence: Alarm.Schedule.Relative.Recurrence

          if let days = daysOfWeek, !days.isEmpty {
            let weekdays = days.compactMap { self.intToWeekday($0) }
            recurrence = .weekly(weekdays)
            print("ExpoAlarm: scheduling repeating alarm at \(hour):\(minute) on \(days)")
          } else {
            recurrence = .never
            print("ExpoAlarm: scheduling one-time alarm at \(hour):\(minute)")
          }

          let schedule = Alarm.Schedule.relative(Alarm.Schedule.Relative(
            time: time, repeats: recurrence
          ))

          let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: "Dismiss"),
            textColor: .white,
            systemImageName: "xmark.circle.fill"
          )

          let alertPresentation = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton
          )

          let presentation = AlarmPresentation(alert: alertPresentation)

          let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: NudgeAlarmMetadata(),
            tintColor: .blue
          )

          let countdownDuration = Alarm.CountdownDuration(
            preAlert: nil,
            postAlert: 5 * 60
          )

          let alarmConfig = AlarmManager.AlarmConfiguration(
            countdownDuration: countdownDuration,
            schedule: schedule,
            attributes: attributes,
            secondaryIntent: nil,
            sound: .default
          )

          let alarm = try await AlarmManager.shared.schedule(
            id: alarmUUID,
            configuration: alarmConfig
          )

          print("ExpoAlarm: scheduled successfully, id=\(alarmUUID), alarm=\(alarm)")
          let activeCount = (try? AlarmManager.shared.alarms.count) ?? -1
          print("ExpoAlarm: active alarms count = \(activeCount)")

          promise.resolve(nil)
        } catch {
          print("ExpoAlarm: scheduling FAILED - \(error)")
          self.store.remove(backendId: id)
          promise.reject(error)
        }
      }
    }

    AsyncFunction("cancelAlarm") { (id: String) in
      guard let uuid = self.store.uuid(for: id) else { return }
      do {
        try AlarmManager.shared.cancel(id: uuid)
      } catch {
        print("ExpoAlarm: Failed to cancel - \(error)")
      }
      self.store.remove(backendId: id)
    }

    AsyncFunction("cancelAllAlarms") { () async in
      do {
        let alarms = try AlarmManager.shared.alarms
        for alarm in alarms {
          do {
            try AlarmManager.shared.cancel(id: alarm.id)
          } catch {
            print("ExpoAlarm: Failed to cancel \(alarm.id) - \(error)")
          }
        }
      } catch {
        print("ExpoAlarm: Failed to list alarms - \(error)")
      }
      self.store.removeAll()
    }

    OnStartObserving {
      self.observerTask = Task {
        for await alarms in AlarmManager.shared.alarmUpdates {
          for alarm in alarms {
            guard alarm.state == .alerting else { continue }
            guard let backendId = self.store.backendId(for: alarm.id) else { continue }
            print("ExpoAlarm: alarm \(backendId) is alerting!")
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
