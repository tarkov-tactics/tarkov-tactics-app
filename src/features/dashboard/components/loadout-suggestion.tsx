"use client";

import { Shield } from "lucide-react";
import type { LoadoutSuggestion } from "../lib/types";

interface LoadoutSuggestionCardProps {
  loadout: LoadoutSuggestion;
}

export function LoadoutSuggestionCard({ loadout }: LoadoutSuggestionCardProps) {
  const formatted = new Intl.NumberFormat("en-US").format(loadout.estimatedBudget);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Loadout Suggestion</h3>
          <p className="text-xs text-muted-foreground">
            Estimated budget: ₽{formatted}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/50 p-3 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Weapon
          </p>
          <p className="text-xs font-medium">{loadout.weapon}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Armor
          </p>
          <p className="text-xs font-medium">{loadout.armor}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Rig
          </p>
          <p className="text-xs font-medium">{loadout.rig}</p>
        </div>
      </div>
    </div>
  );
}
