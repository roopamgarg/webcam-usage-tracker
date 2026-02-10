import type { Session } from "../types/session";

interface StatsCardsProps {
  sessions: Session[];
}

export default function StatsCards({ sessions }: StatsCardsProps) {
  const totalSessions = sessions.length;

  const activeSessions = sessions.filter((s) => s.status === "running").length;

  const avgDurationSecs = (() => {
    const completed = sessions.filter(
      (s) => s.status === "completed" && s.duration_secs !== null
    );
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, s) => sum + (s.duration_secs || 0), 0);
    return Math.round(total / completed.length);
  })();

  const formatAvgDuration = (seconds: number) => {
    if (seconds === 0) return "—";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const lastAccess = (() => {
    if (sessions.length === 0) return "—";
    const running = sessions.find((s) => s.status === "running");
    if (running) return "Now";
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    const latest = sorted[0];
    const latestTime = new Date(
      latest.end_time || latest.start_time
    ).getTime();
    const diffMs = Date.now() - latestTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  })();

  const stats = [
    {
      label: "Total Sessions",
      value: totalSessions.toLocaleString(),
      icon: (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-1.5l3.293 3.293A1 1 0 0019 14.086V5.914a1 1 0 00-1.707-.707L14 8.5V7a2 2 0 00-2-2H4z" />
          </svg>
        </div>
      ),
    },
    {
      label: "Active Now",
      value: activeSessions.toString(),
      icon: (
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ),
    },
    {
      label: "Avg Duration",
      value: formatAvgDuration(avgDurationSecs),
      icon: (
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ),
    },
    {
      label: "Last Access",
      value: lastAccess,
      icon: (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {stat.value}
            </p>
          </div>
          {stat.icon}
        </div>
      ))}
    </div>
  );
}

