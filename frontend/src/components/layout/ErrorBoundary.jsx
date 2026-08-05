import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
    
    // Automatically reload on chunk load errors or dynamic import failures (common on Vercel deployments)
    if (
      error.name === 'ChunkLoadError' ||
      (error.message && error.message.includes('dynamically imported module')) ||
      (error.message && error.message.includes('Failed to fetch dynamically imported module'))
    ) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full text-center border border-gray-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong.</h2>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error while loading this page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-md"
            >
              Refresh Page
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-red-50 text-left text-sm overflow-auto text-red-800 rounded-lg border border-red-100">
                <p className="font-bold mb-1">Error details (Dev only):</p>
                <pre className="whitespace-pre-wrap">{this.state.error?.toString()}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;
