import { pauseTracking, resumeTracking } from "../lib/commands";

interface TrackingControlsProps {
  isTracking: boolean;
  onTrackingChange: () => void;
}

export default function TrackingControls({
  isTracking,
  onTrackingChange,
}: TrackingControlsProps) {
  const handleToggle = async () => {
    try {
      if (isTracking) {
        await pauseTracking();
      } else {
        await resumeTracking();
      }
      onTrackingChange();
    } catch (error) {
      console.error("Error toggling tracking:", error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
        <div className="relative">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isTracking ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          {isTracking && (
            <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {isTracking ? "Active" : "Paused"}
        </span>
      </div>
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
          isTracking
            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
        }`}
      >
        {isTracking ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

