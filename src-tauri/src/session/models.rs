use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Option<i64>,
    pub app_name: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>,
    pub status: SessionStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Running,
    Completed,
}

impl Session {
    pub fn new(app_name: String, start_time: DateTime<Utc>) -> Self {
        Self {
            id: None,
            app_name,
            start_time,
            end_time: None,
            duration_secs: None,
            status: SessionStatus::Running,
        }
    }

    pub fn close(&mut self, end_time: DateTime<Utc>) {
        self.end_time = Some(end_time);
        self.duration_secs = Some(
            (end_time - self.start_time)
                .num_seconds()
                .max(0),
        );
        self.status = SessionStatus::Completed;
    }
}

