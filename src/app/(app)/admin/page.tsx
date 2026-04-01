"use client";

import { useEffect, useState } from "react";

import { AdminConsole } from "@/components/admin-console";
import { RequireAdmin } from "@/components/auth-gates";
import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { PageHeader } from "@/components/page-header";
import { getAdminUsers, getProducts } from "@/lib/data";
import type { AdminUser, Product } from "@/lib/types";

export default function AdminPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getProducts(), getAdminUsers()]).then(([nextProducts, nextUsers]) => {
      if (!active) {
        return;
      }

      setProducts(nextProducts);
      setUsers(nextUsers);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Admin Panel"
          description="Manage recommendation quality, user access, and review decisions from one control surface."
        />

        <LegalDisclaimer />

        {products && users ? (
          <AdminConsole seedProducts={products} seedUsers={users} />
        ) : (
          <div className="rounded-2xl border border-white/70 bg-white/85 p-6 text-sm text-slate-600 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
            Loading admin data...
          </div>
        )}
      </div>
    </RequireAdmin>
  );
}
