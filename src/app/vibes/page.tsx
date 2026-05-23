"use client";

import { useVibeConfig } from "@/features/vibes/hooks/use-vibe-config";
import { VibeCard } from "@/features/vibes/components/vibe-card";
import { VibeModifierSummary } from "@/features/vibes/components/vibe-modifier-summary";
import { VIBES } from "@/features/vibes/types";

export default function VibesPage() {
  const { activeVibe, setActiveVibe, vibeDefinition, vibeModifier } = useVibeConfig();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Vibes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your short-term raid intent. Switch vibes between raids to shape
            your recommendations.
          </p>
        </div>

        {/* Vibe Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {VIBES.map((vibe) => (
            <VibeCard
              key={vibe.id}
              vibe={vibe}
              isActive={activeVibe === vibe.id}
              onSelect={() => setActiveVibe(vibe.id)}
            />
          ))}
        </div>

        {/* Modifier Summary */}
        <VibeModifierSummary
          modifier={vibeModifier}
          vibeName={vibeDefinition.name}
        />
      </div>
    </div>
  );
}
