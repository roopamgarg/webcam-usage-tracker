use crate::camera::monitor::CameraEvent;
use chrono::Utc;
use std::collections::HashSet;
use std::process::Command;

// ---------------------------------------------------------------------------
// Subsystem detection — mirrors webcam_log.sh auto-detection
// ---------------------------------------------------------------------------

/// The macOS logging subsystems that can report camera activity.
/// Different macOS versions use different subsystems.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Subsystem {
    /// `com.apple.controlcenter` — macOS Sonoma (14+).
    /// Emits `activeCameraAttributions` messages with `[cam] AppName (bundle.id)`.
    ControlCenter,
    /// `com.apple.SkyLight` — some macOS Ventura builds.
    /// Emits `camera status 0` / `camera status 1` messages.
    SkyLight,
    /// `com.apple.cameracapture` — older macOS (Monterey and earlier).
    /// Emits `startRunning]` / `stopRunning]` from AVCaptureSession.
    CameraCapture,
    /// `com.apple.cmio` — CoreMediaIO fallback.
    /// Emits `CMIODeviceStartStream` / `CMIODeviceStopStream` or startRunning/stopRunning.
    Cmio,
}

impl std::fmt::Display for Subsystem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Subsystem::ControlCenter => write!(f, "controlcenter"),
            Subsystem::SkyLight => write!(f, "skylight"),
            Subsystem::CameraCapture => write!(f, "cameracapture"),
            Subsystem::Cmio => write!(f, "cmio"),
        }
    }
}

/// Auto-detects which logging subsystem reports camera events on this Mac.
/// Checks the last 5 minutes of logs — the same strategy used in webcam_log.sh.
pub fn detect_subsystem() -> Subsystem {
    // 1. controlcenter (macOS Sonoma+)
    if probe_logs(
        r#"subsystem == "com.apple.controlcenter" AND eventMessage CONTAINS "activeCameraAttributions""#,
        "activeCameraAttributions",
    ) {
        return Subsystem::ControlCenter;
    }

    // 2. SkyLight
    if probe_logs(
        r#"subsystem == "com.apple.SkyLight" AND eventMessage CONTAINS "camera status""#,
        "camera status",
    ) {
        return Subsystem::SkyLight;
    }

    // 3. cameracapture
    if probe_logs(
        r#"subsystem == "com.apple.cameracapture""#,
        "startRunning",
    ) {
        return Subsystem::CameraCapture;
    }

    // 4. cmio
    if probe_logs(
        r#"subsystem == "com.apple.cmio""#,
        "CMIODeviceStartStream",
    ) {
        return Subsystem::Cmio;
    }

    // Default fallback — controlcenter is the most common on modern macOS
    Subsystem::ControlCenter
}

/// Runs `log show --last 5m` with the given predicate and checks whether any
/// output line contains `needle`.
fn probe_logs(predicate: &str, needle: &str) -> bool {
    let output = Command::new("log")
        .args(["show", "--last", "5m", "--predicate", predicate, "--info"])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            stdout.contains(needle)
        }
        Err(_) => false,
    }
}

// ---------------------------------------------------------------------------
// Predicate strings for `log stream` — one per subsystem
// ---------------------------------------------------------------------------

/// Returns the `--predicate` argument for `log stream` matching the subsystem.
pub fn predicate_for(subsystem: &Subsystem) -> &'static str {
    match subsystem {
        Subsystem::ControlCenter => {
            r#"(subsystem == "com.apple.controlcenter") AND (eventMessage CONTAINS "activeCameraAttributions")"#
        }
        Subsystem::SkyLight => {
            r#"(subsystem == "com.apple.SkyLight") AND (eventMessage CONTAINS "camera status")"#
        }
        Subsystem::CameraCapture => {
            r#"(subsystem == "com.apple.cameracapture") AND (eventMessage CONTAINS "startRunning]" OR eventMessage CONTAINS "stopRunning]")"#
        }
        Subsystem::Cmio => {
            r#"(subsystem == "com.apple.cmio") AND (eventMessage CONTAINS "startRunning" OR eventMessage CONTAINS "stopRunning" OR eventMessage CONTAINS "CMIODeviceStartStream" OR eventMessage CONTAINS "CMIODeviceStopStream")"#
        }
    }
}

// ---------------------------------------------------------------------------
// Log line parsers — one per subsystem
// ---------------------------------------------------------------------------

