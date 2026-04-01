import { defaultUserPreferences, mockAdminUsers, mockProducts, mockUpdates } from "@/lib/mock-data";
import { getSupabaseClient } from "@/lib/supabase";
import type { AdminUser, Product, ProductUpdate, UserPreferences } from "@/lib/types";

interface ProductRow {
  id: string;
  name: string;
  asin: string;
  image_url?: string | null;
  brand: string;
  category: string;
  supplier: string;
  supplier_url: string;
  ungating_type: "auto" | "ten_unit";
  estimated_quantity: number;
  price_estimate: number;
  confidence_level: "low" | "medium" | "high";
  risk_level: "low" | "medium" | "high";
  invoice_notes: string;
  supplier_notes: string;
  recommendation_reason: string;
  notes: string;
  update_type: "new" | "updated" | "removed";
  active: boolean;
  last_updated: string;
  last_validation: string;
}

interface UpdateRow {
  id: string;
  product_id: string;
  type: "new" | "updated" | "removed";
  happened_at: string;
  summary: string;
  previous_confidence: "low" | "medium" | "high" | null;
  new_confidence: "low" | "medium" | "high" | null;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    asin: row.asin,
    imageUrl: row.image_url?.trim() ? row.image_url : undefined,
    brand: row.brand,
    category: row.category,
    supplier: row.supplier,
    supplierUrl: row.supplier_url,
    ungatingType: row.ungating_type,
    estimatedQuantity: row.estimated_quantity,
    priceEstimate: row.price_estimate,
    confidence: row.confidence_level,
    risk: row.risk_level,
    invoiceNotes: row.invoice_notes,
    supplierNotes: row.supplier_notes,
    recommendationReason: row.recommendation_reason,
    notes: row.notes,
    updateType: row.update_type,
    active: row.active,
    lastUpdated: row.last_updated,
    lastValidation: row.last_validation,
  };
}

function mapUpdate(row: UpdateRow): ProductUpdate {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    happenedAt: row.happened_at,
    summary: row.summary,
    previousConfidence: row.previous_confidence ?? undefined,
    newConfidence: row.new_confidence ?? undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return mockProducts;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error || !data) {
    return mockProducts;
  }

  return (data as ProductRow[]).map(mapProduct);
}

export async function getProductById(productId: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((product) => product.id === productId) ?? null;
}

export async function getProductUpdates(): Promise<ProductUpdate[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return mockUpdates;
  }

  const { data, error } = await supabase
    .from("product_updates")
    .select("*")
    .order("happened_at", { ascending: false });

  if (error || !data) {
    return mockUpdates;
  }

  return (data as UpdateRow[]).map(mapUpdate);
}

export async function getUserPreferences(): Promise<UserPreferences> {
  return defaultUserPreferences;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return mockAdminUsers;
}
