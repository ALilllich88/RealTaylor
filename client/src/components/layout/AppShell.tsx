import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
