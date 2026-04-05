import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isCORS = false;

      try {
        const parsed = JSON.parse(this.state.error?.message || '{}');
        if (parsed.error) {
          errorMessage = parsed.error;
          if (errorMessage.includes('insufficient permissions')) {
            errorMessage = 'You do not have permission to perform this action. Please check your role or contact an administrator.';
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      if (errorMessage.toLowerCase().includes('cors') || errorMessage.toLowerCase().includes('failed to fetch')) {
        isCORS = true;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Card className="w-full max-w-md border-red-100 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle size={24} />
              </div>
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
              <CardDescription>
                The application encountered an error and couldn't continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 border border-slate-200">
                <p className="font-mono break-all">{errorMessage}</p>
              </div>
              {isCORS && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800">
                  <p className="font-bold mb-1">Possible CORS Issue Detected</p>
                  <p>If you were trying to upload a file, you may need to configure CORS on your Firebase Storage bucket. See the <code>cors.json</code> file in the project root for instructions.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
