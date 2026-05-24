import type { ReactNode } from "react";
import type { DashboardShape } from "../lib/dashboard-layout";

interface DashboardGridProps {
  shape: DashboardShape;
  hero: ReactNode;
  secondary?: ReactNode;
  sidebar: ReactNode;
}

/**
 * Dispatches between the two layout shapes:
 *
 *  - `12col-with-secondary`: 8-col left (hero + optional secondary stack) +
 *    4-col right sidebar (sticky-ish on long screens).
 *  - `2col-split`: ~7/5 split — left holds the full-width hero stack,
 *    right holds the compact sidebar stack. No `secondary` slot.
 *
 * Both shapes collapse to a single column below `lg`.
 */
export function DashboardGrid({
  shape,
  hero,
  secondary,
  sidebar,
}: DashboardGridProps) {
  if (shape === "2col-split") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6 min-w-0">
          {hero}
        </div>
        <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-6 min-w-0">
          {sidebar}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-6 min-w-0">
        {hero}
        {secondary}
      </div>
      <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 min-w-0">
        {sidebar}
      </div>
    </div>
  );
}
