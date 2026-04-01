import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900">
        ? Back to landing
      </Link>
      <AuthForm mode="signup" />
    </main>
  );
}
