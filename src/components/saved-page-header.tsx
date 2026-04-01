"use client";

import { WATCHLIST_LIMIT, useWatchlist } from "@/components/watchlist-button";
import { Badge } from "@/components/ui/badge";

export function SavedPageHeader() {
  const { totalCount } = useWatchlist();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved / Watchlist</h1>
        <Badge variant="neutral">
          Usage: {totalCount} / {WATCHLIST_LIMIT}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Track products you may purchase for future ungating attempts.
      </p>
    </div>
  );
}
