use crate::session::models::{Session, SessionStatus};
use crate::storage;
use anyhow::Result;
use chrono::Utc;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct SessionManager {
    db_path: PathBuf,
    is_tracking: Arc<Mutex<bool>>,
    active_session: Arc<Mutex<Option<i64>>>,
}

impl SessionManager {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            is_tracking: Arc::new(Mutex::new(false)),
            active_session: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start_session(&self, app_name: String) -> Result<i64> {
        // PRD requirement: If a new webcam start event is received while the previous session has no end,
        // treat the new start as the end of the previous session
        if let Some(active_id) = *self.active_session.lock().unwrap() {
            let _ = self.end_session(active_id);
        }
        
        let session = Session::new(app_name, Utc::now());
        let id = storage::insert_session(&self.db_path, &session)?;
        
        let mut active = self.active_session.lock().unwrap();
        *active = Some(id);
        
        Ok(id)
    }

    pub fn end_session(&self, session_id: i64) -> Result<()> {
        let end_time = Utc::now();
        storage::update_session(&self.db_path, session_id, end_time)?;
        
        let mut active = self.active_session.lock().unwrap();
        *active = None;
        
        Ok(())
    }

    pub fn end_active_session(&self) -> Result<()> {
        let active = self.active_session.lock().unwrap();
        if let Some(id) = *active {
            drop(active);
            self.end_session(id)
        } else {
            Ok(())
        }
    }

    pub fn pause_tracking(&self) -> Result<()> {
        self.end_active_session()?;
        let mut tracking = self.is_tracking.lock().unwrap();
        *tracking = false;
        Ok(())
    }

    pub fn resume_tracking(&self) -> Result<()> {
        // End any active session before resuming (per PRD requirement)
        self.end_active_session()?;
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

    pub fn get_active_session(&self) -> Result<Option<Session>> {
        storage::get_active_session(&self.db_path)
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

