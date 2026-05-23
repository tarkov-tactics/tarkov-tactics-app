"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="mx-auto max-w-md space-y-4 p-8 text-center">
          <AlertTriangle className="size-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={reset}>
            <RefreshCw className="size-4 mr-2" />
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
