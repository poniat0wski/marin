import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ConfidenceBadge, UpdateBadge } from "@/components/product-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductUpdates, getProducts } from "@/lib/data";
import { formatDate } from "@/lib/recommendation";

export default async function UpdatesPage() {
  const [updates, products] = await Promise.all([getProductUpdates(), getProducts()]);

  const byId = new Map(products.map((product) => [product.id, product]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Updates Feed"
        description="Daily log of added, changed, and removed recommendations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {updates.map((update) => {
            const product = byId.get(update.productId);
            return (
              <div key={update.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-slate-900">{product?.name ?? "Unknown product"}</p>
                  <UpdateBadge type={update.type} />
                </div>
                <p className="text-sm text-slate-700">{update.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(update.happenedAt)}</p>
                {update.previousConfidence && update.newConfidence ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ConfidenceBadge level={update.previousConfidence} />
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <ConfidenceBadge level={update.newConfidence} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
