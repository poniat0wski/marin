import type {
  ConfidenceLevel,
  Product,
  RecommendationResult,
  RiskLevel,
  UngatingType,
  UserPreferences,
} from "@/lib/types";

const confidenceWeight: Record<ConfidenceLevel, number> = {
  low: 10,
  medium: 25,
  high: 40,
};

const riskPenalty: Record<RiskLevel, number> = {
  low: 0,
  medium: 10,
  high: 22,
};

function typeBoost(preferredType: UngatingType | "both", productType: UngatingType): number {
  if (preferredType === "both") {
    return 8;
  }

  return preferredType === productType ? 18 : -12;
}

export function rankProducts(
  products: Product[],
  preferences: UserPreferences,
): RecommendationResult[] {
  return products
    .filter((product) => product.active)
    .map((product) => {
      let score = 40;
      const reasons: string[] = [];

      if (preferences.categories.includes(product.category)) {
        score += 16;
        reasons.push("Matches one of your target categories");
      }

      if (preferences.brands.includes(product.brand)) {
        score += 14;
        reasons.push("Matches one of your target brands");
      }

      score += typeBoost(preferences.preferredUngatingType, product.ungatingType);
      if (
        preferences.preferredUngatingType !== "both" &&
        preferences.preferredUngatingType === product.ungatingType
      ) {
        reasons.push("Fits your preferred ungating style");
      }

      if (
        product.priceEstimate >= preferences.budgetMin &&
        product.priceEstimate <= preferences.budgetMax
      ) {
        score += 10;
        reasons.push("Within your budget range");
      } else {
        score -= 12;
      }

      score += confidenceWeight[product.confidence];
      score -= riskPenalty[product.risk];

      if (preferences.experienceLevel === "new" && product.risk === "high") {
        score -= 8;
        reasons.push("Higher risk for new seller profiles");
      }

      if (preferences.marketplace !== "US" && product.supplierNotes.toLowerCase().includes("us")) {
        score -= 6;
        reasons.push("Supplier notes are US-oriented");
      }

      return {
        product,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function formatUngatingType(type: UngatingType): string {
  return type === "ten_unit" ? "10-unit" : "Auto";
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
