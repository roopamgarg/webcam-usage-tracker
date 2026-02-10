use crate::export::export_sessions_to_csv;
use crate::session::{Session, SessionManager, SessionStatus};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionDto {
    pub id: Option<i64>,
    pub app_name: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_secs: Option<i64>,
    pub status: String,
}

impl From<Session> for SessionDto {
    fn from(session: Session) -> Self {
        Self {
            id: session.id,
            app_name: session.app_name,
            start_time: session.start_time.to_rfc3339(),
            end_time: session.end_time.map(|t| t.to_rfc3339()),
            duration_secs: session.duration_secs,
            status: match session.status {
                SessionStatus::Running => "running".to_string(),
                SessionStatus::Completed => "completed".to_string(),
            },
        }
    }
}

#[tauri::command]
pub fn get_sessions(session_manager: State<'_, Mutex<SessionManager>>) -> Result<Vec<SessionDto>, String> {
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    let sessions = manager.get_all_sessions().map_err(|e| e.to_string())?;
    Ok(sessions.into_iter().map(SessionDto::from).collect())
}

#[tauri::command]
pub fn get_tracking_status(session_manager: State<'_, Mutex<SessionManager>>) -> Result<bool, String> {
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.is_tracking())
}

#[tauri::command]
pub fn pause_tracking(session_manager: State<'_, Mutex<SessionManager>>) -> Result<(), String> {
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    manager.pause_tracking().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resume_tracking(session_manager: State<'_, Mutex<SessionManager>>) -> Result<(), String> {
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    manager.resume_tracking().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_csv(
    app: AppHandle,
    session_manager: State<'_, Mutex<SessionManager>>,
) -> Result<(), String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    use std::sync::{Arc, Mutex};
    
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    let sessions = manager.get_all_sessions().map_err(|e| e.to_string())?;
    drop(manager);
    
    // Use a shared state to capture the path from the callback
    let path_result: Arc<Mutex<Option<FilePath>>> = Arc::new(Mutex::new(None));
    let path_result_clone = path_result.clone();
    
    app.dialog()
        .file()
        .set_file_name("webcam-sessions.csv")
        .add_filter("CSV", &["csv"])
        .save_file(move |path_buf| {
            *path_result_clone.lock().unwrap() = path_buf;
        });
    
    // Wait a bit for the dialog to complete (this is a workaround for the async nature)
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    let file_path = path_result.lock().unwrap().take()
        .ok_or_else(|| "User cancelled save dialog or no file path selected".to_string())?;
    
    let path_str = file_path
        .as_path()
        .and_then(|p| p.to_str())
        .ok_or_else(|| "Invalid file path".to_string())?;
    export_sessions_to_csv(&sessions, path_str).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn check_consent() -> Result<bool, String> {
    // Check if user has previously consented
    // For now, we'll use a simple file-based approach
    let consent_file = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?
        .join(".webcam-tracker-consent");
    
    Ok(consent_file.exists())
}

#[tauri::command]
pub fn grant_consent(
    session_manager: State<'_, Mutex<SessionManager>>,
) -> Result<(), String> {
    let consent_file = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?
        .join(".webcam-tracker-consent");
    
    std::fs::write(&consent_file, "1").map_err(|e| e.to_string())?;
    
    // Start tracking when consent is granted
    let manager = session_manager.lock().map_err(|e| e.to_string())?;
    manager.resume_tracking().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn check_log_access() -> Result<bool, String> {
    // Try to run log stream and see if it works
    use std::process::Command;
    
    let output = Command::new("log")
        .args(["stream", "--predicate", "subsystem == 'com.apple.cmio'", "--style", "ndjson"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();
    
    match output {
        Ok(mut child) => {
            // Give it a moment, then kill it
            std::thread::sleep(std::time::Duration::from_millis(100));
            let _ = child.kill();
            let _ = child.wait();
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

