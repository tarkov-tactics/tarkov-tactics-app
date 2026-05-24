"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Target,
  Flame,
  Users,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { usePlayerState } from "@/hooks/use-player-state";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  target: Target,
  flame: Flame,
  users: Users,
  settings: Settings,
};

function linkClass(isActive: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    isActive
      ? "bg-sidebar-accent text-sidebar-primary"
      : "text-sidebar-foreground/70"
  );
}

export function MobileNavLinks({ pathname }: { pathname: string }) {
  const { isConnected, disconnect } = usePlayerState();

  return (
    <div className="flex flex-col h-full">
      <nav
        className="flex flex-col gap-1 p-3 flex-1"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {siteConfig.primaryNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <SheetClose
              key={item.href}
              render={
                <Link
                  href={item.href}
                  className={linkClass(isActive)}
                  aria-current={isActive ? "page" : undefined}
                />
              }
            >
              {Icon && <Icon className="size-5 shrink-0" />}
              <span>{item.title}</span>
            </SheetClose>
          );
        })}
      </nav>

      <div
        className="flex flex-col gap-1 p-3 border-t border-sidebar-border"
        role="navigation"
        aria-label="Mobile secondary navigation"
      >
        {siteConfig.secondaryNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname.startsWith(item.href);
          return (
            <SheetClose
              key={item.href}
              render={
                <Link
                  href={item.href}
                  className={linkClass(isActive)}
                  aria-current={isActive ? "page" : undefined}
                />
              }
            >
              {Icon && <Icon className="size-5 shrink-0" />}
              <span>{item.title}</span>
            </SheetClose>
          );
        })}

        {isConnected && (
          <SheetClose
            render={
              <button
                type="button"
                onClick={disconnect}
                className={cn(linkClass(false), "w-full text-left active:translate-y-px")}
                aria-label="Disconnect from TarkovTracker"
              />
            }
          >
            <LogOut className="size-5 shrink-0" />
            <span>Log Out</span>
          </SheetClose>
        )}
      </div>
    </div>
  );
}
