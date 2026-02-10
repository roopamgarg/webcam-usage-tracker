import { useState, useEffect } from "react";
import { getSessions } from "../lib/commands";
import type { Session } from "../types/session";
import { listen } from "@tauri-apps/api/event";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();

    // Listen for real-time updates
    const unlisten = listen("session-updated", () => {
      refreshSessions();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return { sessions, isLoading, refreshSessions };
}

