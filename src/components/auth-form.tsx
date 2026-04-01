"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEMO_SELLER_CREDENTIALS,
  getDemoRoleForCredentials,
  setMockAuthSession,
} from "@/lib/mock-auth";
import { getSupabaseClient } from "@/lib/supabase";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const resolveRedirectTarget = () => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const nextParam = new URLSearchParams(window.location.search).get("next");
    if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
      return nextParam;
    }

    return "/dashboard";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const redirectTarget = resolveRedirectTarget();
    const supabase = getSupabaseClient();

    if (!supabase) {
      if (isLogin) {
        const role = getDemoRoleForCredentials(email, password);
        if (!role) {
          setStatus("Demo login failed. Check your email and password and try again.");
          setLoading(false);
          return;
        }

        setMockAuthSession({
          email: email.trim().toLowerCase(),
          role,
          loggedInAt: new Date().toISOString(),
        });

        setStatus("Demo login successful. Redirecting...");
        router.push(redirectTarget);
        setLoading(false);
        return;
      }

      setMockAuthSession({
        email: email.trim().toLowerCase() || DEMO_SELLER_CREDENTIALS.email,
        role: "seller",
        loggedInAt: new Date().toISOString(),
      });
      setStatus("Demo account created. Redirecting to dashboard...");
      router.push("/dashboard");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Login successful. Redirecting...");
        router.push(redirectTarget);
      }

      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    setStatus(
      error
        ? error.message
        : "Signup submitted. Check your inbox for confirmation if email verification is enabled.",
    );
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isLogin ? "Welcome back" : "Create account"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Sign in to access your daily ungating recommendations."
            : "Create your seller profile to get personalized recommendation scoring."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seller@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </Button>

          <p className="text-xs text-slate-500">
            {isLogin ? "No account yet? " : "Already have an account? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium text-indigo-700 hover:text-indigo-800"
            >
              {isLogin ? "Create one" : "Sign in"}
            </Link>
          </p>
        </form>

        {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

