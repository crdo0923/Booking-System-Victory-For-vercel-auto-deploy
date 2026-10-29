export const DEMO_USER_STORAGE_KEY = "vr_demo_user";

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
