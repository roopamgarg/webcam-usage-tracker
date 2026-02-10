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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

