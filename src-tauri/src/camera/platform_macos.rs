use crate::camera::monitor::CameraEvent;
use chrono::Utc;

/// Parses a syslog-format line from `log stream` for camera start/stop events.
///
/// Expected syslog format:
///   `2025-06-10 14:23:01.123456-0700  AppName[PID]  ...  startRunning]: ...`
///
/// We look for lines containing `startRunning]:` or `stopRunning]:` (the
/// AVCaptureSession method call patterns), skip filter headers, backtrace
/// lines, and <private> redacted lines — mirroring webcam_log.sh logic.
pub fn parse_log_line(line: &str) -> Option<CameraEvent> {
    // Skip the filter header line, backtrace lines, and <private> redacted lines
    if line.contains("Filtering the log")
        || line.contains("backtrace")
        || line.contains("<private>")
    {
        return None;
    }

    // Determine if this is a start or stop event
    let is_start = line.contains("startRunning]:");
    let is_stop = line.contains("stopRunning]:");

    if !is_start && !is_stop {
        return None;
    }

    // Extract app name from syslog field 4: "AppName[PID]:" → "AppName"
    // Syslog fields are whitespace-separated: DATE TIME TIMEZONE? PROCESS[PID] ...
    let app_name = extract_app_name(line);

    let now = Utc::now();

    if is_start {
        Some(CameraEvent::Started {
            app_name,
            timestamp: now,
        })
    } else {
        Some(CameraEvent::Stopped {
            app_name,
            timestamp: now,
        })
    }
}

/// Extracts the application name from a syslog-format log line.
///
/// The syslog format from `log stream --style syslog` looks like:
///   `2025-06-10 14:23:01.123456-0700  0x1234  Activity  ...  AppName[PID]: (subsystem) message`
///
/// We find the first token matching the pattern `Name[digits]:` and strip
/// the `[PID]:` suffix to get the process/app name.
fn extract_app_name(line: &str) -> String {
    for token in line.split_whitespace() {
        // Look for tokens like "FaceTime[1234]:" or "zoom.us[5678]:"
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_start_event() {
        let line = "2025-06-10 14:23:01.123456-0700  0x1a2b  Default  0x0  123  0  FaceTime[1234]: (com.apple.cameracapture) [AVCaptureSession startRunning]: called";
        let event = parse_log_line(line);
        assert!(event.is_some());
        match event.unwrap() {
            CameraEvent::Started { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Started event"),
        }
    }

    #[test]
    fn test_parse_stop_event() {
        let line = "2025-06-10 14:25:01.654321-0700  0x1a2b  Default  0x0  123  0  FaceTime[1234]: (com.apple.cameracapture) [AVCaptureSession stopRunning]: called";
        let event = parse_log_line(line);
        assert!(event.is_some());
        match event.unwrap() {
            CameraEvent::Stopped { app_name, .. } => assert_eq!(app_name, "FaceTime"),
            _ => panic!("Expected Stopped event"),
        }
    }

    #[test]
    fn test_skip_filter_header() {
        let line = "Filtering the log data using ...";
        assert!(parse_log_line(line).is_none());
    }

    #[test]
    fn test_skip_backtrace() {
        let line = "  0  CoreMedia  backtrace ...";
        assert!(parse_log_line(line).is_none());
    }

    #[test]
    fn test_skip_private() {
        let line = "2025-06-10 14:23:01.123456-0700  FaceTime[1234]: <private>";
        assert!(parse_log_line(line).is_none());
    }

    #[test]
    fn test_unrelated_line() {
        let line = "2025-06-10 14:23:01.123456-0700  kernel[0]: some other message";
        assert!(parse_log_line(line).is_none());
    }

    #[test]
    fn test_extract_app_name_zoom() {
        let line = "2025-06-10 14:23:01.123456-0700  0x1a2b  Default  0x0  456  0  zoom.us[5678]: (com.apple.cameracapture) [AVCaptureSession startRunning]: called";
        assert_eq!(extract_app_name(line), "zoom.us");
    }
}

