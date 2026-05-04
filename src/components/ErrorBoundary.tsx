import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error?.includes('permission-denied')) {
            isPermissionError = true;
            errorMessage = "You don't have permission to access this data. Please ensure you're logged in with the correct account.";
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[32px] border border-slate-200 shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-ug-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-ug-red" size={32} />
            </div>
            
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-4">
              {isPermissionError ? "Access Denied" : "Something went wrong"}
            </h1>
            
            <p className="text-slate-500 mb-8 leading-relaxed">
              {errorMessage}
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
              >
                <RefreshCcw size={18} />
                Try Again
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                <Home size={18} />
                Go to Home
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Error ID: {Math.random().toString(36).substring(7).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
