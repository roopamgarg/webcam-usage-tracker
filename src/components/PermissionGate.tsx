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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasLogAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Full Disk Access Required</h1>
          <p className="text-gray-700 mb-6">
            To monitor webcam usage, this app needs Full Disk Access to read system logs.
            This permission allows the app to detect when applications access your camera.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">How to enable Full Disk Access:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Open <strong>System Settings</strong> (or System Preferences on older macOS)</li>
              <li>Go to <strong>Privacy & Security</strong></li>
              <li>Select <strong>Full Disk Access</strong></li>
              <li>Click the lock icon and enter your password</li>
              <li>Find <strong>Webcam Tracker</strong> in the list and enable it</li>
              <li>If the app isn't listed, click the <strong>+</strong> button and add it</li>
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
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            I've enabled Full Disk Access
          </button>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Welcome to Webcam Tracker</h1>
          <p className="text-gray-700 mb-6">
            This app monitors which applications use your webcam and when. All data is stored
            locally on your device—nothing is sent over the network.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">What this app does:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Tracks when applications start and stop using your webcam</li>
              <li>Records session duration and app names</li>
              <li>Stores all data locally on your device</li>
              <li>Allows you to export logs as CSV</li>
            </ul>
            <h2 className="font-semibold mt-4 mb-2">What this app does NOT do:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Capture video or images from your camera</li>
              <li>Send any data over the network</li>
              <li>Control your camera</li>
            </ul>
          </div>
          <button
            onClick={handleGrantConsent}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            I understand, start tracking
          </button>
        </div>
      </div>
    );
  }

  return null;
}

