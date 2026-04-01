"use client";

import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate, rankProducts } from "@/lib/recommendation";
import type { Product, UserPreferences } from "@/lib/types";

interface FilterState {
  query: string;
  ungatingType: "all" | "auto" | "ten_unit";
  brand: string;
  category: string;
  supplier: string;
  confidence: "all" | "low" | "medium" | "high";
  maxPrice: number;
  recencyDays: number;
  sortBy: "score" | "last_updated" | "price";
}

const initialFilters: FilterState = {
  query: "",
  ungatingType: "all",
  brand: "all",
  category: "all",
  supplier: "all",
  confidence: "all",
  maxPrice: 1000,
  recencyDays: 30,
  sortBy: "score",
};

const MAX_DAILY_REFRESHES = 5;
const REFRESH_STATE_STORAGE_KEY = "recommendation_refresh_state_v1";

interface RefreshState {
  dayKey: string;
  used: number;
  seed: number;
  lastRefreshedAt: string | null;
}

function getLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultRefreshState(dayKey: string): RefreshState {
  return {
    dayKey,
    used: 0,
    seed: 0,
    lastRefreshedAt: null,
  };
}

function readRefreshState(dayKey: string): RefreshState {
  if (typeof window === "undefined") {
    return createDefaultRefreshState(dayKey);
  }

  try {
    const raw = window.localStorage.getItem(REFRESH_STATE_STORAGE_KEY);
    if (!raw) {
      return createDefaultRefreshState(dayKey);
    }

    const parsed = JSON.parse(raw) as Partial<RefreshState>;
    if (parsed.dayKey !== dayKey) {
      return createDefaultRefreshState(dayKey);
    }

    const used = Number.isFinite(parsed.used) ? Math.max(0, Math.min(MAX_DAILY_REFRESHES, parsed.used as number)) : 0;
    const seed = Number.isFinite(parsed.seed) ? Math.max(0, parsed.seed as number) : 0;
    const lastRefreshedAt =
      typeof parsed.lastRefreshedAt === "string" ? parsed.lastRefreshedAt : null;

    return {
      dayKey,
      used,
      seed,
      lastRefreshedAt,
    };
  } catch {
    return createDefaultRefreshState(dayKey);
  }
}

function persistRefreshState(state: RefreshState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REFRESH_STATE_STORAGE_KEY, JSON.stringify(state));
}

function hashToUnit(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash / 0xffffffff;
}

function getRefreshScoreBoost(productId: string, seed: number): number {
  if (seed === 0) {
    return 0;
  }

  const unit = hashToUnit(`${productId}:${seed}`);
  return Math.round((unit - 0.5) * 24);
}

export function RecommendationExplorer({
  products,
  preferences,
  nowIso,
}: {
  products: Product[];
  preferences: UserPreferences;
  nowIso: string;
}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentNowIso, setCurrentNowIso] = useState(() =>
    typeof window === "undefined" ? nowIso : new Date().toISOString(),
  );
  const [refreshState, setRefreshState] = useState<RefreshState>(() => {
    const dayKey = typeof window === "undefined" ? nowIso.slice(0, 10) : getLocalDayKey(new Date());
    return readRefreshState(dayKey);
  });

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort(),
    [products],
  );
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );
  const suppliers = useMemo(
    () => Array.from(new Set(products.map((product) => product.supplier))).sort(),
    [products],
  );

  const visible = useMemo(() => {
    const ranked = rankProducts(products, preferences)
      .map((item) => {
        const refreshBoost = getRefreshScoreBoost(item.product.id, refreshState.seed);

        return {
          ...item,
          score: item.score + refreshBoost,
        };
      })
      .sort((left, right) => right.score - left.score);
    const now = new Date(currentNowIso).getTime();

    const filtered = ranked.filter(({ product }) => {
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

      const daysSince = (now - new Date(product.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > filters.recencyDays) {
        return false;
      }

      return true;
    });

    if (filters.sortBy === "last_updated") {
      filtered.sort(
        (a, b) => new Date(b.product.lastUpdated).getTime() - new Date(a.product.lastUpdated).getTime(),
      );
    }

    if (filters.sortBy === "price") {
      filtered.sort((a, b) => a.product.priceEstimate - b.product.priceEstimate);
    }

    return filtered;
  }, [currentNowIso, filters, preferences, products, refreshState.seed]);

  const remainingRefreshes = Math.max(0, MAX_DAILY_REFRESHES - refreshState.used);

  const handleRefresh = () => {
    const now = new Date();
    const nowIsoValue = now.toISOString();
    const dayKey = getLocalDayKey(now);

    setCurrentNowIso(nowIsoValue);
    setRefreshState((previous) => {
      const normalized = previous.dayKey === dayKey ? previous : createDefaultRefreshState(dayKey);
      if (normalized.used >= MAX_DAILY_REFRESHES) {
        persistRefreshState(normalized);
        return normalized;
      }

      const next: RefreshState = {
        dayKey,
        used: normalized.used + 1,
        seed: normalized.seed + 1,
        lastRefreshedAt: nowIsoValue,
      };

      persistRefreshState(next);
      return next;
    });
  };

  return (
    <div className="space-y-6">
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
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Ungating type</p>
            <Select
              value={filters.ungatingType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  ungatingType: event.target.value as FilterState["ungatingType"],
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
              list="brand-options"
              placeholder="All brands (type to search)"
              value={filters.brand === "all" ? "" : filters.brand}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  brand: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="brand-options">
              {brands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Category ({categories.length})</p>
            <Input
              list="category-options"
              placeholder="All categories (type to search)"
              value={filters.category === "all" ? "" : filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Supplier ({suppliers.length})</p>
            <Input
              list="supplier-options"
              placeholder="All suppliers (type to search)"
              value={filters.supplier === "all" ? "" : filters.supplier}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  supplier: event.target.value.trim() ? event.target.value : "all",
                }))
              }
            />
            <datalist id="supplier-options">
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
                  confidence: event.target.value as FilterState["confidence"],
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
                  sortBy: event.target.value as FilterState["sortBy"],
                }))
              }
            >
              <option value="score">Sort by personalized score</option>
              <option value="last_updated">Sort by last updated</option>
              <option value="price">Sort by price</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {visible.length} matching recommendations
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
          <div className="text-xs text-indigo-900">
            <span className="font-semibold">Manual refresh:</span> {remainingRefreshes} of{" "}
            {MAX_DAILY_REFRESHES} left today.
            {refreshState.lastRefreshedAt ? (
              <span className="text-indigo-800">
                {" "}
                Last: {formatDate(refreshState.lastRefreshedAt)}
              </span>
            ) : null}
          </div>

          <Button
            size="sm"
            type="button"
            onClick={handleRefresh}
            disabled={remainingRefreshes === 0}
          >
            <RefreshCcw className="h-4 w-4" />
            {remainingRefreshes === 0 ? "Daily limit reached" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <div key={item.product.id}>
            <ProductCard
              product={item.product}
              personalizedScore={item.score}
              reason={item.reasons[0] ?? item.product.recommendationReason}
              showSaveButton
            />
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            No products match this filter set. Try expanding price or recency limits.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
