/**
 * GraphErrorBoundary — React class component error boundary for GraphCanvas.
 *
 * Catches unhandled exceptions thrown by the D3 graph engine.
 * Renders the `fallback` prop instead of crashing the full page.
 *
 * Usage:
 *   <GraphErrorBoundary fallback={<GraphErrorState />}>
 *     <GraphCanvas ... />
 *   </GraphErrorBoundary>
 *
 * Architecture note: Error monitoring is not implemented in v1 (browser DevTools
 * sufficient for a passion project). componentDidCatch logs to console only.
 * Sentry or similar is a straightforward v2 addition.
 */

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

// ─── Props & State ────────────────────────────────────────────────────────────

interface Props {
  /** Content to render when no error is caught (normal operation). */
  children: ReactNode;
  /** Fallback UI rendered when the D3 engine throws an unhandled exception. */
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    void error; // Intentionally unused — only the boolean state matters here
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No error monitoring service in v1 — log to console only.
    // v2: forward to Sentry or similar here.
    console.error("[GraphErrorBoundary] Uncaught D3 engine error:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
