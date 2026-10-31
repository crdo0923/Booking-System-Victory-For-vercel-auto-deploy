"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setStoredLastPath } from "@/lib/auth/demo-storage";

export function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      setStoredLastPath(pathname);
    }
  }, [pathname]);

  return null;
}
