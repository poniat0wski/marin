"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProductImage } from "@/components/product-image";
import { ConfidenceBadge, RiskBadge, UngatingBadge, UpdateBadge } from "@/components/product-badges";
import { useWatchlist } from "@/components/watchlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/recommendation";

export default function ImportedWatchlistProductPage() {
  const params = useParams<{ id: string }>();
  const productId = decodeURIComponent(params.id ?? "");
  const { importedProducts, removeFromWatchlist } = useWatchlist();

  const product = importedProducts.find((candidate) => candidate.id === productId);

  if (!product) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/saved" className="text-sm text-slate-600 hover:text-slate-900">
            ? Back to watchlist
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Imported product not found</h1>
          <p className="text-sm text-slate-600">
            This item may have been removed from your watchlist.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Button asChild>
              <Link href="/saved">Return to watchlist</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/saved" className="text-sm text-slate-600 hover:text-slate-900">
            ? Back to watchlist
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-600">
            {product.brand} - {product.category} - ASIN {product.asin}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <ProductImage product={product} />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              removeFromWatchlist(product.id);
            }}
          >
            Remove from watchlist
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imported product details</CardTitle>
          <CardDescription>
            Imported via CSV. Verify data before making sourcing or ungating decisions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <UngatingBadge type={product.ungatingType} />
            <ConfidenceBadge level={product.confidence} />
            <RiskBadge level={product.risk} />
            <UpdateBadge type={product.updateType} />
            <Badge variant="info">CSV import</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Supplier: </span>
                {product.supplier}
              </p>
              <p>
                <span className="font-medium text-slate-900">Supplier URL: </span>
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
                <span className="font-medium text-slate-900">Estimated spend: </span>
                ${product.priceEstimate.toFixed(2)}
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
                <p className="font-medium text-slate-900">Recommendation reason</p>
                <p>{product.recommendationReason}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Invoice notes</p>
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
    </div>
  );
}
