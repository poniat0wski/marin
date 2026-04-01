"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MOCK_AUTH_EVENT, getMockAuthSession } from "@/lib/mock-auth";
import { getSupabaseClient } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

interface ClientSessionState {
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
  role: UserRole | null;
  source: "supabase" | "mock";
}

const INITIAL_SESSION_STATE: ClientSessionState = {
  loading: true,
  isAuthenticated: false,
  email: null,
  role: null,
  source: "mock",
};

function roleFromSupabaseSession(session: Session | null): UserRole | null {
  const role = session?.user?.user_metadata?.role;
  if (role === "admin" || role === "seller") {
    return role;
  }
  return null;
}

function GateFallback({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-6 text-sm text-slate-600 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
      {message}
    </div>
  );
}

export function useClientSessionState() {
  const [state, setState] = useState<ClientSessionState>(INITIAL_SESSION_STATE);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    if (supabase) {
      const applySupabaseSession = (session: Session | null) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          isAuthenticated: Boolean(session),
          email: session?.user?.email ?? null,
          role: roleFromSupabaseSession(session),
          source: "supabase",
        });
      };

      supabase.auth.getSession().then(({ data }) => {
        applySupabaseSession(data.session);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        applySupabaseSession(session);
      });

      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    }

    const syncMockSession = () => {
      if (!active) {
        return;
      }

      const session = getMockAuthSession();

      setState({
        loading: false,
        isAuthenticated: Boolean(session),
        email: session?.email ?? null,
        role: session?.role ?? null,
        source: "mock",
      });
    };

    syncMockSession();
    window.addEventListener(MOCK_AUTH_EVENT, syncMockSession);
    window.addEventListener("storage", syncMockSession);

    return () => {
      active = false;
      window.removeEventListener(MOCK_AUTH_EVENT, syncMockSession);
      window.removeEventListener("storage", syncMockSession);
    };
  }, []);

  return state;
}

export function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const session = useClientSessionState();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (session.loading || session.isAuthenticated) {
      return;
    }

    const nextPath = pathname && pathname !== "/" ? pathname : "/dashboard";
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router, session.isAuthenticated, session.loading]);

  if (session.loading) {
    return <GateFallback message="Checking your session..." />;
  }

  if (!session.isAuthenticated) {
    return <GateFallback message="Redirecting to login..." />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const session = useClientSessionState();
  const router = useRouter();

  useEffect(() => {
    if (session.loading) {
      return;
    }

    if (!session.isAuthenticated) {
      router.replace("/login?next=%2Fadmin");
      return;
    }

    if (session.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [router, session.isAuthenticated, session.loading, session.role]);

  if (session.loading) {
    return <GateFallback message="Verifying admin access..." />;
  }

  if (!session.isAuthenticated) {
    return <GateFallback message="Redirecting to login..." />;
  }

  if (session.role !== "admin") {
    return <GateFallback message="Admin access required. Redirecting to dashboard..." />;
  }

  return <>{children}</>;
}
