import { useState, useEffect } from "react";
import TrackingControls from "./TrackingControls";
import TrackingPausedAlert from "./TrackingPausedAlert";
import StatsCards from "./StatsCards";
import SessionList from "./SessionList";
import { getSessions, getTrackingStatus, resumeTracking } from "../lib/commands";
import type { Session } from "../types/session";

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, trackingStatus] = await Promise.all([
        getSessions(),
        getTrackingStatus(),
      ]);
      setSessions(sessionsData);
      setIsTracking(trackingStatus);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackingChange = () => {
    loadData();
  };

  const handleResumeFromAlert = async () => {
    try {
      await resumeTracking();
      loadData();
    } catch (error) {
      console.error("Error resuming tracking:", error);
    }
  };

  const handleSessionsUpdate = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-sage-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Tracking paused banner */}
      {!isTracking && (
        <TrackingPausedAlert onResume={handleResumeFromAlert} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sage-400 rounded-xl flex items-center justify-center shadow-sage-sm">
                <svg className="text-white" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-1.5l3.293 3.293A1 1 0 0019 14.086V5.914a1 1 0 00-1.707-.707L14 8.5V7a2 2 0 00-2-2H4z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                Webcam Tracker
              </h1>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Status pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100">
                <span className="relative flex h-2 w-2">
                  {isTracking && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isTracking ? "bg-sage-400" : "bg-neutral-400"
                    }`}
                  ></span>
                </span>
                <span className="text-xs font-semibold text-neutral-600">
                  {isTracking ? "Monitoring" : "Paused"}
                </span>
              </div>

              <TrackingControls
                isTracking={isTracking}
                onTrackingChange={handleTrackingChange}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <StatsCards sessions={sessions} />

        <SessionList
          sessions={sessions}
          onSessionsUpdate={handleSessionsUpdate}
        />
      </main>
    </div>
  );
}
