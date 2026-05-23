"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Target,
  Flame,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  target: Target,
  flame: Flame,
  users: Users,
  settings: Settings,
};

export function MobileNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 p-3" role="navigation" aria-label="Mobile navigation">
      {siteConfig.nav.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <SheetClose key={item.href} render={
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70"
              )}
              aria-current={isActive ? "page" : undefined}
            />
          }>
            {Icon && <Icon className="size-5 shrink-0" />}
            <span>{item.title}</span>
          </SheetClose>
        );
      })}
    </nav>
  );
}
