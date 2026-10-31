export const DEMO_USER_STORAGE_KEY = "vr_demo_user";
export const LAST_ACTIVE_PATH_KEY = "vr_last_active_path";

export function getStoredDemoUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DEMO_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredDemoUser(email: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, email);
  } catch {
    // ignore localStorage errors (e.g. private browsing restrictions)
  }
}

export function clearStoredDemoUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVE_PATH_KEY);
  } catch {
    // ignore localStorage errors
  }
}

export function getStoredLastPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const path = localStorage.getItem(LAST_ACTIVE_PATH_KEY);
    if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
    return path;
  } catch {
    return null;
  }
}

export function setStoredLastPath(path: string): void {
  if (typeof window === "undefined") return;
  try {
    if (path.startsWith("/login") || path.startsWith("/api") || path === "/") return;
    localStorage.setItem(LAST_ACTIVE_PATH_KEY, path);
  } catch {
    // ignore localStorage errors
  }
}

export function clearStoredLastPath(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_ACTIVE_PATH_KEY);
  } catch {
    // ignore localStorage errors
  }
}

export function isIframeEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // if cross-origin blocked window.top access, we are in an iframe
  }
}
