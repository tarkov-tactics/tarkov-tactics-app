"use client";

import {
  Package,
  BriefcaseMedical,
  Cpu,
  Key,
  FolderOpen,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { WatchlistItem } from "../lib/types";

interface ItemWatchlistProps {
  items: WatchlistItem[];
  variant?: "hero" | "compact";
  /** Optional uppercase pill rendered in the card header (e.g., "PRESTIGE TARGETS"). */
  headerPill?: string;
}

function pickIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/(salewa|medkit|medical|ifak|car kit|vaccine|ledx|cms|surv)/i.test(n))
    return BriefcaseMedical;
  if (/(gpu|graphics|cpu|chip|tetriz|electronic)/i.test(n)) return Cpu;
  if (/(key|keycard)/i.test(n)) return Key;
  if (/(folder|intelligence|document|secure flash)/i.test(n)) return FolderOpen;
  if (/(gas analyzer|wrench|tool|drill|hammer|screw)/i.test(n)) return Wrench;
  return Package;
}

export function ItemWatchlist({
  items,
  variant = "hero",
  headerPill,
}: ItemWatchlistProps) {
  const title = variant === "hero" ? "Loot Watchlist: High Priority" : "Item Watchlist";

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-telemetry text-muted-foreground">{title}</h3>
        {headerPill && (
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold font-mono text-primary whitespace-nowrap">
            {headerPill}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">
          <p>
            No quest items to grab this raid. Switch directives, accept new
            tasks at traders, or check back after a refresh.
          </p>
        </div>
      ) : variant === "compact" ? (
        <div className="p-4 space-y-2">
          {items.map((item) => {
            const Icon = pickIcon(item.itemName);
            return (
              <div
                key={item.itemId}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-xs font-medium truncate">
                    {item.itemName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                  {item.reason}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 space-y-2.5">
          {items.map((item) => {
            const Icon = pickIcon(item.itemName);
            return (
              <div
                key={item.itemId}
                className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">
                    {item.itemName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">
                    {item.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
