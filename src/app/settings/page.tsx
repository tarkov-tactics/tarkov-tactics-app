"use client";

import { TokenInput } from "@/features/settings/components/token-input";
import { DataSyncPanel } from "@/features/settings/components/data-sync-panel";
import { usePlayerState } from "@/hooks/use-player-state";
import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  const { gameMode } = usePlayerState();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure your TarkovTracker connection and app preferences."
        />

        <DataSyncPanel />

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">TarkovTracker API Token</h2>
          <p className="text-sm text-muted-foreground">
            Generate an API token at{" "}
            <a
              href="https://tarkovtracker.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              tarkovtracker.org
            </a>{" "}
            with{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GP</code>{" "}
            (read) permission. Paste it below to enable live progression data.
          </p>
          <TokenInput />
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Game Mode</h2>
          <p className="text-sm text-muted-foreground">
            Automatically detected from your token prefix.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  gameMode === "pvp"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                PVP
              </span>
              <span
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  gameMode === "pve"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                PVE
              </span>
            </div>
            {!gameMode && (
              <span className="text-xs text-muted-foreground">
                Connect to auto-detect
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
