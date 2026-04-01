"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";

const LEGACY_STORAGE_KEY = "ungating_watchlist";
const STORAGE_KEY = "ungating_watchlist_state_v1";
const WATCHLIST_EVENT = "watchlist-change";
const EMPTY_STORAGE_MARKER = "__EMPTY_WATCHLIST_STATE__";

export const WATCHLIST_LIMIT = 500;

interface WatchlistState {
  ids: string[];
  importedProducts: Product[];
  manualUpdatedAt: Record<string, string>;
}

interface ToggleResult {
  ok: boolean;
  reason?: "limit_reached";
}

interface ImportResult {
  added: number;
  updated: number;
  skippedBecauseAlreadySaved: number;
  skippedBecauseLimit: number;
}

const EMPTY_IDS: string[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_UPDATED: Record<string, string> = {};

const EMPTY_STATE: WatchlistState = {
  ids: EMPTY_IDS,
  importedProducts: EMPTY_PRODUCTS,
  manualUpdatedAt: EMPTY_UPDATED,
};

let cachedRawSnapshot = "";
let cachedStateSnapshot: WatchlistState = EMPTY_STATE;

function getUniqueWatchlistCount(state: WatchlistState): number {
  return new Set([...state.ids, ...state.importedProducts.map((product) => product.id)]).size;
}

function normalizeState(input: Partial<WatchlistState> | null | undefined): WatchlistState {
  const ids = Array.isArray(input?.ids)
    ? input.ids.filter((value): value is string => typeof value === "string")
    : EMPTY_IDS;

  const importedProducts = Array.isArray(input?.importedProducts)
    ? input.importedProducts.filter(
        (value): value is Product =>
          Boolean(value) && typeof value.id === "string" && typeof value.name === "string",
      )
    : EMPTY_PRODUCTS;

  const manualUpdatedAt =
    input?.manualUpdatedAt && typeof input.manualUpdatedAt === "object"
      ? Object.fromEntries(
          Object.entries(input.manualUpdatedAt).filter(
            ([key, value]) => typeof key === "string" && typeof value === "string",
          ),
        )
      : EMPTY_UPDATED;

  return {
    ids,
    importedProducts,
    manualUpdatedAt,
  };
}

function readLegacyIds(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_IDS;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return EMPTY_IDS;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return EMPTY_IDS;
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return EMPTY_IDS;
  }
}

function writeWatchlistSnapshot(nextState: WatchlistState) {
  if (typeof window === "undefined") {
    return;
  }

  const raw = JSON.stringify(nextState);
  cachedRawSnapshot = raw;
  cachedStateSnapshot = nextState;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(WATCHLIST_EVENT));
}

