import AlarmKit
import AppIntents
import Foundation

/// Which alarm was stopped from the system alarm UI, so the app can open its check-in screen.
/// App intents run in the app's own process, so standard UserDefaults is shared with the module.
enum PendingAlarmStore {
  private static let idKey = "expo_alarm_pending_id"
  private static let firedAtKey = "expo_alarm_pending_fired_at"
  // Matches the backend's late check-in cutoff; older rings can't be checked in anyway.
  private static let maxAge: TimeInterval = 2 * 60 * 60

  static func set(_ backendId: String) {
    UserDefaults.standard.set(backendId, forKey: idKey)
    UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: firedAtKey)
  }

  static func consume() -> String? {
    defer {
      UserDefaults.standard.removeObject(forKey: idKey)
      UserDefaults.standard.removeObject(forKey: firedAtKey)
    }
    guard let id = UserDefaults.standard.string(forKey: idKey) else { return nil }
    let firedAt = UserDefaults.standard.double(forKey: firedAtKey)
    return Date().timeIntervalSince1970 - firedAt <= maxAge ? id : nil
  }
}

/// Runs when the user taps Stop on the alarm (lock screen, Dynamic Island or in-app alert).
/// Stopping alone isn't a check-in: it silences the alarm and opens Nudge on the check-in screen.
struct OpenAlarmCheckInIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Check In"
  static var description = IntentDescription("Stops the alarm and opens Nudge to check in.")
  static var openAppWhenRun: Bool = true
  static var isDiscoverable: Bool = false

  @Parameter(title: "Alarm ID")
  var alarmID: String

  @Parameter(title: "Backend Alarm ID")
  var backendAlarmID: String

  init() {}

  init(alarmID: UUID, backendAlarmID: String) {
    self.alarmID = alarmID.uuidString
    self.backendAlarmID = backendAlarmID
  }

  func perform() async throws -> some IntentResult {
    PendingAlarmStore.set(backendAlarmID)
    if let id = UUID(uuidString: alarmID) {
      try? AlarmManager.shared.stop(id: id)
    }
    return .result()
  }
}
