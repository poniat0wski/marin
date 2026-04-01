import { SavedPageHeader } from "@/components/saved-page-header";
import { SavedProductsView } from "@/components/saved-products-view";
import { getProducts } from "@/lib/data";

export default async function SavedPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <SavedPageHeader />

      <SavedProductsView products={products} />
    </div>
  );
}
