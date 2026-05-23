"use client";

import { WifiOff, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RetryPanelProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  lastUpdated?: Date | null;
}

export function RetryPanel({
  message,
  onRetry,
  isRetrying = false,
  lastUpdated,
}: RetryPanelProps) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <WifiOff className="size-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-amber-400">
            Connection issue
          </p>
          <p className="text-xs text-muted-foreground">{message}</p>
          {lastUpdated && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="w-full"
      >
        <RefreshCw
          className={`size-3.5 mr-1.5 ${isRetrying ? "animate-spin" : ""}`}
        />
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
