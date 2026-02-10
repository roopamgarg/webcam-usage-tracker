import { useState, useEffect } from "react";
import { checkConsent, grantConsent, checkLogAccess } from "../lib/commands";

interface PermissionGateProps {
  onConsent: () => void;
}

export default function PermissionGate({ onConsent }: PermissionGateProps) {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [hasLogAccess, setHasLogAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const consent = await checkConsent();
        const logAccess = await checkLogAccess();
        setHasConsent(consent);
        setHasLogAccess(logAccess);
      } catch (error) {
        console.error("Error checking permissions:", error);
        setHasConsent(false);
        setHasLogAccess(false);
      } finally {
        setIsChecking(false);
      }
    }
    checkPermissions();
  }, []);

  const handleGrantConsent = async () => {
    try {
      await grantConsent();
      setHasConsent(true);
      if (hasLogAccess) {
        onConsent();
      }
    } catch (error) {
      console.error("Error granting consent:", error);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-sage-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasLogAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white px-6">
        <div className="max-w-lg w-full">
          {/* Icon */}
          <div className="w-16 h-16 bg-sage-400 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sage-md">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-neutral-900 text-center mb-2 tracking-tight">
            Full Disk Access Required
          </h1>
          <p className="text-neutral-500 text-center mb-8 leading-relaxed">
            To monitor webcam usage, this app needs Full Disk Access to read system logs.
          </p>

          {/* Steps */}
          <div className="bg-neutral-100 rounded-2xl p-6 mb-8">
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-widest mb-4">
              How to enable
            </h2>
            <ol className="space-y-3">
              {[
                "Open System Settings",
                "Go to Privacy & Security",
                "Select Full Disk Access",
                "Find Webcam Tracker and toggle it on",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-900 shadow-sm">
                    {i + 1}
                  </span>
                  <span className="text-sm text-neutral-600 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={() => {
              setHasLogAccess(null);
              setIsChecking(true);
              checkLogAccess().then((access) => {
                setHasLogAccess(access);
                setIsChecking(false);
                if (access && hasConsent) {
                  onConsent();
                }
              });
            }}
            className="w-full py-3.5 px-6 bg-sage-400 text-white rounded-xl font-bold text-base hover:bg-sage-500 transition-all duration-200 shadow-sage-sm hover:shadow-sage-md"
          >
            I've enabled Full Disk Access
          </button>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white px-6">
        <div className="max-w-lg w-full">
          {/* Icon */}
          <div className="w-16 h-16 bg-sage-400 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sage-md">
            <svg className="w-8 h-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-1.5l3.293 3.293A1 1 0 0019 14.086V5.914a1 1 0 00-1.707-.707L14 8.5V7a2 2 0 00-2-2H4z" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-neutral-900 text-center mb-2 tracking-tight">
            Welcome to Webcam Tracker
          </h1>
          <p className="text-neutral-500 text-center mb-8 leading-relaxed">
            Monitor which applications use your webcam. All data stays on your device.
          </p>

          {/* Feature cards */}
          <div className="space-y-3 mb-8">
            <div className="bg-neutral-100 rounded-xl p-5">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-widest mb-3">
                What this app does
              </h3>
              <ul className="space-y-2.5">
                {[
                  "Tracks when apps start and stop using your webcam",
                  "Records session duration and app names",
                  "Stores all data locally on your device",
                  "Export your logs as CSV anytime",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-sage-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-neutral-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-neutral-100 rounded-xl p-5">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-widest mb-3">
                What this app does NOT do
              </h3>
              <ul className="space-y-2.5">
                {[
                  "Capture video or images from your camera",
                  "Send any data over the network",
                  "Control your camera directly",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-neutral-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleGrantConsent}
            className="w-full py-3.5 px-6 bg-sage-400 text-white rounded-xl font-bold text-base hover:bg-sage-500 transition-all duration-200 shadow-sage-sm hover:shadow-sage-md"
          >
            Get Started
          </button>

          <p className="text-xs text-neutral-400 text-center mt-4">
            By continuing, you agree to let this app monitor your webcam usage.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
