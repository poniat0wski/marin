"use client";

import { Download, FileUp, RefreshCcw, Trash2 } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { WATCHLIST_LIMIT, useWatchlist } from "@/components/watchlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/recommendation";
import type { ConfidenceLevel, Product, RiskLevel, UngatingType } from "@/lib/types";

const TEMPLATE_COLUMNS = [
  "id",
  "name",
  "asin",
  "imageUrl",
  "brand",
  "category",
  "supplier",
  "supplierUrl",
  "ungatingType",
  "estimatedQuantity",
  "priceEstimate",
  "confidence",
  "risk",
  "invoiceNotes",
  "supplierNotes",
  "recommendationReason",
  "notes",
] as const;

const REQUIRED_COLUMNS = [
  "name",
  "asin",
  "brand",
  "category",
  "supplier",
  "ungatingType",
  "estimatedQuantity",
  "priceEstimate",
  "confidence",
  "risk",
] as const;

const TEMPLATE_SAMPLE_ROW: Record<(typeof TEMPLATE_COLUMNS)[number], string> = {
  id: "csv-sample-001",
  name: "Sample Product Name",
  asin: "B012345678",
  imageUrl: "https://example.com/images/sample-product.png",
  brand: "SampleBrand",
  category: "Beauty",
  supplier: "Sample Supplier Inc",
  supplierUrl: "https://example.com/supplier/sample",
  ungatingType: "ten_unit",
  estimatedQuantity: "10",
  priceEstimate: "74.99",
  confidence: "medium",
  risk: "medium",
  invoiceNotes: "Invoice includes buyer and supplier business details.",
  supplierNotes: "Supplier legitimacy verified with trade references.",
  recommendationReason: "Fits expected budget and target category.",
  notes: "Ungating approval is not guaranteed.",
};

interface CsvParseResult {
  products: Product[];
  errors: string[];
}

interface WatchlistEntry {
  product: Product;
  source: "recommendation" | "csv";
}

interface WatchlistFilterState {
  query: string;
  ungatingType: "all" | "auto" | "ten_unit";
  brand: string;
  category: string;
  supplier: string;
  confidence: "all" | "low" | "medium" | "high";
  maxPrice: number;
  recencyDays: number;
  sortBy: "last_updated" | "price" | "name";
}

interface DisplayWatchlistEntry extends WatchlistEntry {
  displayProduct: Product;
  manualUpdateTime?: string;
  effectiveLastUpdated: string;
}

const initialFilters: WatchlistFilterState = {
  query: "",
  ungatingType: "all",
  brand: "all",
  category: "all",
  supplier: "all",
  confidence: "all",
  maxPrice: 1000,
  recencyDays: 30,
  sortBy: "last_updated",
};

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const normalized = value.replace(/"/g, '""');
  return needsQuotes ? `"${normalized}"` : normalized;
}

function buildTemplateCsv() {
  const header = TEMPLATE_COLUMNS.join(",");
  const row = TEMPLATE_COLUMNS.map((column) => escapeCsv(TEMPLATE_SAMPLE_ROW[column])).join(",");
  return `${header}\n${row}\n`;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function parseUngatingType(value: string): UngatingType | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]/g, "_");
  if (normalized === "auto") {
    return "auto";
  }
  if (normalized === "ten_unit" || normalized === "10_unit" || normalized === "10unit") {
    return "ten_unit";
  }
  return null;
}

function parseConfidence(value: string): ConfidenceLevel | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return null;
}

function parseRisk(value: string): RiskLevel | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return null;
}

