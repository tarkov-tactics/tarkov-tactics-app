"use client";

import { cn } from "@/lib/utils";
import { useVibeConfig } from "../hooks/use-vibe-config";
import { VIBES } from "../types";

export function VibeQuickSwitch() {
  const { activeVibe, setActiveVibe } = useVibeConfig();

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {VIBES.map((vibe) => (
        <button
          key={vibe.id}
          onClick={() => setActiveVibe(vibe.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            activeVibe === vibe.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          <span>{vibe.icon}</span>
          <span className="hidden sm:inline">{vibe.name}</span>
        </button>
      ))}
    </div>
  );
}
