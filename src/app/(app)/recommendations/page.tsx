import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { PageHeader } from "@/components/page-header";
import { RecommendationExplorer } from "@/components/recommendation-explorer";
import { getProducts, getUserPreferences } from "@/lib/data";

export default async function RecommendationsPage() {
  const [products, preferences] = await Promise.all([getProducts(), getUserPreferences()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Recommendations"
        description="Filter by ungating strategy, confidence, supplier, budget, and recency."
      />

      <LegalDisclaimer />

      <RecommendationExplorer
        products={products.filter((product) => product.active)}
        preferences={preferences}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