function parseWatchlistCsv(text: string): CsvParseResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return {
      products: [],
      errors: ["CSV must include a header row and at least one data row."],
    };
  }

  const headers = rows[0];
  const headerIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerIndex.has(normalizeHeader(column)));

  if (missingColumns.length > 0) {
    return {
      products: [],
      errors: [`Missing required columns: ${missingColumns.join(", ")}`],
    };
  }

  const products: Product[] = [];
  const errors: string[] = [];
  const nowIso = new Date().toISOString();

  const readValue = (row: string[], column: string): string => {
    const index = headerIndex.get(normalizeHeader(column));
    if (index === undefined) {
      return "";
    }
    return (row[index] ?? "").trim();
  };

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const lineNumber = rowIndex + 1;

    const name = readValue(row, "name");
    const asin = readValue(row, "asin");
    const imageUrl = readValue(row, "imageUrl");
    const brand = readValue(row, "brand");
    const category = readValue(row, "category");
    const supplier = readValue(row, "supplier");
    const ungatingType = parseUngatingType(readValue(row, "ungatingType"));
    const confidence = parseConfidence(readValue(row, "confidence"));
    const risk = parseRisk(readValue(row, "risk"));
    const estimatedQuantity = Number.parseInt(readValue(row, "estimatedQuantity"), 10);
    const priceEstimate = Number.parseFloat(readValue(row, "priceEstimate"));

    if (!name || !asin || !brand || !category || !supplier) {
      errors.push(`Line ${lineNumber}: name, asin, brand, category, and supplier are required.`);
      continue;
    }

    if (!ungatingType) {
      errors.push(`Line ${lineNumber}: ungatingType must be auto or ten_unit.`);
      continue;
    }

    if (!confidence || !risk) {
      errors.push(`Line ${lineNumber}: confidence and risk must be low, medium, or high.`);
      continue;
    }

    if (!Number.isFinite(estimatedQuantity) || estimatedQuantity <= 0) {
      errors.push(`Line ${lineNumber}: estimatedQuantity must be a positive integer.`);
      continue;
    }

    if (!Number.isFinite(priceEstimate) || priceEstimate < 0) {
      errors.push(`Line ${lineNumber}: priceEstimate must be a non-negative number.`);
      continue;
    }

    const rawId = readValue(row, "id");
    const safeAsin = asin.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = rawId || `csv-${safeAsin}-${rowIndex}`;

    products.push({
      id,
      name,
      asin,
      imageUrl,
      brand,
      category,
      supplier,
      supplierUrl: readValue(row, "supplierUrl"),
      ungatingType,
      estimatedQuantity,
      priceEstimate,
      confidence,
      risk,
      lastUpdated: nowIso,
      lastValidation: nowIso,
      invoiceNotes: readValue(row, "invoiceNotes") || "Imported from CSV.",
      supplierNotes: readValue(row, "supplierNotes") || "Imported from CSV.",
      recommendationReason:
        readValue(row, "recommendationReason") || "Imported to watchlist via CSV.",
      notes: readValue(row, "notes") || "Imported product. Verify details before taking action.",
      updateType: "new",
      active: true,
    });
  }

  return {
    products,
    errors,
  };
}

