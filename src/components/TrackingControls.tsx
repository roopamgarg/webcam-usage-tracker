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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
        isTracking
          ? "bg-neutral-900 text-white hover:bg-neutral-800"
          : "bg-sage-400 text-white hover:bg-sage-500 shadow-sage-sm hover:shadow-sage-md"
      }`}
    >
      {isTracking ? (
        <>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Pause
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Resume
        </>
      )}
    </button>
  );
}
