import type { Session } from "../types/session";

interface SessionRowProps {
  session: Session;
}

export default function SessionRow({ session }: SessionRowProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const isRunning = session.status === "running";

  return (
    <tr className={isRunning ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"} >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-sm font-semibold text-green-700">Running</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="text-sm text-gray-600">Completed</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{session.app_name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{formatDate(session.start_time)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-600">
          {session.end_time ? formatDate(session.end_time) : (
            <span className="text-gray-400 italic">In progress...</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          {isRunning ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          ) : (
            <span className="text-gray-900 font-medium">{formatDuration(session.duration_secs)}</span>
          )}
        </div>
      </td>
    </tr>
  );
}

