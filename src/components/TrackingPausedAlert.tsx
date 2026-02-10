interface TrackingPausedAlertProps {
  onResume: () => void;
}

export default function TrackingPausedAlert({
  onResume,
}: TrackingPausedAlertProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.345 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-amber-800">
              Tracking is paused — webcam activity is not being recorded.
            </p>
          </div>
          <button
            onClick={onResume}
            className="flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors duration-150 shadow-sm"
          >
            Resume Tracking
          </button>
        </div>
      </div>
    </div>
  );
}

