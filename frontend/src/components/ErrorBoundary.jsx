import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold">Display Error Recovered</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto text-left">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('greenwood_token');
                    localStorage.removeItem('greenwood_user');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold rounded-lg transition-colors text-white"
              >
                Reset Session & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-bold rounded-lg transition-colors text-white"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