export function SavedProductsView({ products }: { products: Product[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<WatchlistFilterState>(initialFilters);
  const [currentNowIso] = useState(() => new Date().toISOString());

  const {
    ids,
    importedProducts,
    manualUpdatedAt,
    removeFromWatchlist,
    importProducts,
    updateProductData,
    updateAllWatchlistData,
  } = useWatchlist();

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const entries = useMemo<WatchlistEntry[]>(() => {
    const recommendationEntries = ids
      .map((id) => productById.get(id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => ({ product, source: "recommendation" as const }));

    const importedEntries = importedProducts
      .filter((product) => !productById.has(product.id))
      .map((product) => ({ product, source: "csv" as const }));

    return [...recommendationEntries, ...importedEntries];
  }, [ids, importedProducts, productById]);

  const entriesWithDisplay = useMemo<DisplayWatchlistEntry[]>(
    () =>
      entries.map((entry) => {
        const manualUpdateTime = manualUpdatedAt[entry.product.id];
        const effectiveLastUpdated = manualUpdateTime ?? entry.product.lastUpdated;
        const displayProduct = manualUpdateTime
          ? {
              ...entry.product,
              lastValidation: manualUpdateTime,
              lastUpdated: effectiveLastUpdated,
              updateType: "updated" as const,
            }
          : entry.product;

        return {
          ...entry,
          displayProduct,
          manualUpdateTime,
          effectiveLastUpdated,
        };
      }),
    [entries, manualUpdatedAt],
  );

  const brands = useMemo(
    () =>
      Array.from(new Set(entriesWithDisplay.map((entry) => entry.displayProduct.brand))).sort(),
    [entriesWithDisplay],
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(entriesWithDisplay.map((entry) => entry.displayProduct.category))).sort(),
    [entriesWithDisplay],
  );
  const suppliers = useMemo(
    () =>
      Array.from(new Set(entriesWithDisplay.map((entry) => entry.displayProduct.supplier))).sort(),
    [entriesWithDisplay],
  );

  const visibleEntries = useMemo(() => {
    const now = new Date(currentNowIso).getTime();

    const filtered = entriesWithDisplay.filter((entry) => {
      const product = entry.displayProduct;
      const query = filters.query.trim().toLowerCase();
      const searchMatch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.asin.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);

      if (!searchMatch) {
        return false;
      }

      if (filters.ungatingType !== "all" && product.ungatingType !== filters.ungatingType) {
        return false;
      }

      if (filters.brand !== "all" && product.brand.toLowerCase() !== filters.brand.toLowerCase()) {
        return false;
      }

      if (
        filters.category !== "all" &&
        product.category.toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.supplier !== "all" &&
        product.supplier.toLowerCase() !== filters.supplier.toLowerCase()
      ) {
        return false;
      }

      if (filters.confidence !== "all" && product.confidence !== filters.confidence) {
        return false;
      }

      if (product.priceEstimate > filters.maxPrice) {
        return false;
      }

      const daysSince =
        (now - new Date(entry.effectiveLastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > filters.recencyDays) {
        return false;
      }

      return true;
    });

    if (filters.sortBy === "last_updated") {
      filtered.sort(
        (a, b) =>
          new Date(b.effectiveLastUpdated).getTime() - new Date(a.effectiveLastUpdated).getTime(),
      );
    }

    if (filters.sortBy === "price") {
      filtered.sort((a, b) => a.displayProduct.priceEstimate - b.displayProduct.priceEstimate);
    }

    if (filters.sortBy === "name") {
      filtered.sort((a, b) => a.displayProduct.name.localeCompare(b.displayProduct.name));
    }

    return filtered;
  }, [currentNowIso, entriesWithDisplay, filters]);

  const hasProducts = entriesWithDisplay.length > 0;

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "watchlist-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = parseWatchlistCsv(text);

    if (parsed.products.length === 0) {
      setStatusMessage(
        `Import failed. ${parsed.errors[0] ?? "No valid rows found in the CSV file."}`,
      );
      event.target.value = "";
      return;
    }

    const result = importProducts(parsed.products);
    const summary = [
      `Imported ${result.added} new products.`,
      result.updated > 0 ? `${result.updated} existing imported products updated.` : "",
      result.skippedBecauseAlreadySaved > 0
        ? `${result.skippedBecauseAlreadySaved} skipped (already saved from recommendations).`
        : "",
      result.skippedBecauseLimit > 0
        ? `${result.skippedBecauseLimit} skipped (watchlist limit ${WATCHLIST_LIMIT}).`
        : "",
      parsed.errors.length > 0 ? `${parsed.errors.length} CSV rows were invalid.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    setStatusMessage(summary);
    event.target.value = "";
  };

  const handleUpdateAll = () => {
    updateAllWatchlistData();
    setStatusMessage("Updated watchlist data for all saved products.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Watchlist Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download CSV template
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvImport}
            />

            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4" />
              Import CSV to watchlist
            </Button>

            <Button type="button" onClick={handleUpdateAll} disabled={!hasProducts}>
              <RefreshCcw className="h-4 w-4" />
              Update all watchlist products
            </Button>
          </div>

          {statusMessage ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              {statusMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter products</CardTitle>
          <CardDescription>
            Search and sort by ungating type, confidence, supplier, price, and recency.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Search</p>
            <Input
              placeholder="Search name, ASIN, brand"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Ungating type</p>
            <Select
              value={filters.ungatingType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  ungatingType: event.target.value as WatchlistFilterState["ungatingType"],
                }))
              }
            >
              <option value="all">All types</option>
              <option value="auto">Auto-ungate</option>
              <option value="ten_unit">10-unit</option>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Brand ({brands.length})</p>
            <Input
              list="watchlist-brand-options"
              placeholder="All brands (type to search)"
              value={filters.brand === "all" ? "" : filters.brand}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  brand: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="watchlist-brand-options">
              {brands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Category ({categories.length})</p>
            <Input
              list="watchlist-category-options"
              placeholder="All categories (type to search)"
              value={filters.category === "all" ? "" : filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="watchlist-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Supplier ({suppliers.length})</p>
            <Input
              list="watchlist-supplier-options"
              placeholder="All suppliers (type to search)"
              value={filters.supplier === "all" ? "" : filters.supplier}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  supplier: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="watchlist-supplier-options">
              {suppliers.map((supplier) => (
                <option key={supplier} value={supplier} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Confidence</p>
            <Select
              value={filters.confidence}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  confidence: event.target.value as WatchlistFilterState["confidence"],
                }))
              }
            >
              <option value="all">All confidence levels</option>
              <option value="high">High confidence</option>
              <option value="medium">Medium confidence</option>
              <option value="low">Low confidence</option>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Price range</p>
            <Select
              value={String(filters.maxPrice)}
              onChange={(event) =>
                setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))
              }
            >
              <option value="1000">Any price</option>
              <option value="50">Up to $50</option>
              <option value="100">Up to $100</option>
              <option value="200">Up to $200</option>
              <option value="500">Up to $500</option>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Recency</p>
            <Select
              value={String(filters.recencyDays)}
              onChange={(event) =>
                setFilters((current) => ({ ...current, recencyDays: Number(event.target.value) }))
              }
            >
              <option value="1">Updated in last 24 hours</option>
              <option value="3">Updated in last 3 days</option>
              <option value="7">Updated in last 7 days</option>
              <option value="30">Updated in last 30 days</option>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Sort by</p>
            <Select
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sortBy: event.target.value as WatchlistFilterState["sortBy"],
                }))
              }
            >
              <option value="last_updated">Sort by last updated</option>
              <option value="price">Sort by price</option>
              <option value="name">Sort by product name</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!hasProducts ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Your watchlist is empty. Save products from Recommendations or import with CSV.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleEntries.map((entry) => {
            return (
              <div key={entry.product.id}>
                <ProductCard
                  product={entry.displayProduct}
                  detailHref={
                    entry.source === "recommendation"
                      ? `/recommendations/${entry.product.id}`
                      : `/saved/imported/${encodeURIComponent(entry.product.id)}`
                  }
                  bottomPanel={
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant={entry.source === "csv" ? "info" : "neutral"}>
                          Source: {entry.source === "csv" ? "CSV import" : "Recommendations"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              updateProductData(entry.product.id);
                              setStatusMessage(`Updated data for ${entry.product.name}.`);
                            }}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Update data
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromWatchlist(entry.product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {entry.manualUpdateTime ? (
                        <p className="text-xs text-slate-500">
                          Last manual data update: {formatDate(entry.manualUpdateTime)}
                        </p>
                      ) : null}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {hasProducts && visibleEntries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            No watchlist products match this filter set. Try expanding price or recency limits.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
