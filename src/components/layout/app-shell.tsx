import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerStateProvider } from "@/hooks/use-player-state";
import { TeamStateProvider } from "@/hooks/use-team-state";
import { GameDataProvider } from "@/hooks/use-game-data";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerStateProvider>
      <TeamStateProvider>
        <GameDataProvider>
          <TooltipProvider>
            <div className="flex h-full">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          </TooltipProvider>
        </GameDataProvider>
      </TeamStateProvider>
    </PlayerStateProvider>
  );
}
