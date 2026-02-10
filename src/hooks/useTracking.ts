import { useState, useEffect } from "react";
import { getTrackingStatus, pauseTracking, resumeTracking } from "../lib/commands";
import { listen } from "@tauri-apps/api/event";

export function useTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = async () => {
    try {
      const status = await getTrackingStatus();
      setIsTracking(status);
    } catch (error) {
      console.error("Error fetching tracking status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await pauseTracking();
      } else {
        await resumeTracking();
      }
      await refreshStatus();
    } catch (error) {
      console.error("Error toggling tracking:", error);
    }
  };

  useEffect(() => {
    refreshStatus();

    // Listen for tracking status updates
    const unlisten = listen("tracking-status-changed", () => {
      refreshStatus();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return { isTracking, isLoading, toggleTracking, refreshStatus };
}

