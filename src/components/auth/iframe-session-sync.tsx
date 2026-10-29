"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredDemoUser, isIframeEnvironment } from "@/lib/auth/demo-storage";

export function IframeSessionSync({ next = "/portal" }: { next?: string }) {
  const router = useRouter();
  const [rehydrating, setRehydrating] = useState(() => {
    return isIframeEnvironment() && Boolean(getStoredDemoUser());
  });

  useEffect(() => {
    if (!isIframeEnvironment()) return;

    const storedEmail = getStoredDemoUser();
    if (!storedEmail) return;

    let isMounted = true;

    async function rehydrate() {
      try {
        const res = await fetch("/api/auth/demo-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: storedEmail }),
        });

        if (res.ok && isMounted) {
          router.replace(next || "/portal");
          router.refresh();
        } else if (isMounted) {
          setRehydrating(false);
        }
      } catch {
        if (isMounted) setRehydrating(false);
      }
    }

    rehydrate();

    return () => {
      isMounted = false;
    };
  }, [next, router]);

  if (!rehydrating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-line bg-canvas p-3 text-xs text-muted"
    >
      <span className="size-2 animate-pulse rounded-full bg-brand" />
      <span>Restoring session in frame…</span>
    </div>
  );
}
