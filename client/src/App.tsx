import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { LogMiles } from '@/pages/LogMiles';
import { LogHours } from '@/pages/LogHours';
import { Places } from '@/pages/Places';
import { Reports } from '@/pages/Reports';

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/log-miles" element={<LogMiles />} />
          <Route path="/log-miles/:id" element={<LogMiles />} />
          <Route path="/log-hours" element={<LogHours />} />
          <Route path="/log-hours/:id" element={<LogHours />} />
          <Route path="/places" element={<Places />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
