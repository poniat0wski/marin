import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductImage } from "@/components/product-image";
import { ConfidenceBadge, RiskBadge, UngatingBadge, UpdateBadge } from "@/components/product-badges";
import { WatchlistButton } from "@/components/watchlist-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductById, getProducts } from "@/lib/data";
import { formatDate } from "@/lib/recommendation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();

  const related = allProducts
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.active &&
        (candidate.brand === product.brand || candidate.category === product.category),
    )
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/recommendations">Back to recommendations</Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <WatchlistButton productId={product.id} />
          </div>

          <p className="text-sm text-slate-600">
            {product.brand} - {product.category} - ASIN {product.asin}
          </p>
        </div>

        <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <ProductImage product={product} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation snapshot</CardTitle>
          <CardDescription>
            Decision-support view only. This is not a guarantee of ungating approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <UngatingBadge type={product.ungatingType} />
            <ConfidenceBadge level={product.confidence} />
            <RiskBadge level={product.risk} />
            <UpdateBadge type={product.updateType} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Supplier: </span>
                {product.supplier}
              </p>
              <p>
                <span className="font-medium text-slate-900">Supplier source: </span>
                {product.supplierUrl ? (
                  <a href={product.supplierUrl} className="text-indigo-700 hover:text-indigo-800">
                    {product.supplierUrl}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
              <p>
                <span className="font-medium text-slate-900">Estimated quantity: </span>
                {product.estimatedQuantity} units
              </p>
              <p>
                <span className="font-medium text-slate-900">Estimated spend: </span>$
                {product.priceEstimate.toFixed(2)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Last updated: </span>
                {formatDate(product.lastUpdated)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Last validation: </span>
                {formatDate(product.lastValidation)}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900">Why recommended</p>
                <p>{product.recommendationReason}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Invoice expectations</p>
                <p>{product.invoiceNotes}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Supplier notes</p>
                <p>{product.supplierNotes}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Risk notes</p>
                <p>{product.notes}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Related products</CardTitle>
          <CardDescription>Similar by brand or category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {related.length > 0 ? (
            related.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <ProductImage product={candidate} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{candidate.name}</p>
                    <p className="text-xs text-slate-500">
                      {candidate.brand} - {candidate.category} - {candidate.confidence} confidence
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/recommendations/${candidate.id}`}>Open</Link>
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">No related recommendations available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
