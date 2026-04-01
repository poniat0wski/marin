"use client";

import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUser, Product } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminConsole({
  seedProducts,
  seedUsers,
}: {
  seedProducts: Product[];
  seedUsers: AdminUser[];
}) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [users, setUsers] = useState<AdminUser[]>(seedUsers);
  const [imageSyncLoading, setImageSyncLoading] = useState(false);
  const [imageSyncLimit, setImageSyncLimit] = useState("50");
  const [imageSyncOnlyMissing, setImageSyncOnlyMissing] = useState(true);
  const [imageSyncStatus, setImageSyncStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    asin: "",
    imageUrl: "",
    brand: "",
    category: "",
    supplier: "",
  });

  const activeCount = useMemo(() => products.filter((product) => product.active).length, [products]);
  const activeUserCount = useMemo(
    () => users.filter((user) => user.status === "active").length,
    [users],
  );

  const syncAmazonImages = async () => {
    const parsedLimit = Number.parseInt(imageSyncLimit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(200, parsedLimit)) : 50;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setImageSyncStatus(
        "Amazon image sync requires Supabase auth and PA-API credentials. Configure env vars first.",
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setImageSyncStatus("Admin session not found. Please log in again.");
      return;
    }

    setImageSyncLoading(true);
    setImageSyncStatus("Syncing real product images from Amazon PA-API...");

    try {
      const response = await fetch("/api/admin/sync-product-images", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          limit,
          onlyMissing: imageSyncOnlyMissing,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        scanned?: number;
        requestedAsins?: number;
        foundImages?: number;
        updated?: number;
        unresolvedAsins?: string[];
        paapiErrors?: string[];
        updatedProducts?: Array<{ id: string; imageUrl: string }>;
      };

      if (!response.ok) {
        setImageSyncStatus(result.error ?? "Amazon image sync failed.");
        return;
      }

      const updatedProducts = result.updatedProducts ?? [];
      if (updatedProducts.length > 0) {
        const updatedById = new Map(updatedProducts.map((entry) => [entry.id, entry.imageUrl]));
        setProducts((current) =>
          current.map((product) =>
            updatedById.has(product.id)
              ? {
                  ...product,
                  imageUrl: updatedById.get(product.id),
                }
              : product,
          ),
        );
      }

      const unresolvedCount = result.unresolvedAsins?.length ?? 0;
      const errorCount = result.paapiErrors?.length ?? 0;
      setImageSyncStatus(
        `Amazon image sync complete. Scanned ${result.scanned ?? 0} products, requested ${result.requestedAsins ?? 0} ASINs, found ${result.foundImages ?? 0} images, updated ${result.updated ?? 0}. Unresolved: ${unresolvedCount}. API errors: ${errorCount}.`,
      );
    } catch {
      setImageSyncStatus("Amazon image sync failed due to a network or server error.");
    } finally {
      setImageSyncLoading(false);
    }
  };

  const addProduct = () => {
    if (!form.name || !form.asin) {
      return;
    }

    const now = new Date().toISOString();
    const next: Product = {
      id: `manual-${Date.now()}`,
      name: form.name,
      asin: form.asin,
      imageUrl: form.imageUrl.trim() || undefined,
      brand: form.brand || "Unknown",
      category: form.category || "Unknown",
      supplier: form.supplier || "Unknown",
      supplierUrl: "",
      ungatingType: "ten_unit",
      estimatedQuantity: 10,
      priceEstimate: 0,
      confidence: "medium",
      risk: "medium",
      lastUpdated: now,
      lastValidation: now,
      invoiceNotes: "Pending admin validation",
      supplierNotes: "Pending supplier verification",
      recommendationReason: "Added manually in admin panel",
      notes: "",
      updateType: "new",
      active: true,
    };

    setProducts((current) => [next, ...current]);
    setForm({ name: "", asin: "", imageUrl: "", brand: "", category: "", supplier: "" });
  };

  const setConfidence = (productId: string, confidence: Product["confidence"]) => {
    const now = new Date().toISOString();

    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              confidence,
              updateType: "updated",
              lastUpdated: now,
            }
          : product,
      ),
    );
  };

  const toggleActive = (productId: string) => {
    const now = new Date().toISOString();

    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              active: !product.active,
              updateType: product.active ? "removed" : "updated",
              lastUpdated: now,
            }
          : product,
      ),
    );
  };

  const setUserRole = (userId: string, role: AdminUser["role"]) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              role,
            }
          : user,
      ),
    );
  };

  const toggleUserStatus = (userId: string) => {
    const now = new Date().toISOString();

    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: user.status === "active" ? "suspended" : "active",
              lastActive: now,
            }
          : user,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin summary</CardTitle>
          <CardDescription>
            Manage recommendation quality. In production this panel should be connected to Supabase
            with role-based access controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Total products</p>
              <p className="text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Active recommendations</p>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Paused/removed</p>
              <p className="text-2xl font-bold text-slate-900">{products.length - activeCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium text-slate-900">Amazon image sync (PA-API)</p>
            <div className="grid gap-2 md:grid-cols-[140px_220px_1fr]">
              <div className="space-y-1">
                <label className="text-xs text-slate-600">Max products</label>
                <Input
                  value={imageSyncLimit}
                  onChange={(event) => setImageSyncLimit(event.target.value)}
                  inputMode="numeric"
                  placeholder="50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600">Scope</label>
                <Select
                  value={imageSyncOnlyMissing ? "missing" : "all"}
                  onChange={(event) => setImageSyncOnlyMissing(event.target.value === "missing")}
                >
                  <option value="missing">Only missing images</option>
                  <option value="all">All active products</option>
                </Select>
              </div>
              <div className="flex items-end justify-start">
                <Button type="button" onClick={syncAmazonImages} disabled={imageSyncLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  {imageSyncLoading ? "Syncing images..." : "Sync Amazon images"}
                </Button>
              </div>
            </div>

            {imageSyncStatus ? (
              <p className="mt-2 text-xs text-slate-700">{imageSyncStatus}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User access summary</CardTitle>
          <CardDescription>
            Admin-only visibility for account status and access control state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Total users</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Active users</p>
            <p className="text-2xl font-bold text-slate-900">{activeUserCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Suspended users</p>
            <p className="text-2xl font-bold text-slate-900">{users.length - activeUserCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add candidate product</CardTitle>
          <CardDescription>
            Quick add form for manual review workflow before recommendation approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="ASIN"
            value={form.asin}
            onChange={(event) => setForm((current) => ({ ...current, asin: event.target.value }))}
          />
          <Input
            placeholder="Brand"
            value={form.brand}
            onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
          />
          <Input
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
          />
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <Input
            placeholder="Supplier"
            value={form.supplier}
            onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}
          />
          <div className="flex items-center justify-end">
            <Button onClick={addProduct} type="button">
              Add recommendation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User access controls</CardTitle>
          <CardDescription>
            View user data and manage seller/admin role assignments. Changes are local UI state for
            MVP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Watchlist</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{user.email}</p>
                    <p className="text-xs text-slate-500">Joined {formatDateLabel(user.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onChange={(event) => setUserRole(user.id, event.target.value as AdminUser["role"])}
                    >
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "high" : "low"}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>{user.marketplace}</TableCell>
                  <TableCell className="capitalize">{user.experienceLevel}</TableCell>
                  <TableCell>{user.watchlistCount}</TableCell>
                  <TableCell>{formatDateLabel(user.lastActive)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={user.status === "active" ? "danger" : "secondary"}
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      {user.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Adjust confidence and approve/reject availability. Edits here are local UI state for MVP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">ASIN {product.asin}</p>
                  </TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "high" : "low"}>
                      {product.active ? "approved" : "rejected"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={product.confidence}
                      onChange={(event) =>
                        setConfidence(product.id, event.target.value as Product["confidence"])
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={product.active ? "danger" : "secondary"}
                      onClick={() => toggleActive(product.id)}
                    >
                      {product.active ? "Reject" : "Re-approve"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-900">Admin note template</p>
            <Textarea placeholder="Example: Invoice accepted from supplier verification batch on 2026-04-01." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
