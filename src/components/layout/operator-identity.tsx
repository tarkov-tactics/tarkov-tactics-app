"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerState } from "@/hooks/use-player-state";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OperatorIdentity() {
  const { isConnected, isLoading, progress } = usePlayerState();

  const initials = progress ? initialsFromName(progress.displayName) : null;

  return (
    <Link
      href="/settings"
      className={cn(
        "flex items-center gap-3 transition-colors",
        "hover:bg-sidebar-accent rounded-lg p-2 -m-2"
      )}
      aria-label={
        isConnected && progress
          ? `Operator ${progress.displayName}, level ${progress.playerLevel}`
          : "Not connected — open settings"
      }
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md border",
          isConnected
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/60"
        )}
      >
        {isLoading ? (
          <div className="size-5 rounded-sm animate-pulse bg-primary/40" />
        ) : initials ? (
          <span className="text-sm font-semibold tracking-tight">{initials}</span>
        ) : (
          <Shield className="size-5" aria-hidden />
        )}
      </div>

      {/* Name + level — hidden on collapsed sidebar (64px) */}
      <div className="hidden lg:flex flex-col min-w-0 leading-tight">
        {isLoading && !progress ? (
          <>
            <div className="h-3 w-20 rounded-sm bg-sidebar-accent/60 animate-pulse" />
            <div className="mt-1.5 h-2 w-16 rounded-sm bg-sidebar-accent/60 animate-pulse" />
          </>
        ) : isConnected && progress ? (
          <>
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {progress.displayName}
            </span>
            <span className="text-telemetry text-primary/80 mt-1">
              PMC LEVEL {progress.playerLevel}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-sidebar-foreground/70 truncate">
              OPERATOR
            </span>
            <span className="text-telemetry text-sidebar-foreground/40 mt-1">
              NOT CONNECTED
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