function getWatchlistSnapshot(): WatchlistState {
  if (typeof window === "undefined") {
    return EMPTY_STATE;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const cacheKey = raw ?? EMPTY_STORAGE_MARKER;

  if (cacheKey === cachedRawSnapshot) {
    return cachedStateSnapshot;
  }

  if (!raw) {
    const legacyIds = readLegacyIds();
    const migrated = normalizeState({ ids: legacyIds, importedProducts: [], manualUpdatedAt: {} });
    cachedRawSnapshot = cacheKey;
    cachedStateSnapshot = migrated;
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WatchlistState>;
    const normalized = normalizeState(parsed);
    cachedRawSnapshot = cacheKey;
    cachedStateSnapshot = normalized;
    return normalized;
  } catch {
    cachedRawSnapshot = cacheKey;
    cachedStateSnapshot = EMPTY_STATE;
    return EMPTY_STATE;
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();

  window.addEventListener("storage", handler);
  window.addEventListener(WATCHLIST_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(WATCHLIST_EVENT, handler);
  };
}

export function useWatchlist() {
  const state = useSyncExternalStore(subscribe, getWatchlistSnapshot, () => EMPTY_STATE);

  const totalCount = useMemo(() => getUniqueWatchlistCount(state), [state]);
  const remainingSlots = Math.max(0, WATCHLIST_LIMIT - totalCount);

  const toggleRecommendation = (productId: string): ToggleResult => {
    const current = getWatchlistSnapshot();
    const alreadySaved = current.ids.includes(productId);

    if (alreadySaved) {
      const nextState: WatchlistState = {
        ...current,
        ids: current.ids.filter((id) => id !== productId),
      };
      writeWatchlistSnapshot(nextState);
      return { ok: true };
    }

    const uniqueCount = getUniqueWatchlistCount(current);
    const alreadyPresentFromImport = current.importedProducts.some((product) => product.id === productId);
    if (uniqueCount >= WATCHLIST_LIMIT && !alreadyPresentFromImport) {
      return { ok: false, reason: "limit_reached" };
    }

    const nextState: WatchlistState = {
      ...current,
      ids: [...current.ids, productId],
    };
    writeWatchlistSnapshot(nextState);
    return { ok: true };
  };

  const removeFromWatchlist = (productId: string) => {
    const current = getWatchlistSnapshot();
    const nextManual = { ...current.manualUpdatedAt };
    delete nextManual[productId];

    const nextState: WatchlistState = {
      ids: current.ids.filter((id) => id !== productId),
      importedProducts: current.importedProducts.filter((product) => product.id !== productId),
      manualUpdatedAt: nextManual,
    };
    writeWatchlistSnapshot(nextState);
  };

  const importProducts = (products: Product[]): ImportResult => {
    const current = getWatchlistSnapshot();
    const incomingById = new Map(products.map((product) => [product.id, product]));
    const importedById = new Map(current.importedProducts.map((product) => [product.id, product]));
    const recommendedIds = new Set(current.ids);
    const uniqueIds = new Set([...current.ids, ...current.importedProducts.map((product) => product.id)]);

    let added = 0;
    let updated = 0;
    let skippedBecauseAlreadySaved = 0;
    let skippedBecauseLimit = 0;

    for (const [productId, product] of incomingById.entries()) {
      if (recommendedIds.has(productId)) {
        skippedBecauseAlreadySaved += 1;
        continue;
      }

      if (importedById.has(productId)) {
        importedById.set(productId, product);
        updated += 1;
        continue;
      }

      if (uniqueIds.size >= WATCHLIST_LIMIT) {
        skippedBecauseLimit += 1;
        continue;
      }

      importedById.set(productId, product);
      uniqueIds.add(productId);
      added += 1;
    }

    const nextState: WatchlistState = {
      ...current,
      importedProducts: [...importedById.values()],
    };
    writeWatchlistSnapshot(nextState);

    return {
      added,
      updated,
      skippedBecauseAlreadySaved,
      skippedBecauseLimit,
    };
  };

  const updateProductData = (productId: string) => {
    const current = getWatchlistSnapshot();
    const timestamp = new Date().toISOString();

    const nextImported = current.importedProducts.map((product) =>
      product.id === productId
        ? {
            ...product,
            lastUpdated: timestamp,
            lastValidation: timestamp,
            updateType: "updated" as const,
          }
        : product,
    );

    const nextState: WatchlistState = {
      ...current,
      importedProducts: nextImported,
      manualUpdatedAt: {
        ...current.manualUpdatedAt,
        [productId]: timestamp,
      },
    };

    writeWatchlistSnapshot(nextState);
  };

  const updateAllWatchlistData = () => {
    const current = getWatchlistSnapshot();
    const timestamp = new Date().toISOString();
    const allIds = new Set([...current.ids, ...current.importedProducts.map((product) => product.id)]);

    const nextManual = { ...current.manualUpdatedAt };
    for (const id of allIds) {
      nextManual[id] = timestamp;
    }

    const nextImported = current.importedProducts.map((product) => ({
      ...product,
      lastUpdated: timestamp,
      lastValidation: timestamp,
      updateType: "updated" as const,
    }));

    const nextState: WatchlistState = {
      ...current,
      importedProducts: nextImported,
      manualUpdatedAt: nextManual,
    };

    writeWatchlistSnapshot(nextState);
  };

  return {
    ids: state.ids,
    importedProducts: state.importedProducts,
    manualUpdatedAt: state.manualUpdatedAt,
    totalCount,
    remainingSlots,
    toggleRecommendation,
    removeFromWatchlist,
    importProducts,
    updateProductData,
    updateAllWatchlistData,
  };
}

export function useWatchlistIds() {
  const { ids, toggleRecommendation } = useWatchlist();

  const toggle = (id: string) => {
    toggleRecommendation(id);
  };

  return { ids, toggle };
}

export function WatchlistButton({ productId }: { productId: string }) {
  const { ids, importedProducts, toggleRecommendation, remainingSlots } = useWatchlist();
  const isSaved = ids.includes(productId);
  const alreadyImported = importedProducts.some((product) => product.id === productId);
  const limitReached = !isSaved && !alreadyImported && remainingSlots <= 0;

  return (
    <Button
      variant={isSaved ? "secondary" : "ghost"}
      size="sm"
      onClick={() => {
        const result = toggleRecommendation(productId);
        if (!result.ok && result.reason === "limit_reached") {
          window.alert(`Watchlist limit reached (${WATCHLIST_LIMIT} products).`);
        }
      }}
      type="button"
      disabled={limitReached}
      title={limitReached ? `Watchlist limit reached (${WATCHLIST_LIMIT})` : undefined}
    >
      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
