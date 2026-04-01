import type { Product } from "@/lib/types";

function normalizeCustomImageUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return null;
}

export function getGeneratedProductImageUrl({
  asin,
  brand,
  category,
}: Pick<Product, "asin" | "brand" | "category">) {
  const params = new URLSearchParams({
    asin,
    brand,
    category,
  });
  return `/api/product-image?${params.toString()}`;
}

export function getProductImageUrl(
  product: Pick<Product, "asin" | "brand" | "category"> & { imageUrl?: string },
) {
  return normalizeCustomImageUrl(product.imageUrl) ?? getGeneratedProductImageUrl(product);
}
