"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/** Converts a renderer crash into the same fallback path as a load failure. */
export class BoardErrorBoundary extends Component<
  { onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error.message || "Board renderer failed");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
