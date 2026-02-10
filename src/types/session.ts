export interface Session {
  id: number | null;
  app_name: string;
  start_time: string;
  end_time: string | null;
  duration_secs: number | null;
  status: "running" | "completed";
}

