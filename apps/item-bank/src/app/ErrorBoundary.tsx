import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Route-level error boundary.
 *
 * Catches any unhandled rendering error thrown by a descendant component,
 * logs it to the console, and shows a simple recovery UI instead of a
 * blank or broken page.
 *
 * Must be a class component — React's getDerivedStateFromError and
 * componentDidCatch lifecycle methods are not available as hooks.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    // Switch to error UI on the next render after a descendant throws.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
          <p className="text-lg font-medium">Something went wrong</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-border bg-card px-5 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
