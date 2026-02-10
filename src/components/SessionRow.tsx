import AppIcon from "./AppIcon";
import { openCameraSettings } from "../lib/commands";
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

  const handleOpenCameraSettings = async () => {
    try {
      await openCameraSettings();
    } catch (error) {
      console.error("Failed to open camera settings:", error);
    }
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
        <div className="flex items-center gap-2.5">
          <AppIcon appName={session.app_name} size={28} />
          <span className="text-sm font-medium text-gray-900">{session.app_name}</span>
        </div>
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
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button
          onClick={handleOpenCameraSettings}
          title={`Opens System Settings → Camera where you can toggle off access for ${session.app_name}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-red-50 hover:text-red-700 border border-gray-200 hover:border-red-200 transition-colors duration-150"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          Revoke in Settings
        </button>
      </td>
    </tr>
  );
}

