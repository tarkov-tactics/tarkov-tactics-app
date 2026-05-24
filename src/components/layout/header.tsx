"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
  const { isConnected, progress } = usePlayerState();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:hidden md:px-6">
      {/* Mobile menu (desktop hides the entire header) */}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
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

      {/* Mobile branding */}
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
          TT
        </div>
        <span className="text-sm font-semibold">Tarkov Tactics</span>
      </div>

      <div className="flex-1" />

      {/* Mobile connection chip */}
      <div className="flex items-center text-sm">
        {isConnected && progress ? (
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs hover:bg-primary/10 transition-colors"
          >
            <div className="size-2 rounded-full bg-emerald" />
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {progress.playerLevel}
            </Badge>
          </Link>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <div className="size-2 rounded-full bg-muted-foreground/40" />
            <span>Connect</span>
          </Link>
        )}
      </div>
    </header>
  );
}