/// Parses a single log line and returns zero or more `CameraEvent`s.
///
/// Most subsystems produce at most one event per line, but `ControlCenter` can
/// produce several (one per app that started or stopped) because a single log
/// line lists *all* currently active camera apps.
pub fn parse_log_line(
    line: &str,
    subsystem: &Subsystem,
    state: &mut ParserState,
) -> Vec<CameraEvent> {
    // Skip common noise lines
    if line.contains("Filtering the log") || line.contains("backtrace") {
        return vec![];
    }

    match subsystem {
        Subsystem::ControlCenter => parse_controlcenter(line, state),
        Subsystem::SkyLight => parse_skylight(line, state),
        Subsystem::CameraCapture => parse_cameracapture(line),
        Subsystem::Cmio => parse_cmio(line),
    }
}

// ---------------------------------------------------------------------------
// Parser state (needed for stateful subsystems like ControlCenter & SkyLight)
// ---------------------------------------------------------------------------

/// Mutable state carried across log lines for subsystems that require diffing
/// (e.g. ControlCenter lists *all* active apps on every line).
#[derive(Debug, Default)]
pub struct ParserState {
    /// Currently known set of active camera apps (for ControlCenter).
    pub active_apps: HashSet<String>,
    /// Last known camera state for SkyLight ("open" / "closed").
    pub skylight_state: Option<bool>,
}

// ---------------------------------------------------------------------------
// ControlCenter parser (macOS Sonoma+)
// ---------------------------------------------------------------------------

/// Parses `activeCameraAttributions` lines.
///
/// Example log line:
///   `... StatusBarServer[PID]: ... activeCameraAttributions: [cam] FaceTime (com.apple.FaceTime) ...`
///
/// Each line lists all apps currently using the camera. We diff against the
/// previous set to emit Started/Stopped events.
fn parse_controlcenter(line: &str, state: &mut ParserState) -> Vec<CameraEvent> {
    if !line.contains("activeCameraAttributions") {
        return vec![];
    }

    let now = Utc::now();
    let mut events = Vec::new();

    // Extract app names from "[cam] AppName (bundle.id)" patterns
    let current_apps: HashSet<String> = extract_cam_apps(line);

    // Newly started apps = in current but not in previous
    for app in current_apps.difference(&state.active_apps) {
        events.push(CameraEvent::Started {
            app_name: app.clone(),
            timestamp: now,
        });
    }

    // Newly stopped apps = in previous but not in current
    for app in state.active_apps.difference(&current_apps) {
        events.push(CameraEvent::Stopped {
            app_name: app.clone(),
            timestamp: now,
        });
    }

    // Update state
    state.active_apps = current_apps;

    events
}

/// Extracts app names from `[cam] AppName (bundle.id)` patterns in a log line.
fn extract_cam_apps(line: &str) -> HashSet<String> {
    let mut apps = HashSet::new();
    let marker = "[cam] ";

    let mut search_from = 0;
    while let Some(start) = line[search_from..].find(marker) {
        let name_start = search_from + start + marker.len();
        // The app name ends at the next " (" which precedes the bundle ID
        if let Some(paren_offset) = line[name_start..].find(" (") {
            let name = line[name_start..name_start + paren_offset].trim();
            if !name.is_empty() {
                apps.insert(name.to_string());
            }
            search_from = name_start + paren_offset + 1;
        } else {
            // No parenthesized bundle ID — take the rest of the token
            let name = line[name_start..].split_whitespace().next().unwrap_or("");
            if !name.is_empty() {
                apps.insert(name.to_string());
            }
            break;
        }
    }

    apps
}

// ---------------------------------------------------------------------------
// SkyLight parser
// ---------------------------------------------------------------------------

/// Parses `camera status 0` / `camera status 1` lines.
/// Stateful: only emits an event on transitions (open→closed, closed→open).
fn parse_skylight(line: &str, state: &mut ParserState) -> Vec<CameraEvent> {
    if !line.contains("camera status") {
        return vec![];
    }

    let now = Utc::now();

    if line.contains("camera status 0") {
        // Camera closed
        if state.skylight_state != Some(false) {
            state.skylight_state = Some(false);
            return vec![CameraEvent::Stopped {
                app_name: extract_app_name(line),
                timestamp: now,
            }];
        }
    } else if line.contains("camera status 1") {
        // Camera opened
        if state.skylight_state != Some(true) {
            state.skylight_state = Some(true);
            return vec![CameraEvent::Started {
                app_name: extract_app_name(line),
                timestamp: now,
            }];
        }
    }

    vec![]
}

