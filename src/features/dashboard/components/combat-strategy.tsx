"use client";

import type { VibeIntelData } from "../lib/types";

interface CombatStrategyCardProps {
  data: VibeIntelData;
}

export function CombatStrategyCard({ data }: CombatStrategyCardProps) {
  if (data.kind !== "combat-strategy") {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Intel not available.</p>
      </div>
    );
  }

  const { protocols } = data;

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-telemetry text-muted-foreground">Combat Strategy</h3>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          TACTICAL NOTES
        </span>
      </div>
      <div className="p-5 space-y-5">
        {protocols.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Intel not yet available for this map.
          </p>
        ) : (
          protocols.map((protocol) => (
            <div key={protocol.title} className="space-y-1.5">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-tight">
                {protocol.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {protocol.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
