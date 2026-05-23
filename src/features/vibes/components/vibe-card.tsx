"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { VibeDefinition } from "../types";

interface VibeCardProps {
  vibe: VibeDefinition;
  isActive: boolean;
  onSelect: () => void;
}

export function VibeCard({ vibe, isActive, onSelect }: VibeCardProps) {
  const { modifier } = vibe;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-card p-5 text-left transition-all duration-200 w-full",
        "hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isActive
          ? "border-primary/50 shadow-lg shadow-primary/20 ring-2 ring-primary/20"
          : "border-border hover:border-primary/30 hover:scale-[1.02]"
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={vibe.name}>
            {vibe.icon}
          </span>
          <h3 className={cn("font-semibold", isActive && "text-primary")}>
            {vibe.name}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {vibe.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {modifier.poiPriority === "loot"
              ? "📍 Loot spots"
              : modifier.poiPriority === "quest"
                ? "📍 Quest POIs"
                : "📍 Boss spawns"}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            💰 {modifier.gearBudgetMultiplier <= 0.5 ? "Budget" : modifier.gearBudgetMultiplier <= 1.0 ? "Standard" : "Premium"}
          </Badge>
          <Badge
            variant={modifier.riskTolerance === "low" ? "outline" : "destructive"}
            className="text-[10px]"
          >
            ⚠️ {modifier.riskTolerance === "low" ? "Low risk" : "High risk"}
          </Badge>
        </div>
      </div>
    </button>
  );
}
