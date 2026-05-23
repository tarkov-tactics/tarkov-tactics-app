"use client";

import type { VibeModifier } from "../types";

interface VibeModifierSummaryProps {
  modifier: VibeModifier;
  vibeName: string;
}

export function VibeModifierSummary({ modifier, vibeName }: VibeModifierSummaryProps) {
  const budgetPct = Math.round((modifier.gearBudgetMultiplier / 1.5) * 100);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">
        Active: <span className="text-primary">{vibeName}</span>
      </h3>

      <div className="space-y-3">
        {/* Budget */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Gear Budget</span>
            <span className="font-medium">{modifier.gearBudgetMultiplier}x</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        {/* Risk */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Risk Tolerance</span>
          <span
            className={`font-medium ${modifier.riskTolerance === "low" ? "text-emerald-400" : "text-red-400"}`}
          >
            {modifier.riskTolerance === "low" ? "Low" : "High"}
          </span>
        </div>

        {/* POI Priority */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">POI Priority</span>
          <span className="font-medium capitalize">{modifier.poiPriority}</span>
        </div>
      </div>
    </div>
  );
}
