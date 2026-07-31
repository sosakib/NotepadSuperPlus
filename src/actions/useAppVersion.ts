import { useEffect, useState } from "react";

/** The app version from the Rust core (Cargo manifest), e.g. "0.1.0".
 * Falls back to the build-time package version in the browser dev harness. */
export function useAppVersion(): string {
  const [version, setVersion] = useState("0.1.0");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke<string>("app_version");
        if (!cancelled) setVersion(v);
      } catch {
        /* browser dev fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
