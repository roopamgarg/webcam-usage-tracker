use crate::camera::platform_macos;
use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::thread;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CameraEvent {
    Started { app_name: String, timestamp: chrono::DateTime<Utc> },
    Stopped { timestamp: chrono::DateTime<Utc> },
}

pub struct CameraMonitor {
    child: Option<Child>,
    is_running: bool,
}

impl CameraMonitor {
    pub fn new() -> Self {
        Self {
            child: None,
            is_running: false,
        }
    }
    
    pub fn is_running(&self) -> bool {
        self.is_running
    }

    pub fn start(&mut self) -> Result<mpsc::Receiver<CameraEvent>> {
        let (tx, rx) = mpsc::channel();

        // Spawn log stream process
        let mut child = Command::new("log")
            .args([
                "stream",
                "--predicate",
                "subsystem == 'com.apple.cmio'",
                "--style",
                "ndjson",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .context("Failed to spawn log stream process")?;

        let stdout = child.stdout.take().context("Failed to get stdout")?;
        self.child = Some(child);

        // Spawn thread to parse log output
        let tx_clone = tx.clone();
        thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            
            for line in reader.lines() {
                if let Ok(line) = line {
                    if let Some(event) = platform_macos::parse_log_line(&line) {
                        if tx_clone.send(event).is_err() {
                            break;
                        }
                    }
                }
            }
        });

        // We can't clone receivers, so we don't store it
        // Just track that we're running
        self.is_running = true;
        Ok(rx)
    }

    pub fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.is_running = false;
    }
}

impl Drop for CameraMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}
