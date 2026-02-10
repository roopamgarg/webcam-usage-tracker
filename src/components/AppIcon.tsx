import { useState, useEffect } from "react";
import { getAppIcon } from "../lib/commands";

// Module-level cache so icons are fetched only once per app across all rows
const iconCache = new Map<string, string | null>();

interface AppIconProps {
  appName: string;
  size?: number;
}

export default function AppIcon({ appName, size = 40 }: AppIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(
    iconCache.get(appName) ?? null
  );
  const [loaded, setLoaded] = useState(iconCache.has(appName));

  useEffect(() => {
    if (iconCache.has(appName)) {
      setIconUrl(iconCache.get(appName) ?? null);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    getAppIcon(appName).then((url) => {
      if (!cancelled) {
        iconCache.set(appName, url);
        setIconUrl(url);
        setLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) {
        iconCache.set(appName, null);
        setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appName]);

  if (!loaded) {
    return (
      <div
        className="rounded-lg bg-neutral-100 animate-pulse flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!iconUrl) {
    return (
      <div
        className="rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          className="text-neutral-400"
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-1.5l3.293 3.293A1 1 0 0019 14.086V5.914a1 1 0 00-1.707-.707L14 8.5V7a2 2 0 00-2-2H4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={`${appName} icon`}
      className="rounded-lg flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
