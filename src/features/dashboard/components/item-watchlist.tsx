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

export function ItemWatchlist({ items }: ItemWatchlistProps) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Item Watchlist</h3>
      </div>

      {items.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">
          <p>
            No quest items to grab this raid. Switch directives, accept new
            tasks at traders, or check back after a refresh.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-2.5">
          {items.map((item) => {
          const Icon = pickIcon(item.itemName);
          return (
            <div
              key={item.itemId}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <Icon className="size-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {item.itemName}
                </p>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate uppercase tracking-wide">
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
