"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayerState } from "@/hooks/use-player-state";
import { ConnectionStatus } from "./connection-status";

export function TokenInput() {
  const { connectionStatus, isConnected, connect, disconnect } =
    usePlayerState();
  const [inputValue, setInputValue] = useState("");
  const [showToken, setShowToken] = useState(false);

  const isValidating = connectionStatus === "validating";

  async function handleValidate() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    await connect(trimmed);
    // Don't clear input on success — let user see what they pasted
  }

  function handleDisconnect() {
    disconnect();
    setInputValue("");
    setShowToken(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isValidating) {
      handleValidate();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showToken ? "text" : "password"}
            placeholder="Paste your API token here…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            disabled={isValidating}
            className="pr-10 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>

        {isConnected ? (
          <Button variant="destructive" onClick={handleDisconnect}>
            <Unplug className="size-4 mr-1.5" />
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={handleValidate}
            disabled={!inputValue.trim() || isValidating}
          >
            {isValidating && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            {isValidating ? "Validating…" : "Connect"}
          </Button>
        )}
      </div>

      <ConnectionStatus />
    </div>
  );
}
