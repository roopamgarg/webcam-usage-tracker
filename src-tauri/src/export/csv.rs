use crate::session::models::Session;
use anyhow::Result;
use std::fs::File;
use std::io::Write;

pub fn export_sessions_to_csv(sessions: &[Session], path: &str) -> Result<()> {
    let mut file = File::create(path)?;
    
    // Write header
    writeln!(file, "App Name,Start Time,End Time,Duration (seconds),Status")?;
    
    // Write rows
    for session in sessions {
        let start_time = session.start_time.to_rfc3339();
        let end_time = session
            .end_time
            .map(|t| t.to_rfc3339())
            .unwrap_or_else(|| "".to_string());
        let duration = session
            .duration_secs
            .map(|d| d.to_string())
            .unwrap_or_else(|| "".to_string());
        let status = match session.status {
            crate::session::models::SessionStatus::Running => "Running",
            crate::session::models::SessionStatus::Completed => "Completed",
        };
        
        // Escape commas in app name
        let app_name = session.app_name.replace(',', ";");
        
        writeln!(file, "{},{},{},{},{}", app_name, start_time, end_time, duration, status)?;
    }
    
    Ok(())
}

