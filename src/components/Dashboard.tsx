import { useState, useEffect } from "react";
import TrackingControls from "./TrackingControls";
import TrackingPausedAlert from "./TrackingPausedAlert";
import SessionList from "./SessionList";
import ExportButton from "./ExportButton";
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isTracking && (
        <TrackingPausedAlert onResume={handleResumeFromAlert} />
      )}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webcam Tracker</h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitor and track webcam usage on your system
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <TrackingControls
                isTracking={isTracking}
                onTrackingChange={handleTrackingChange}
              />
              <ExportButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SessionList
          sessions={sessions}
          onSessionsUpdate={handleSessionsUpdate}
        />
      </main>
    </div>
  );
}

