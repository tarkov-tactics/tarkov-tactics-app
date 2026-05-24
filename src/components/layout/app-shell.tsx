import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerStateProvider } from "@/hooks/use-player-state";
import { TeamStateProvider } from "@/hooks/use-team-state";
import { GameDataProvider } from "@/hooks/use-game-data";
import { GoonReportsProvider } from "@/hooks/use-goon-reports";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerStateProvider>
      <TeamStateProvider>
        <GameDataProvider>
          <GoonReportsProvider>
            <TooltipProvider>
              <div className="flex h-full">
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <Header />
                  <main className="flex-1 overflow-y-auto">{children}</main>
                </div>
              </div>
            </TooltipProvider>
          </GoonReportsProvider>
        </GameDataProvider>
      </TeamStateProvider>
    </PlayerStateProvider>
  );
}
