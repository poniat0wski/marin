import Link from "next/link";

import { ProductImage } from "@/components/product-image";
import { ConfidenceBadge, RiskBadge, UngatingBadge, UpdateBadge } from "@/components/product-badges";
import { WatchlistButton } from "@/components/watchlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/recommendation";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  personalizedScore,
  reason,
  detailHref,
  showSaveButton = false,
  bottomPanel,
}: {
  product: Product;
  personalizedScore?: number;
  reason?: string;
  detailHref?: string | null;
  showSaveButton?: boolean;
  bottomPanel?: React.ReactNode;
}) {
  const resolvedDetailHref =
    detailHref === undefined ? `/recommendations/${product.id}` : detailHref;

  return (
    <Card className="h-full">
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100">
        <ProductImage product={product} className="aspect-[3/2]" />
      </div>

      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <UngatingBadge type={product.ungatingType} className="px-3 py-1 text-sm" />
          <ConfidenceBadge level={product.confidence} className="px-3 py-1 text-sm" />
          <RiskBadge level={product.risk} className="px-3 py-1 text-sm" />
          <UpdateBadge type={product.updateType} className="px-3 py-1 text-sm" />
        </div>
        <CardTitle className="mt-3">{product.name}</CardTitle>
        <p className="text-sm text-slate-600">
          {product.brand} - {product.category} - ASIN {product.asin}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Supplier</p>
            <p className="font-medium text-slate-800">{product.supplier}</p>
          </div>
          <div>
            <p className="text-slate-500">Est. quantity</p>
            <p className="font-medium text-slate-800">{product.estimatedQuantity} units</p>
          </div>
          <div>
            <p className="text-slate-500">Budget estimate</p>
            <p className="font-medium text-slate-800">${product.priceEstimate.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Last updated</p>
            <p className="font-medium text-slate-800">{formatDate(product.lastUpdated)}</p>
          </div>
        </div>

        {typeof personalizedScore === "number" ? (
          <Badge variant="neutral">Personalized score: {Math.round(personalizedScore)}</Badge>
        ) : null}

        {reason ? <p className="text-sm text-slate-700">Why recommended: {reason}</p> : null}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-slate-500">Not a guaranteed approval outcome.</p>
        <div className="flex items-center gap-2">
          {showSaveButton ? <WatchlistButton productId={product.id} /> : null}
          {resolvedDetailHref ? (
            <Button asChild size="sm">
              <Link href={resolvedDetailHref}>View details</Link>
            </Button>
          ) : null}
        </div>
      </CardFooter>
      {bottomPanel ? (
        <div className="mt-3 border-t border-slate-200/80 pt-3">{bottomPanel}</div>
      ) : null}
    </Card>
  );
}
