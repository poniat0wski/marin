import type { AdminUser, Product, ProductUpdate, UserPreferences } from "@/lib/types";

export const defaultUserPreferences: UserPreferences = {
  marketplace: "US",
  categories: ["Beauty", "Health", "Grocery"],
  brands: ["Nivea", "Garnier", "Energizer"],
  experienceLevel: "new",
  budgetMin: 25,
  budgetMax: 250,
  preferredUngatingType: "both",
};

const brands = [
  "Nivea",
  "Garnier",
  "Energizer",
  "Colgate",
  "Gillette",
  "Cetaphil",
  "Dove",
  "Panasonic",
  "Duracell",
  "Hasbro",
  "Lego",
  "Neutrogena",
  "CeraVe",
  "Aveeno",
  "Bic",
  "Crayola",
];

const categories = [
  "Beauty",
  "Health",
  "Grocery",
  "Electronics",
  "Toys",
  "Home",
  "Office",
  "Baby",
];

const suppliers = [
  "Frontier Wholesale",
  "Mainstreet Wholesale Markets",
  "Atlas Wholesale Group",
  "BlueRiver Distribution",
  "Summit Trade Supply",
  "North Harbor B2B",
  "Pioneer Inventory Co",
  "Stonebridge Wholesale",
];

function makeIso(offsetHours: number) {
  const base = Date.parse("2026-04-01T12:00:00.000Z");
  return new Date(base - offsetHours * 60 * 60 * 1000).toISOString();
}

function makeProduct(index: number): Product {
  const brand = brands[index % brands.length];
  const category = categories[index % categories.length];
  const supplier = suppliers[index % suppliers.length];
  const ungatingType: Product["ungatingType"] = index % 2 === 0 ? "ten_unit" : "auto";
  const confidence: Product["confidence"] =
    index % 4 === 0 ? "high" : index % 3 === 0 ? "low" : "medium";
  const risk: Product["risk"] = index % 5 === 0 ? "high" : index % 2 === 0 ? "low" : "medium";
  const updateType: Product["updateType"] = index % 3 === 0 ? "updated" : "new";

  return {
    id: `p-${101 + index}`,
    name: `${brand} ${category} Candidate Pack ${index + 1}`,
    asin: `B0${String(91000000 + index).padStart(8, "0")}`,
    brand,
    category,
    supplier,
    supplierUrl: `https://example.com/suppliers/${supplier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ungatingType,
    estimatedQuantity: ungatingType === "ten_unit" ? 10 : 1,
    priceEstimate: 24 + ((index * 11) % 190),
    confidence,
    risk,
    lastUpdated: makeIso(index * 2),
    lastValidation: makeIso(index * 2 + 1),
    invoiceNotes:
      "Invoice should include supplier details, buyer details, quantities, pricing, and invoice date.",
    supplierNotes:
      "Supplier legitimacy appears acceptable in recent checks; verify authorization before placing order.",
    recommendationReason:
      "Recommended based on profile match, budget fit, and current confidence/risk balance.",
    notes:
      "Decision-support only. Ungating approval is never guaranteed.",
    updateType,
    active: true,
  };
}

export const mockProducts: Product[] = Array.from({ length: 32 }, (_, index) =>
  makeProduct(index),
);

export const mockUpdates: ProductUpdate[] = [
  {
    id: "u-1",
    productId: "p-101",
    type: "new",
    happenedAt: makeIso(1),
    summary: "Added a new high-confidence recommendation.",
  },
  {
    id: "u-2",
    productId: "p-106",
    type: "updated",
    happenedAt: makeIso(4),
    summary: "Confidence changed after supplier invoice verification.",
    previousConfidence: "low",
    newConfidence: "medium",
  },
  {
    id: "u-3",
    productId: "p-112",
    type: "removed",
    happenedAt: makeIso(8),
    summary: "Removed due to unresolved supplier authorization signals.",
  },
];

export const mockAdminUsers: AdminUser[] = [
  {
    id: "u-admin-001",
    email: "admin@marin.local",
    role: "admin",
    status: "active",
    marketplace: "US",
    experienceLevel: "advanced",
    watchlistCount: 12,
    createdAt: "2026-01-10T10:00:00.000Z",
    lastActive: makeIso(0),
  },
  {
    id: "u-seller-001",
    email: "seller@marin.local",
    role: "seller",
    status: "active",
    marketplace: "US",
    experienceLevel: "new",
    watchlistCount: 5,
    createdAt: "2026-02-05T15:30:00.000Z",
    lastActive: makeIso(3),
  },
];
