export type UngatingType = "auto" | "ten_unit";
export type ConfidenceLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type UpdateType = "new" | "updated" | "removed";
export type UserRole = "admin" | "seller";
export type UserStatus = "active" | "suspended";

export interface Product {
  id: string;
  name: string;
  asin: string;
  imageUrl?: string;
  brand: string;
  category: string;
  supplier: string;
  supplierUrl: string;
  ungatingType: UngatingType;
  estimatedQuantity: number;
  priceEstimate: number;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  lastUpdated: string;
  lastValidation: string;
  invoiceNotes: string;
  supplierNotes: string;
  recommendationReason: string;
  notes: string;
  updateType: UpdateType;
  active: boolean;
}

export interface ProductUpdate {
  id: string;
  productId: string;
  type: UpdateType;
  happenedAt: string;
  summary: string;
  previousConfidence?: ConfidenceLevel;
  newConfidence?: ConfidenceLevel;
}

export interface UserPreferences {
  marketplace: string;
  categories: string[];
  brands: string[];
  experienceLevel: "new" | "intermediate" | "advanced";
  budgetMin: number;
  budgetMax: number;
  preferredUngatingType: UngatingType | "both";
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  marketplace: string;
  experienceLevel: "new" | "intermediate" | "advanced";
  watchlistCount: number;
  createdAt: string;
  lastActive: string;
}

export interface RecommendationResult {
  product: Product;
  score: number;
  reasons: string[];
}
