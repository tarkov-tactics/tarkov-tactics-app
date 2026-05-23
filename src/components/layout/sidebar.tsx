"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Flame,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { usePlayerState } from "@/hooks/use-player-state";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  target: Target,
  flame: Flame,
  users: Users,
  settings: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, progress } = usePlayerState();

  return (
    <aside className="hidden md:flex flex-col h-full w-16 lg:w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground transition-all duration-300">
      {/* Branding */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-3 lg:px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            TT
          </div>
          <span className="hidden lg:block text-sm font-semibold truncate">
            {siteConfig.name}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-3" role="navigation" aria-label="Main navigation">
        {siteConfig.nav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  />
                }
              >
                {Icon && <Icon className="size-5 shrink-0" />}
                <span className="hidden lg:block">{item.title}</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer — player status */}
      <div className="border-t border-sidebar-border p-2 lg:p-3">
        {isConnected && progress ? (
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent"
          >
            <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="font-medium truncate">
                {progress.displayName}
              </span>
              <span className="text-sidebar-foreground/50">
                Lvl {progress.playerLevel} · {progress.pmcFaction}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <div className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="hidden lg:block truncate">Not connected</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
