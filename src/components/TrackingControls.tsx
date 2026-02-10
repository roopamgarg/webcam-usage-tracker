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
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm ${
        isTracking
          ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
          : "bg-green-500 text-white hover:bg-green-600"
      }`}
    >
      {isTracking ? (
        <>
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Pause Monitoring
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Resume Monitoring
        </>
      )}
    </button>
  );
}
