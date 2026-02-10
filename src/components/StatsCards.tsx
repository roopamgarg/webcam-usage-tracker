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
      sublabel: "all time",
      iconBg: "bg-sage-50",
      iconColor: "text-sage-400",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-1.5l3.293 3.293A1 1 0 0019 14.086V5.914a1 1 0 00-1.707-.707L14 8.5V7a2 2 0 00-2-2H4z" />
        </svg>
      ),
    },
    {
      label: "Active Now",
      value: activeSessions.toString(),
      sublabel: activeSessions > 0 ? "cameras in use" : "no active cameras",
      iconBg: "bg-success-50",
      iconColor: "text-success-500",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: "Avg Duration",
      value: formatAvgDuration(avgDurationSecs),
      sublabel: "per session",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: "Last Access",
      value: lastAccess,
      sublabel: "most recent",
      iconBg: "bg-warning-50",
      iconColor: "text-warning-500",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-default"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg ${stat.iconBg} ${stat.iconColor} flex items-center justify-center`}>
              {stat.icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {stat.value}
          </p>
          <p className="text-sm font-medium text-neutral-600 mt-0.5">
            {stat.label}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {stat.sublabel}
          </p>
        </div>
      ))}
    </div>
  );
}
