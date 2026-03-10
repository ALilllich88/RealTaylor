import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { LogMiles } from '@/pages/LogMiles';
import { LogHours } from '@/pages/LogHours';
import { Places } from '@/pages/Places';
import { Reports } from '@/pages/Reports';

interface ErrorBoundaryState { error: Error | null }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 max-w-lg mx-auto mt-10">
          <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
          <pre className="text-xs bg-red-50 border border-red-200 rounded p-3 whitespace-pre-wrap break-words">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/log-miles" element={<ErrorBoundary><LogMiles /></ErrorBoundary>} />
          <Route path="/log-miles/:id" element={<ErrorBoundary><LogMiles /></ErrorBoundary>} />
          <Route path="/log-hours" element={<ErrorBoundary><LogHours /></ErrorBoundary>} />
          <Route path="/log-hours/:id" element={<ErrorBoundary><LogHours /></ErrorBoundary>} />
          <Route path="/places" element={<ErrorBoundary><Places /></ErrorBoundary>} />
          <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
