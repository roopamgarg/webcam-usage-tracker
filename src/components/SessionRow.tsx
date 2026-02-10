import AppIcon from "./AppIcon";
import { openCameraSettings } from "../lib/commands";
import type { Session } from "../types/session";

interface SessionRowProps {
  session: Session;
}

export default function SessionRow({ session }: SessionRowProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "—";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
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
    <div className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-neutral-50 transition-colors duration-150">
      {/* Application */}
      <div className="col-span-12 sm:col-span-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <AppIcon appName={session.app_name} size={40} />
            {isRunning && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sage-400 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {session.app_name}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {session.app_name.toLowerCase().replace(/\s+/g, ".")}
            </p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="col-span-6 sm:col-span-3">
        <p className="text-sm font-medium text-neutral-800">
          {formatDate(session.start_time)}
        </p>
        <p className="text-xs text-neutral-500">{formatTime(session.start_time)}</p>
      </div>

      {/* Duration */}
      <div className="col-span-3 sm:col-span-2">
        {isRunning ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-400"></span>
            </span>
            Live
          </span>
        ) : (
          <span className="text-sm font-medium text-neutral-800 font-mono">
            {formatDuration(session.duration_secs)}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="col-span-3 sm:col-span-1">
        {isRunning ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-sage-50 text-sage-600">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-neutral-100 text-neutral-500">
            Ended
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="hidden sm:flex col-span-2 justify-end">
        <button
          onClick={handleOpenCameraSettings}
          title={`Opens System Settings → Camera to manage access for ${session.app_name}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-neutral-600 border border-neutral-200 hover:text-error-600 hover:border-error-100 hover:bg-error-50 transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          Manage
        </button>
      </div>
    </div>
  );
}
