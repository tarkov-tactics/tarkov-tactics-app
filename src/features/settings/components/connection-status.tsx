"use client";

import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Shield,
  Crosshair,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePlayerState } from "@/hooks/use-player-state";

export function ConnectionStatus() {
  const { connectionStatus, progress, gameMode, error, lastUpdated } =
    usePlayerState();

  if (connectionStatus === "disconnected") {
    return null;
  }

  if (connectionStatus === "validating") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Validating token…</span>
      </div>
    );
  }

  if (connectionStatus === "error") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">Connection failed</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // connected
  if (!progress) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-primary" />
        <span className="text-sm font-medium">Connected</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Player</span>
          <span className="ml-auto font-medium truncate max-w-[120px]">
            {progress.displayName || "Unknown"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Shield className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Level</span>
          <Badge variant="secondary" className="ml-auto">
            {progress.playerLevel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Crosshair className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Faction</span>
          <Badge variant="outline" className="ml-auto">
            {progress.pmcFaction}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
        <span>
          Mode:{" "}
          <span className="font-medium uppercase">{gameMode ?? "—"}</span>
        </span>
        {lastUpdated && (
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
