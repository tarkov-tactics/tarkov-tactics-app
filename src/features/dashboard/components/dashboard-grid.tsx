import type { ReactNode } from "react";

interface DashboardGridProps {
  hero: ReactNode;
  secondary?: ReactNode;
  sidebar: ReactNode;
}

/**
 * 12-column responsive grid for the Dashboard. Hero + secondary stack in the
 * left column (col-span-8); sidebar fills the right column (col-span-4).
 * Collapses to a single column below `lg`.
 */
export function DashboardGrid({ hero, secondary, sidebar }: DashboardGridProps) {
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
