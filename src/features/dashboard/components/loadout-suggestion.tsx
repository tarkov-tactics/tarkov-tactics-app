"use client";

import type { LoadoutSuggestion } from "../lib/types";

interface LoadoutSuggestionCardProps {
  loadout: LoadoutSuggestion;
}

interface LoadoutRow {
  label: string;
  value: string;
  emphasis?: "primary" | "destructive" | "muted";
}

const emphasisStyles: Record<NonNullable<LoadoutRow["emphasis"]>, string> = {
  primary: "text-primary",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export function LoadoutSuggestionCard({ loadout }: LoadoutSuggestionCardProps) {
  const budget = new Intl.NumberFormat("en-US").format(loadout.estimatedBudget);

  const rows: LoadoutRow[] = [
    { label: "Primary WPN", value: loadout.weapon, emphasis: "primary" },
    { label: "Armor", value: loadout.armor },
    { label: "Rig", value: loadout.rig },
  ];

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 flex items-center justify-between gap-3 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Kit Proposal</h3>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          ₽{budget}
        </span>
      </div>

      <div className="p-5 space-y-3">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-telemetry text-muted-foreground">
                {row.label}
              </span>
              <span
                className={`text-xs font-semibold font-mono ${
                  row.emphasis
                    ? emphasisStyles[row.emphasis]
                    : "text-foreground"
                }`}
              >
                {row.value}
              </span>
            </div>
            {i < rows.length - 1 && (
              <div className="h-px bg-border/60 mt-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
