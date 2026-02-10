use crate::camera::platform_macos::{self, ParserState};
use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::thread;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CameraEvent {
    Started {
        app_name: String,
        timestamp: chrono::DateTime<Utc>,
    },
    Stopped {
        app_name: String,
        timestamp: chrono::DateTime<Utc>,
    },
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

        // Auto-detect which macOS logging subsystem reports camera events.
        // This mirrors the detection logic in webcam_log.sh — it checks the
        // last 5 minutes of logs for each subsystem in priority order:
        //   1. controlcenter  (macOS Sonoma 14+)
        //   2. SkyLight       (some Ventura builds)
        //   3. cameracapture  (older macOS)
        //   4. cmio           (CoreMediaIO fallback)
        let subsystem = platform_macos::detect_subsystem();
        eprintln!("[webcam-tracker] Detected camera subsystem: {}", subsystem);

        let predicate = platform_macos::predicate_for(&subsystem);

        let mut child = Command::new("log")
            .args(["stream", "--style", "syslog", "--predicate", predicate, "--info"])
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
            let mut state = ParserState::default();

            for line in reader.lines() {
                if let Ok(line) = line {
                    let events = platform_macos::parse_log_line(&line, &subsystem, &mut state);
                    for event in events {
                        if tx_clone.send(event).is_err() {
                            return;
                        }
                    }
                }
            }
        });

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
