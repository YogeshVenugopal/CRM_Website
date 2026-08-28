import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to error reporting service in production
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
          <div className="w-full max-w-lg text-center space-y-6">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#EF4444]/10 mx-auto">
              <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-display text-[#16181D]">
                Something went wrong
              </h1>
              <p className="text-sm text-[#8A8FA3] max-w-md mx-auto">
                An unexpected error occurred while rendering this page. Our team has been notified.
              </p>
            </div>

            {/* Error Details (dev only) */}
            {this.state.error && (
              <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-left">
                <p className="text-xs font-mono text-[#EF4444] font-medium mb-2">Error Details:</p>
                <p className="text-xs font-mono text-[#991B1B] break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" icon={RefreshCw} onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="primary" icon={Home} onClick={this.handleGoHome}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
