"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TeamPermissionPrompt() {
  return (
    <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-6 text-center space-y-3">
      <ShieldAlert className="size-10 mx-auto text-muted-foreground/50" />
      <h3 className="text-sm font-semibold">Team features require TP permission</h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        Your TarkovTracker API token needs the{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-[10px]">TP</code>{" "}
        (Team Progress) permission to view teammates. Generate a new token with
        this permission enabled.
      </p>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a
            href="https://tarkovtracker.org"
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <ExternalLink className="size-3.5 mr-1.5" />
        Go to TarkovTracker
      </Button>
    </div>
  );
}
