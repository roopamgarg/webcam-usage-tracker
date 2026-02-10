use crate::session::models::{Session, SessionStatus};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::path::Path;

pub fn init_db(db_path: &Path) -> Result<()> {
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_secs INTEGER,
            status TEXT NOT NULL
        )",
        [],
    )?;
    
    Ok(())
}

pub fn insert_session(db_path: &Path, session: &Session) -> Result<i64> {
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "INSERT INTO sessions (app_name, start_time, end_time, duration_secs, status)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            session.app_name,
            session.start_time.to_rfc3339(),
            session.end_time.map(|t| t.to_rfc3339()),
            session.duration_secs,
            status_to_string(&session.status),
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

pub fn update_session(db_path: &Path, id: i64, end_time: DateTime<Utc>) -> Result<()> {
    let conn = Connection::open(db_path)?;
    
    let start_time_str: String = conn.query_row(
        "SELECT start_time FROM sessions WHERE id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    
    let start_time = DateTime::parse_from_rfc3339(&start_time_str)
        .context("Failed to parse start_time")?
        .with_timezone(&Utc);
    
    let duration_secs = (end_time - start_time).num_seconds().max(0);
    
    conn.execute(
        "UPDATE sessions SET end_time = ?1, duration_secs = ?2, status = ?3 WHERE id = ?4",
        params![
            end_time.to_rfc3339(),
            duration_secs,
            status_to_string(&SessionStatus::Completed),
            id,
        ],
    )?;
    
    Ok(())
}

pub fn get_all_sessions(db_path: &Path) -> Result<Vec<Session>> {
    let conn = Connection::open(db_path)?;
    let mut stmt = conn.prepare(
        "SELECT id, app_name, start_time, end_time, duration_secs, status FROM sessions
         ORDER BY start_time DESC",
    )?;
    
    let session_iter = stmt.query_map([], |row| {
        Ok(Session {
            id: Some(row.get(0)?),
            app_name: row.get(1)?,
            start_time: DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                .unwrap()
                .with_timezone(&Utc),
            end_time: row.get::<_, Option<String>>(3)?
                .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            duration_secs: row.get(4)?,
            status: string_to_status(&row.get::<_, String>(5)?),
        })
    })?;
    
    let mut sessions = Vec::new();
    for session in session_iter {
        sessions.push(session?);
    }
    
    Ok(sessions)
}

pub fn get_active_session(db_path: &Path) -> Result<Option<Session>> {
    let conn = Connection::open(db_path)?;
    
    let mut stmt = conn.prepare(
        "SELECT id, app_name, start_time, end_time, duration_secs, status FROM sessions
         WHERE status = 'running' ORDER BY start_time DESC LIMIT 1",
    )?;
    
    let mut session_iter = stmt.query_map([], |row| {
        Ok(Session {
            id: Some(row.get(0)?),
            app_name: row.get(1)?,
            start_time: DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                .unwrap()
                .with_timezone(&Utc),
            end_time: row.get::<_, Option<String>>(3)?
                .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            duration_secs: row.get(4)?,
            status: string_to_status(&row.get::<_, String>(5)?),
        })
    })?;
    
    if let Some(session) = session_iter.next() {
        Ok(Some(session?))
    } else {
        Ok(None)
    }
}

fn status_to_string(status: &SessionStatus) -> &str {
    match status {
        SessionStatus::Running => "running",
        SessionStatus::Completed => "completed",
    }
}

fn string_to_status(s: &str) -> SessionStatus {
    match s {
        "running" => SessionStatus::Running,
        "completed" => SessionStatus::Completed,
        _ => SessionStatus::Completed,
    }
}

