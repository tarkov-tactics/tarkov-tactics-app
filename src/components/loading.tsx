"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 space-y-3 animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-muted" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading…" }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
