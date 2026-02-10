import { useState, useEffect, useMemo } from "react";
import SessionRow from "./SessionRow";
import Pagination from "./Pagination";
import type { Session } from "../types/session";
import { listen } from "@tauri-apps/api/event";

interface SessionListProps {
  sessions: Session[];
  onSessionsUpdate: () => void;
}

const ITEMS_PER_PAGE = 5;

export default function SessionList({
  sessions,
  onSessionsUpdate,
}: SessionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unlisten = listen("session-updated", () => {
      onSessionsUpdate();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onSessionsUpdate]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter((session) =>
      session.app_name.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-16 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-6">
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            No sessions yet
          </h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Webcam sessions will appear here when applications access your
            camera. Keep monitoring active to track usage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Session History
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-sage-400 outline-none transition-all w-64 placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Session Card */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-200 bg-neutral-50">
          <div className="col-span-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Application
          </div>
          <div className="col-span-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Date & Time
          </div>
          <div className="col-span-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Duration
          </div>
          <div className="col-span-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Status
          </div>
          <div className="col-span-2 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">
            Actions
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-neutral-100">
          {paginatedSessions.map((session) => (
            <SessionRow key={session.id || Math.random()} session={session} />
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredSessions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
