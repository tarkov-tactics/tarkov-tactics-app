"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="size-8 mx-auto text-destructive" />
          <h3 className="text-sm font-semibold">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
