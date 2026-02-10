use crate::session::models::{Session, SessionStatus};
use crate::storage;
use anyhow::Result;
use chrono::Utc;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct SessionManager {
    db_path: PathBuf,
    is_tracking: Arc<Mutex<bool>>,
    /// Maps app name → active session ID, allowing multiple concurrent webcam sessions
    active_sessions: Arc<Mutex<HashMap<String, i64>>>,
}

impl SessionManager {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            is_tracking: Arc::new(Mutex::new(false)),
            active_sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Starts a new session for the given app.
    /// If the same app already has an active session, it is ended first.
    /// Other apps' sessions are left untouched.
    pub fn start_session(&self, app_name: String) -> Result<i64> {
        // If this specific app already has an active session, end it first
        let existing_id = {
            let sessions = self.active_sessions.lock().unwrap();
            sessions.get(&app_name).copied()
        };
        if let Some(active_id) = existing_id {
            let _ = self.end_session_by_id(active_id, &app_name);
        }

        let session = Session::new(app_name.clone(), Utc::now());
        let id = storage::insert_session(&self.db_path, &session)?;

        let mut sessions = self.active_sessions.lock().unwrap();
        sessions.insert(app_name, id);

        Ok(id)
    }

    /// Ends the active session for a specific app (by name).
    /// Returns Ok(true) if a session was ended, Ok(false) if no active session for that app.
    pub fn end_session_for_app(&self, app_name: &str) -> Result<bool> {
        let session_id = {
            let sessions = self.active_sessions.lock().unwrap();
            sessions.get(app_name).copied()
        };

        if let Some(id) = session_id {
            self.end_session_by_id(id, app_name)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Ends a session by its database ID and removes it from active tracking.
    fn end_session_by_id(&self, session_id: i64, app_name: &str) -> Result<()> {
        let end_time = Utc::now();
        storage::update_session(&self.db_path, session_id, end_time)?;

        let mut sessions = self.active_sessions.lock().unwrap();
        sessions.remove(app_name);

        Ok(())
    }

    /// Ends all currently active sessions (used for pause/shutdown).
    pub fn end_all_active_sessions(&self) -> Result<()> {
        let snapshot: Vec<(String, i64)> = {
            let sessions = self.active_sessions.lock().unwrap();
            sessions.iter().map(|(k, v)| (k.clone(), *v)).collect()
        };

        let end_time = Utc::now();
        for (app_name, session_id) in snapshot {
            let _ = storage::update_session(&self.db_path, session_id, end_time);
            let mut sessions = self.active_sessions.lock().unwrap();
            sessions.remove(&app_name);
        }

        Ok(())
    }

    pub fn has_active_sessions(&self) -> bool {
        let sessions = self.active_sessions.lock().unwrap();
        !sessions.is_empty()
    }

    pub fn pause_tracking(&self) -> Result<()> {
        self.end_all_active_sessions()?;
        let mut tracking = self.is_tracking.lock().unwrap();
        *tracking = false;
        Ok(())
    }

    pub fn resume_tracking(&self) -> Result<()> {
        self.end_all_active_sessions()?;
        let mut tracking = self.is_tracking.lock().unwrap();
        *tracking = true;
        Ok(())
    }

    pub fn is_tracking(&self) -> bool {
        *self.is_tracking.lock().unwrap()
    }

    pub fn get_all_sessions(&self) -> Result<Vec<Session>> {
        storage::get_all_sessions(&self.db_path)
    }

    pub fn get_active_sessions(&self) -> Result<Vec<Session>> {
        storage::get_active_sessions(&self.db_path)
    }

    pub fn recover_orphaned_sessions(&self) -> Result<()> {
        // Find all running sessions and close them
        let sessions = storage::get_all_sessions(&self.db_path)?;
        let now = Utc::now();

        for session in sessions {
            if session.status == SessionStatus::Running {
                if let Some(id) = session.id {
                    storage::update_session(&self.db_path, id, now)?;
                }
            }
        }

        Ok(())
    }
}

