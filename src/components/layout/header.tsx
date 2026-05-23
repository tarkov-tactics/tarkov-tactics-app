"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileNavLinks } from "./mobile-nav-links";
import { usePlayerState } from "@/hooks/use-player-state";

export function Header() {
  const pathname = usePathname();
  const { isConnected, isLoading, progress, refresh } = usePlayerState();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-sidebar-border px-4">
            <SheetTitle>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                  TT
                </div>
                <span className="text-sm font-semibold">Tarkov Tactics</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <MobileNavLinks pathname={pathname} />
        </SheetContent>
      </Sheet>

      {/* Desktop branding (hidden on md+ since sidebar has it) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
          TT
        </div>
        <span className="text-sm font-semibold">Tarkov Tactics</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Player info */}
      <div className="flex items-center gap-2 text-sm">
        {isConnected && progress ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refresh}
              disabled={isLoading}
              aria-label="Refresh player data"
            >
              <RefreshCw
                className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Link
              href="/settings"
              className="hidden sm:flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs hover:bg-primary/10 transition-colors"
            >
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="font-medium truncate max-w-[120px]">
                {progress.displayName}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {progress.playerLevel}
              </Badge>
            </Link>
          </>
        ) : (
          <Link
            href="/settings"
            className="hidden sm:flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <div className="size-2 rounded-full bg-muted-foreground/40" />
            <span>Not connected</span>
          </Link>
        )}
      </div>
    </header>
  );
}
