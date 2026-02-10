use crate::camera::monitor::CameraEvent;
use anyhow::Result;
use chrono::Utc;
use serde_json::Value;
use std::process::Command;

pub fn parse_log_line(line: &str) -> Option<CameraEvent> {
    let json: Value = serde_json::from_str(line).ok()?;
    
    let event_message = json.get("eventMessage")?.as_str()?.to_lowercase();
    let subsystem = json.get("subsystem")?.as_str()?;
    
    // Look for camera start/stop patterns in CoreMediaIO logs
    if subsystem == "com.apple.cmio" {
        if event_message.contains("start") || event_message.contains("open") {
            // Try to detect which app is using the camera
            let app_name = detect_camera_app().unwrap_or_else(|| "Unknown".to_string());
            return Some(CameraEvent::Started {
                app_name,
                timestamp: Utc::now(),
            });
        } else if event_message.contains("stop") || event_message.contains("close") {
            return Some(CameraEvent::Stopped {
                timestamp: Utc::now(),
            });
        }
    }
    
    None
}

fn detect_camera_app() -> Option<String> {
    // Use lsof to find which process has the camera device open
    let output = Command::new("lsof")
        .args(["-n", "-w", "/dev/video0", "/dev/video1"])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8(output.stdout).ok()?;
    
    // Parse lsof output to get process name
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() > 0 {
            // Try to get the process name from the COMMAND column
            // lsof format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
            if let Some(cmd) = parts.get(0) {
                if !cmd.is_empty() && *cmd != "COMMAND" {
                    return Some(cmd.to_string());
                }
            }
        }
    }
    
    None
}

