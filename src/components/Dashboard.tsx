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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isTracking && (
        <TrackingPausedAlert onResume={handleResumeFromAlert} />
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isTracking ? "bg-green-400" : "bg-gray-400"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isTracking ? "bg-green-400" : "bg-gray-400"
                    }`}
                  ></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {isTracking ? "System Active" : "System Paused"}
                </span>
              </div>
              <h1 className="text-2xl font-bold">Webcam Session Log</h1>
              <p className="text-sm text-gray-400 mt-1 max-w-lg">
                Monitor and track detailed webcam usage history across your
                system to ensure privacy compliance.
              </p>
            </div>
            <TrackingControls
              isTracking={isTracking}
              onTrackingChange={handleTrackingChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <StatsCards sessions={sessions} />

        {/* Session Table */}
        <SessionList
          sessions={sessions}
          onSessionsUpdate={handleSessionsUpdate}
        />
      </main>
    </div>
  );
}
