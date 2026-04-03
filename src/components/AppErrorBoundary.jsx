import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Erreur front inattendue.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App runtime error:", error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-600">
              Frontend error
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              L&apos;application a rencontre une erreur
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Un crash runtime a ete intercepte. Le message ci-dessous permet d&apos;identifier
              la vraie cause au lieu d&apos;afficher une page vide.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-900 p-4 font-mono text-sm text-slate-100">
              {this.state.errorMessage || "Erreur inconnue"}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
