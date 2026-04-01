"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  FileClock,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ShoppingBasket,
} from "lucide-react";

import { useClientSessionState } from "@/components/auth-gates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recommendations", label: "Recommendations", icon: ShoppingBasket },
  { href: "/saved", label: "Watchlist", icon: Bookmark },
  { href: "/updates", label: "Updates", icon: FileClock },
  { href: "/settings", label: "Profile", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useClientSessionState();
  const visibleNavItems = navItems.filter(
    (item) => item.href !== "/admin" || session.role === "admin",
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[250px_1fr] lg:px-6">
        <aside className="h-fit rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <Image
                src="/marin-icon-soft.png"
                alt="Marin icon"
                width={18}
                height={18}
                className="aspect-square rounded-sm object-cover"
                quality={100}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Marin
              </p>
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Seller Dashboard</h2>
          </div>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 text-xs text-indigo-900">
            <p className="font-semibold">Daily refresh enabled</p>
            <p>Recommendations update every 24 hours and log changes in the feed.</p>
          </div>

          <Button asChild size="sm" className="mt-5 w-full">
            <Link href="/">Back to landing</Link>
          </Button>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
