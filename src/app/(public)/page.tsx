"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LogOut,
  Rocket,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MOCK_AUTH_EVENT,
  type MockUserRole,
  clearMockAuthSession,
  getMockAuthSession,
} from "@/lib/mock-auth";
import { getSupabaseClient } from "@/lib/supabase";

interface LandingSessionState {
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
  role: MockUserRole | null;
  source: "supabase" | "mock";
}

const featureItems = [
  "Daily-updated recommendation list",
  "Auto-ungate and 10-unit product coverage",
  "Confidence and risk indicators on every item",
  "Admin controls for recommendation quality",
];

function roleFromSupabaseSession(session: Session | null): MockUserRole | null {
  const role = session?.user?.user_metadata?.role;
  if (role === "admin" || role === "seller") {
    return role;
  }
  return null;
}

export default function LandingPage() {
  const [sessionState, setSessionState] = useState<LandingSessionState>({
    loading: true,
    isAuthenticated: false,
    email: null,
    role: null,
    source: "mock",
  });

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    if (supabase) {
      const applySupabaseSession = (session: Session | null) => {
        if (!active) {
          return;
        }

        setSessionState({
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

    const syncMock = () => {
      if (!active) {
        return;
      }

      const mockSession = getMockAuthSession();
      setSessionState({
        loading: false,
        isAuthenticated: Boolean(mockSession),
        email: mockSession?.email ?? null,
        role: mockSession?.role ?? null,
        source: "mock",
      });
    };

    syncMock();
    window.addEventListener(MOCK_AUTH_EVENT, syncMock);
    window.addEventListener("storage", syncMock);

    return () => {
      active = false;
      window.removeEventListener(MOCK_AUTH_EVENT, syncMock);
      window.removeEventListener("storage", syncMock);
    };
  }, []);

  const handleLogout = async () => {
    if (sessionState.source === "supabase") {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } else {
      clearMockAuthSession();
      setSessionState((current) => ({
        ...current,
        isAuthenticated: false,
        email: null,
        role: null,
      }));
    }
  };

  const isLoggedIn = sessionState.isAuthenticated;

  return (
    <div className="gradient-hero min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Image
            src="/marin-icon-soft.png"
            alt="Marin icon"
            width={24}
            height={24}
            className="aspect-square rounded-md object-cover"
            quality={100}
          />
          Marin
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/faq" className="hover:text-slate-900">
            FAQ
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/settings"
                className="rounded-md border border-slate-200 bg-white/70 px-2 py-1 font-medium text-slate-700 hover:text-slate-900"
              >
                {sessionState.email ?? "Profile"}
              </Link>
              <Button size="sm" variant="secondary" onClick={handleLogout} type="button">
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-slate-900">
                Login
              </Link>
              <Button asChild size="sm" className="text-white hover:text-white">
                <Link href="/signup">Start free</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.2fr_1fr] lg:pt-12">
        <section className="space-y-6">
          <Badge variant="info">Amazon seller decision support</Badge>

          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            {isLoggedIn
              ? "Welcome back. Continue with your latest ungating opportunities."
              : "Find promising ungating products without false guarantees."}
          </h1>

          <p className="max-w-2xl text-lg text-slate-600">
            Personalized daily recommendations for new sellers, built to reduce guesswork with
            supplier context, invoice quality notes, and risk visibility.
          </p>

          <div className="inline-flex max-w-2xl items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Ungating approval is never guaranteed. Marin is a decision-support tool only.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isLoggedIn ? (
              <>
                <Button asChild size="lg" className="glow">
                  <Link href="/dashboard">
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/recommendations">View recommendations</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="glow text-white hover:text-white">
                  <Link href="/login">
                    Login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/signup">Start free</Link>
                </Button>
              </>
            )}
          </div>

          {sessionState.loading ? (
            <p className="text-sm text-slate-500">Checking session status...</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {featureItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-xl border border-white/80 bg-white/75 p-3 backdrop-blur"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <Card className="border-indigo-100/80 bg-white/80">
            <CardHeader>
              <CardTitle>How this helps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Daily recommendation refresh
                </p>
                <p>
                  Products are marked as new, updated, or removed every day with last updated
                  timestamps.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Risk-aware decisions
                </p>
                <p>
                  Every suggestion includes confidence level, risk signals, and invoice expectations.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                  <Rocket className="h-4 w-4 text-emerald-600" />
                  Built for action
                </p>
                <p>
                  Save watchlist candidates, compare options fast, and review a transparent updates
                  feed.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
