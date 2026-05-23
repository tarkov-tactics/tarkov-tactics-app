"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskIndicator } from "../lib/types";

interface RiskPanelProps {
  risks: RiskIndicator[];
}

const severityColors = {
  low: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  medium: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  high: "bg-red-400/10 text-red-400 border-red-400/20",
};

const typeIcons: Record<string, string> = {
  boss: "👹",
  pmc: "💀",
  key: "🔑",
};

export function RiskPanel({ risks }: RiskPanelProps) {
  if (risks.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold">Risk Assessment</h3>
          <p className="text-xs text-muted-foreground">Threats on this map</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {risks.map((risk, i) => (
          <Badge
            key={i}
            variant="outline"
            className={cn("text-xs px-3 py-1.5", severityColors[risk.severity])}
          >
            {typeIcons[risk.type] ?? "⚠️"} {risk.description}
          </Badge>
        ))}
      </div>
    </div>
  );
}
