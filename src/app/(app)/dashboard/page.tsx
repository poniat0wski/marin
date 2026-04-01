import Link from "next/link";

import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { PageHeader } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { ConfidenceBadge, RiskBadge, UngatingBadge, UpdateBadge } from "@/components/product-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProducts, getProductUpdates, getUserPreferences } from "@/lib/data";
import { formatDate, rankProducts } from "@/lib/recommendation";

export default async function DashboardPage() {
  const [products, updates, preferences] = await Promise.all([
    getProducts(),
    getProductUpdates(),
    getUserPreferences(),
  ]);

  const activeProducts = products.filter((product) => product.active);
  const ranked = rankProducts(activeProducts, preferences).slice(0, 4);
  const recentlyUpdated = updates.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Daily personalized recommendations with confidence, risk, and supplier context."
      />

      <LegalDisclaimer />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Active recommendations</p>
            <p className="text-2xl font-bold text-slate-900">{activeProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">New in last 24h</p>
            <p className="text-2xl font-bold text-slate-900">
              {activeProducts.filter((product) => product.updateType === "new").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">High confidence</p>
            <p className="text-2xl font-bold text-slate-900">
              {activeProducts.filter((product) => product.confidence === "high").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Profile budget range</p>
            <p className="text-2xl font-bold text-slate-900">
              ${preferences.budgetMin} - ${preferences.budgetMax}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top personalized recommendations</CardTitle>
            <Button asChild size="sm" variant="secondary">
              <Link href="/recommendations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranked.length > 0 ? (
              ranked.map((item) => (
                <div
                  key={item.product.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <ProductImage product={item.product} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {item.product.brand} - {item.product.category} - ASIN {item.product.asin}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <UngatingBadge type={item.product.ungatingType} />
                        <ConfidenceBadge level={item.product.confidence} />
                        <RiskBadge level={item.product.risk} />
                        <UpdateBadge type={item.product.updateType} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 lg:min-w-[340px]">
                    <p>
                      <span className="text-slate-500">Supplier:</span> {item.product.supplier}
                    </p>
                    <p>
                      <span className="text-slate-500">Qty:</span> {item.product.estimatedQuantity}
                    </p>
                    <p>
                      <span className="text-slate-500">Est. spend:</span> $
                      {item.product.priceEstimate.toFixed(2)}
                    </p>
                    <p>
                      <span className="text-slate-500">Updated:</span> {formatDate(item.product.lastUpdated)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end">
                    <Badge variant="neutral">Score {Math.round(item.score)}</Badge>
                    <Button asChild size="sm">
                      <Link href={`/recommendations/${item.product.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No active recommendations available.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent feed updates</CardTitle>
            <CardDescription>Transparency log for new, changed, and removed recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentlyUpdated.map((update) => (
              <div
                key={update.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{update.summary}</p>
                  <p className="text-xs text-slate-500">{formatDate(update.happenedAt)}</p>
                </div>
                <UpdateBadge type={update.type} />
              </div>
            ))}
            <Button asChild size="sm" variant="ghost">
              <Link href="/updates">Open full updates feed</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
