"use client";

import { Package } from "lucide-react";
import type { WatchlistItem } from "../lib/types";

interface ItemWatchlistProps {
  items: WatchlistItem[];
}

export function ItemWatchlist({ items }: ItemWatchlistProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Item Watchlist</h3>
          <p className="text-xs text-muted-foreground">
            Grab these if you find them
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.itemId}
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm"
          >
            <span className="truncate font-medium">{item.itemName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2 max-w-[180px] truncate">
              {item.reason}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
