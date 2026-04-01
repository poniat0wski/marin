"use client";

import { useEffect, useMemo, useState } from "react";

import { getGeneratedProductImageUrl, getProductImageUrl } from "@/lib/product-image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductImage({
  product,
  alt,
  className,
}: {
  product: Pick<Product, "name" | "asin" | "brand" | "category" | "imageUrl">;
  alt?: string;
  className?: string;
}) {
  const fallbackSrc = useMemo(
    () =>
      getGeneratedProductImageUrl({
        asin: product.asin,
        brand: product.brand,
        category: product.category,
      }),
    [product.asin, product.brand, product.category],
  );

  const preferredSrc = useMemo(
    () =>
      getProductImageUrl({
        asin: product.asin,
        brand: product.brand,
        category: product.category,
        imageUrl: product.imageUrl,
      }),
    [product.asin, product.brand, product.category, product.imageUrl],
  );

  const [src, setSrc] = useState(preferredSrc);

  useEffect(() => {
    setSrc(preferredSrc);
  }, [preferredSrc]);

  return (
    // Product images can come from arbitrary user/admin URLs; keep native img to avoid hostname allowlist constraints.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? `${product.name} image`}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
}