// ---------------------------------------------------------------------------
// CameraCapture parser (original implementation)
// ---------------------------------------------------------------------------

/// Parses `startRunning]` / `stopRunning]` from AVCaptureSession.
fn parse_cameracapture(line: &str) -> Vec<CameraEvent> {
    if line.contains("<private>") {
        return vec![];
    }

    let is_start = line.contains("startRunning]:");
    let is_stop = line.contains("stopRunning]:");

    if !is_start && !is_stop {
        return vec![];
    }

    let app_name = extract_app_name(line);
    let now = Utc::now();

    if is_start {
        vec![CameraEvent::Started {
            app_name,
            timestamp: now,
        }]
    } else {
        vec![CameraEvent::Stopped {
            app_name,
            timestamp: now,
        }]
    }
}

// ---------------------------------------------------------------------------
// CMIO parser (CoreMediaIO)
// ---------------------------------------------------------------------------

/// Parses CoreMediaIO lines — `CMIODeviceStartStream` / `CMIODeviceStopStream`
/// or `startRunning` / `stopRunning`.
fn parse_cmio(line: &str) -> Vec<CameraEvent> {
    let is_start = line.contains("startRunning") || line.contains("CMIODeviceStartStream");
    let is_stop = line.contains("stopRunning") || line.contains("CMIODeviceStopStream");

    if !is_start && !is_stop {
        return vec![];
    }

    let app_name = extract_app_name(line);
    let now = Utc::now();

    if is_stop {
        vec![CameraEvent::Stopped {
            app_name,
            timestamp: now,
        }]
    } else {
        vec![CameraEvent::Started {
            app_name,
            timestamp: now,
        }]
    }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/// Extracts the application name from a syslog-format log line.
///
/// Looks for the first token matching `Name[digits]:` and strips the
/// `[PID]:` suffix to get the process/app name.
fn extract_app_name(line: &str) -> String {
    for token in line.split_whitespace() {
        if let Some(bracket_pos) = token.find('[') {
            if token.ends_with("]:") {
                let name = &token[..bracket_pos];
                if !name.is_empty() {
                    return name.to_string();
                }
            }
        }
    }
    "Unknown".to_string()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // --- Detection / Predicate tests ---

    #[test]
    fn test_predicate_strings_are_non_empty() {
        for sub in [
            Subsystem::ControlCenter,
            Subsystem::SkyLight,
            Subsystem::CameraCapture,
            Subsystem::Cmio,
        ] {
            assert!(!predicate_for(&sub).is_empty());
        }
    }

    // --- CameraCapture parser tests (original) ---

    #[test]
    fn test_cameracapture_start() {
        let line = "2025-06-10 14:23:01.123456-0700  0x1a2b  Default  0x0  123  0  FaceTime[1234]: (com.apple.cameracapture) [AVCaptureSession startRunning]: called";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Started event"),
        }
    }

    #[test]
    fn test_cameracapture_stop() {
        let line = "2025-06-10 14:25:01.654321-0700  0x1a2b  Default  0x0  123  0  FaceTime[1234]: (com.apple.cameracapture) [AVCaptureSession stopRunning]: called";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Stopped { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_cameracapture_skip_private() {
        let line = "2025-06-10 14:23:01.123456-0700  FaceTime[1234]: <private>";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert!(events.is_empty());
    }

    #[test]
    fn test_cameracapture_skip_filter_header() {
        let line = "Filtering the log data using ...";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert!(events.is_empty());
    }

    #[test]
    fn test_cameracapture_skip_backtrace() {
        let line = "  0  CoreMedia  backtrace ...";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert!(events.is_empty());
    }

    #[test]
    fn test_cameracapture_unrelated_line() {
        let line = "2025-06-10 14:23:01.123456-0700  kernel[0]: some other message";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert!(events.is_empty());
    }

    #[test]
    fn test_cameracapture_zoom_app_name() {
        let line = "2025-06-10 14:23:01.123456-0700  0x1a2b  Default  0x0  456  0  zoom.us[5678]: (com.apple.cameracapture) [AVCaptureSession startRunning]: called";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::CameraCapture, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "zoom.us"),
            _ => panic!("Expected Started event"),
        }
    }

    // --- ControlCenter parser tests ---

    #[test]
    fn test_controlcenter_single_app_start() {
        let line = "2025-06-10 14:23:01 StatusBarServer[123]: activeCameraAttributions: [cam] FaceTime (com.apple.FaceTime)";
        let mut state = ParserState::default();
        let events = parse_log_line(line, &Subsystem::ControlCenter, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Started event"),
        }
    }

    #[test]
    fn test_controlcenter_app_stop() {
        let mut state = ParserState::default();
        state.active_apps.insert("FaceTime".to_string());

        // Empty attributions line = camera turned off
        let line = "2025-06-10 14:25:01 StatusBarServer[123]: activeCameraAttributions: (none)";
        let events = parse_log_line(line, &Subsystem::ControlCenter, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Stopped { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_controlcenter_two_apps_one_stops() {
        let mut state = ParserState::default();
        state.active_apps.insert("FaceTime".to_string());
        state.active_apps.insert("zoom.us".to_string());

        // Only FaceTime remains
        let line = "2025-06-10 14:25:01 StatusBarServer[123]: activeCameraAttributions: [cam] FaceTime (com.apple.FaceTime)";
        let events = parse_log_line(line, &Subsystem::ControlCenter, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Stopped { app_name, .. } => assert_eq!(app_name, "zoom.us"),
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_controlcenter_no_change_no_events() {
        let mut state = ParserState::default();
        state.active_apps.insert("FaceTime".to_string());

        let line = "2025-06-10 14:25:01 StatusBarServer[123]: activeCameraAttributions: [cam] FaceTime (com.apple.FaceTime)";
        let events = parse_log_line(line, &Subsystem::ControlCenter, &mut state);
        assert!(events.is_empty());
    }

    // --- SkyLight parser tests ---

    #[test]
    fn test_skylight_camera_opened() {
        let mut state = ParserState::default();
        let line = "2025-06-10 14:23:01 WindowServer[123]: camera status 1";
        let events = parse_log_line(line, &Subsystem::SkyLight, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { .. } => {}
            _ => panic!("Expected Started event"),
        }
    }

    #[test]
    fn test_skylight_camera_closed() {
        let mut state = ParserState {
            skylight_state: Some(true),
            ..Default::default()
        };
        let line = "2025-06-10 14:25:01 WindowServer[123]: camera status 0";
        let events = parse_log_line(line, &Subsystem::SkyLight, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Stopped { .. } => {}
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_skylight_duplicate_open_ignored() {
        let mut state = ParserState {
            skylight_state: Some(true),
            ..Default::default()
        };
        let line = "2025-06-10 14:25:01 WindowServer[123]: camera status 1";
        let events = parse_log_line(line, &Subsystem::SkyLight, &mut state);
        assert!(events.is_empty());
    }

    // --- CMIO parser tests ---

    #[test]
    fn test_cmio_start_stream() {
        let mut state = ParserState::default();
        let line = "2025-06-10 14:23:01 some_app[456]: CMIODeviceStartStream device 0x1234";
        let events = parse_log_line(line, &Subsystem::Cmio, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "some_app"),
            _ => panic!("Expected Started event"),
        }
    }

    #[test]
    fn test_cmio_stop_stream() {
        let mut state = ParserState::default();
        let line = "2025-06-10 14:25:01 some_app[456]: CMIODeviceStopStream device 0x1234";
        let events = parse_log_line(line, &Subsystem::Cmio, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Stopped { app_name, .. } => assert_eq!(app_name, "some_app"),
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_cmio_start_running() {
        let mut state = ParserState::default();
        let line = "2025-06-10 14:23:01 zoom.us[789]: startRunning session";
        let events = parse_log_line(line, &Subsystem::Cmio, &mut state);
        assert_eq!(events.len(), 1);
        match &events[0] {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "zoom.us"),
            _ => panic!("Expected Started event"),
        }
    }

    // --- extract_cam_apps helper tests ---

    #[test]
    fn test_extract_cam_apps_multiple() {
        let line = "activeCameraAttributions: [cam] FaceTime (com.apple.FaceTime), [cam] zoom.us (us.zoom.xos)";
        let apps = extract_cam_apps(line);
        assert!(apps.contains("FaceTime"));
        assert!(apps.contains("zoom.us"));
        assert_eq!(apps.len(), 2);
    }

    #[test]
    fn test_extract_cam_apps_empty() {
        let line = "activeCameraAttributions: (none)";
        let apps = extract_cam_apps(line);
        assert!(apps.is_empty());
    }
}
