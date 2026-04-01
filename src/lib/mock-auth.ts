import type { UserRole } from "@/lib/types";

export type MockUserRole = UserRole;

export interface MockAuthSession {
  email: string;
  role: MockUserRole;
  loggedInAt: string;
}

export const MOCK_AUTH_STORAGE_KEY = "marin_mock_auth_session_v1";
export const MOCK_AUTH_EVENT = "marin-auth-change";

export const DEMO_ADMIN_CREDENTIALS = {
  email: "admin@marin.local",
  password: "MarinAdmin123!",
} as const;

export const DEMO_SELLER_CREDENTIALS = {
  email: "seller@marin.local",
  password: "MarinSeller123!",
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getMockAuthSession(): MockAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MockAuthSession>;
    if (
      typeof parsed.email !== "string" ||
      (parsed.role !== "admin" && parsed.role !== "seller") ||
      typeof parsed.loggedInAt !== "string"
    ) {
      return null;
    }

    return {
      email: parsed.email,
      role: parsed.role,
      loggedInAt: parsed.loggedInAt,
    };
  } catch {
    return null;
  }
}

export function setMockAuthSession(session: MockAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(MOCK_AUTH_EVENT));
}

export function clearMockAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(MOCK_AUTH_EVENT));
}

export function getDemoRoleForCredentials(
  email: string,
  password: string,
): MockUserRole | null {
  const normalized = normalizeEmail(email);

  if (
    normalized === DEMO_ADMIN_CREDENTIALS.email &&
    password === DEMO_ADMIN_CREDENTIALS.password
  ) {
    return "admin";
  }

  if (
    normalized === DEMO_SELLER_CREDENTIALS.email &&
    password === DEMO_SELLER_CREDENTIALS.password
  ) {
    return "seller";
  }

  return null;
}
