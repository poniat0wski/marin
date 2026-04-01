import { RequireSignedIn } from "@/components/auth-gates";
import { AppShell } from "@/components/app-shell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSignedIn>
      <AppShell>{children}</AppShell>
    </RequireSignedIn>
  );
}
