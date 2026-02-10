interface TrackingPausedAlertProps {
  onResume: () => void;
}

export default function TrackingPausedAlert({
  onResume,
}: TrackingPausedAlertProps) {
  return (
    <div className="bg-warning-50 border-b border-warning-100">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center">
              <svg
                className="h-4 w-4 text-warning-600"
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
            <p className="text-sm font-semibold text-neutral-800">
              Monitoring is paused — webcam activity is not being recorded
            </p>
          </div>
          <button
            onClick={onResume}
            className="flex-shrink-0 px-4 py-1.5 text-sm font-semibold rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors duration-200"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
