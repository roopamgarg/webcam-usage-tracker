import { useState, useEffect } from "react";
import PermissionGate from "./components/PermissionGate";
import Dashboard from "./components/Dashboard";
import { checkConsent } from "./lib/commands";

function App() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkUserConsent() {
      try {
        const consent = await checkConsent();
        setHasConsent(consent);
      } catch (error) {
        console.error("Error checking consent:", error);
        setHasConsent(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkUserConsent();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-sage-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return <PermissionGate onConsent={() => setHasConsent(true)} />;
  }

  return <Dashboard />;
}

export default App;
