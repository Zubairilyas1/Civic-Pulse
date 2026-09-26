import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("CivicPulse frontend error", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
          <section aria-live="assertive" className="max-w-md rounded-xl border border-rose-900 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-rose-300">Something went wrong</p>
            <h1 className="mt-2 text-xl font-semibold">CivicPulse could not display this page.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Your complaint data was not changed. Refresh the page to continue working.
            </p>
            <button
              className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
