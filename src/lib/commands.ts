import { invoke } from "@tauri-apps/api/core";

export interface Session {
  id: number | null;
  app_name: string;
  start_time: string;
  end_time: string | null;
  duration_secs: number | null;
  status: "running" | "completed";
}

export async function getSessions(): Promise<Session[]> {
  return await invoke("get_sessions");
}

export async function getTrackingStatus(): Promise<boolean> {
  return await invoke("get_tracking_status");
}

export async function pauseTracking(): Promise<void> {
  return await invoke("pause_tracking");
}

export async function resumeTracking(): Promise<void> {
  return await invoke("resume_tracking");
}

export async function exportCsv(): Promise<void> {
  return await invoke("export_csv");
}

export async function checkConsent(): Promise<boolean> {
  return await invoke("check_consent");
}

export async function grantConsent(): Promise<void> {
  return await invoke("grant_consent");
}

export async function checkLogAccess(): Promise<boolean> {
  return await invoke("check_log_access");
}

export async function getAppIcon(appName: string): Promise<string | null> {
  return await invoke("get_app_icon", { appName });
}

