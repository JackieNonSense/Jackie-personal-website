"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary for decorative embeds (e.g. the secret key scene, whose
 * environment map loads from a CDN). If the child crashes, render nothing
 * instead of taking down the whole page.
 */
export default class SafeMount extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
