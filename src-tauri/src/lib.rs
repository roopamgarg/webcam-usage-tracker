mod camera;
mod commands;
mod export;
mod session;
mod storage;

use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize storage
            let app_data_dir = app.path().app_data_dir().unwrap();
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("sessions.db");
            storage::init_db(&db_path)?;

            // Initialize session manager
            let session_manager = session::SessionManager::new(db_path.clone());
            
            // Recover orphaned sessions on startup
            session_manager.recover_orphaned_sessions()?;
            
            // Initialize camera monitor
            let camera_monitor = Arc::new(Mutex::new(camera::CameraMonitor::new()));
            
            // Store in app state (wrapped in Mutex for thread safety)
            app.manage(Mutex::new(session_manager));
            app.manage(camera_monitor.clone());
            
            // Start camera monitoring in background
            let app_handle = app.handle().clone();
            let db_path_clone = db_path.clone();
            std::thread::spawn(move || {
                start_camera_monitoring(app_handle, db_path_clone, camera_monitor);
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Graceful shutdown - close active sessions
                if let Some(session_manager) = window.try_state::<Mutex<session::SessionManager>>() {
                    if let Ok(manager) = session_manager.lock() {
                        let _ = manager.end_active_session();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sessions,
            commands::get_tracking_status,
            commands::pause_tracking,
            commands::resume_tracking,
            commands::export_csv,
            commands::check_consent,
            commands::grant_consent,
            commands::check_log_access,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_camera_monitoring(
    app: tauri::AppHandle,
    _db_path: std::path::PathBuf,
    camera_monitor: Arc<Mutex<camera::CameraMonitor>>,
) {
    loop {
        // Check if tracking is enabled
        let is_tracking = {
            if let Some(session_manager) = app.try_state::<Mutex<session::SessionManager>>() {
                if let Ok(manager) = session_manager.lock() {
                    manager.is_tracking()
                } else {
                    false
                }
            } else {
                false
            }
        };

        if is_tracking {
            // Start monitoring if not already started
            let mut monitor = camera_monitor.lock().unwrap();
            if !monitor.is_running() {
                if let Ok(receiver) = monitor.start() {
                    drop(monitor);
                    
                    // Process camera events
                    while let Ok(event) = receiver.recv() {
                        // Check if still tracking
                        let still_tracking = {
                            if let Some(session_manager) = app.try_state::<Mutex<session::SessionManager>>() {
                                if let Ok(manager) = session_manager.lock() {
                                    manager.is_tracking()
                                } else {
                                    false
                                }
                            } else {
                                false
                            }
                        };
                        
                        if !still_tracking {
                            break;
                        }
                        
                        if let Some(session_manager) = app.try_state::<Mutex<session::SessionManager>>() {
                            match event {
                                camera::CameraEvent::Started { app_name, .. } => {
                                    let manager = session_manager.lock().unwrap();
                                    if let Ok(session_id) = manager.start_session(app_name) {
                                        drop(manager);
                                        let _ = app.emit("session-started", session_id);
                                        let _ = app.emit("session-updated", ());
                                    }
                                }
                                camera::CameraEvent::Stopped { .. } => {
                                    let manager = session_manager.lock().unwrap();
                                    if manager.end_active_session().is_ok() {
                                        drop(manager);
                                        let _ = app.emit("session-ended", ());
                                        let _ = app.emit("session-updated", ());
                                    }
                                }
                            }
                        }
                    }
                    
                    // Stop monitor when loop exits
                    let mut monitor = camera_monitor.lock().unwrap();
                    monitor.stop();
                }
            } else {
                drop(monitor);
                std::thread::sleep(std::time::Duration::from_secs(1));
            }
        } else {
            // Stop monitoring if tracking is paused
            let mut monitor = camera_monitor.lock().unwrap();
            monitor.stop();
            drop(monitor);
            std::thread::sleep(std::time::Duration::from_secs(1));
        }
        
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

