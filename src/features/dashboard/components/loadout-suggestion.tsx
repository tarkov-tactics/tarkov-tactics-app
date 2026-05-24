"use client";

import { Crosshair, ShieldHalf, Backpack } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { LoadoutSuggestion } from "../lib/types";

interface LoadoutSuggestionCardProps {
  loadout: LoadoutSuggestion;
  variant?: "compact" | "kit-categorized" | "kit-detailed";
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const formatBudget = (n: number) => new Intl.NumberFormat("en-US").format(n);

// ── compact ──────────────────────────────────────────────────────
// Loot Run sidebar: two label/value rows, label-left, mono value right.

function CompactVariant({ loadout }: { loadout: LoadoutSuggestion }) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 pb-3 flex items-center justify-between border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Recommended Kit</h3>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          ₽{formatBudget(loadout.estimatedBudget)}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
          <span className="text-xs font-medium">{loadout.weapon}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Budget</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
          <span className="text-xs font-medium">{loadout.rig}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Capacity</span>
        </div>
      </div>
    </div>
  );
}

// ── kit-categorized ──────────────────────────────────────────────
// Boss Rush sidebar: 4 rows (Primary WPN, Ammo, Armor, Utility) with separators.

interface CategorizedRow {
  label: string;
  value: string;
  emphasis?: "primary" | "destructive" | "muted";
}

const emphasisStyles: Record<NonNullable<CategorizedRow["emphasis"]>, string> = {
  primary: "text-primary",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

function CategorizedVariant({ loadout }: { loadout: LoadoutSuggestion }) {
  const rows: CategorizedRow[] = [
    { label: "Primary WPN", value: loadout.weapon, emphasis: "primary" },
    { label: "Ammo", value: "Flesh Dmg", emphasis: "destructive" },
    { label: "Armor", value: loadout.armor },
    { label: "Utility", value: "Stun / Frag", emphasis: "muted" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 pb-3 flex items-center justify-between border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Recommended Kit</h3>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          ₽{formatBudget(loadout.estimatedBudget)}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-telemetry text-muted-foreground">{row.label}</span>
              <span
                className={`text-xs font-semibold font-mono ${
                  row.emphasis ? emphasisStyles[row.emphasis] : "text-foreground"
                }`}
              >
                {row.value}
              </span>
            </div>
            {i < rows.length - 1 && <div className="h-px bg-border/60 mt-3" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── kit-detailed ─────────────────────────────────────────────────
// PvP hero: 3 equipment rows with icon tiles + sub-labels + total-cost footer.

interface KitRow {
  icon: IconComponent;
  primary: string;
  secondary: string;
}

function DetailedVariant({ loadout }: { loadout: LoadoutSuggestion }) {
  const rows: KitRow[] = [
    { icon: Crosshair, primary: loadout.weapon, secondary: "Primary Weapon" },
    { icon: ShieldHalf, primary: loadout.armor, secondary: "Class Armor" },
    { icon: Backpack, primary: loadout.rig, secondary: "Tactical Rig" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 flex items-center justify-between border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Kit Proposal</h3>
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold font-mono text-primary">
          BUDGET PICK
        </span>
      </div>
      <div className="p-5 space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.secondary}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <Icon className="size-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {row.primary}
                </p>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                  {row.secondary}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        <span className="text-telemetry text-muted-foreground">Est. Total Cost</span>
        <span className="text-sm font-semibold font-mono text-foreground">
          ₽{formatBudget(loadout.estimatedBudget)}
        </span>
      </div>
    </div>
  );
}

export function LoadoutSuggestionCard({
  loadout,
  variant = "kit-categorized",
}: LoadoutSuggestionCardProps) {
  switch (variant) {
    case "compact":
      return <CompactVariant loadout={loadout} />;
    case "kit-detailed":
      return <DetailedVariant loadout={loadout} />;
    case "kit-categorized":
    default:
      return <CategorizedVariant loadout={loadout} />;
  }
}
