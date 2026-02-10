import { useEffect } from "react";
import SessionRow from "./SessionRow";
import type { Session } from "../types/session";
import { listen } from "@tauri-apps/api/event";

interface SessionListProps {
  sessions: Session[];
  onSessionsUpdate: () => void;
}

export default function SessionList({
  sessions,
  onSessionsUpdate,
}: SessionListProps) {
  useEffect(() => {
    // Listen for session update events
    const unlisten = listen("session-updated", () => {
      onSessionsUpdate();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onSessionsUpdate]);

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No sessions yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Webcam usage sessions will appear here when applications access your camera.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Webcam Sessions ({sessions.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                App Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Settings
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.map((session) => (
              <SessionRow key={session.id || Math.random()} session={session} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

