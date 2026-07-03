import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white" id="error-boundary-screen">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading text-red-400">Application Error</h1>
          <p className="text-slate-400 text-sm">
            Something went wrong while rendering this page. We've logged the error and are looking into it.
          </p>
        </div>

        {error && (
          <div className="bg-slate-950 text-left p-4 rounded-lg border border-slate-800 text-xs font-mono overflow-auto max-h-40 text-red-400">
            <p className="font-semibold">{error.toString()}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={resetErrorBoundary}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Module
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reload current page or reset state
        window.location.reload();
      }}
      onError={(error, info) => {
        console.error("Global Error Caught by react-error-boundary:", error, info);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
