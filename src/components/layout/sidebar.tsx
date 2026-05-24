"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Flame,
  Users,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { OperatorIdentity } from "./operator-identity";
import { usePlayerState } from "@/hooks/use-player-state";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  target: Target,
  flame: Flame,
  users: Users,
  settings: Settings,
};

interface NavLinkProps {
  href: string;
  title: string;
  icon: LucideIcon;
  isActive: boolean;
}

function NavLink({ href, title, icon: Icon, isActive }: NavLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
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
        <Icon className="size-5 shrink-0" />
        <span className="hidden lg:block">{title}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, disconnect } = usePlayerState();

  return (
    <aside className="hidden md:flex flex-col h-full w-16 lg:w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground transition-all duration-300">
      {/* Operator identity */}
      <div className="border-b border-sidebar-border px-3 py-4 lg:px-4">
        <OperatorIdentity />
      </div>

      {/* Primary navigation */}
      <nav
        className="flex-1 flex flex-col gap-1 p-2 lg:p-3"
        role="navigation"
        aria-label="Main navigation"
      >
        {siteConfig.primaryNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={Icon}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* Secondary navigation (Settings + Log Out) */}
      <div
        className="border-t border-sidebar-border p-2 lg:p-3 flex flex-col gap-1"
        role="navigation"
        aria-label="Secondary navigation"
      >
        {siteConfig.secondaryNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={Icon}
              isActive={isActive}
            />
          );
        })}

        {isConnected && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={disconnect}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                    "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
                    "active:translate-y-px"
                  )}
                  aria-label="Disconnect from TarkovTracker"
                />
              }
            >
              <LogOut className="size-5 shrink-0" />
              <span className="hidden lg:block">Log Out</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden">
              Log Out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
