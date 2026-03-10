import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Clock, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/log-miles', label: 'Miles', icon: Car },
  { to: '/log-hours', label: 'Hours', icon: Clock },
  { to: '/places', label: 'Places', icon: MapPin },
  { to: '/reports', label: 'Reports', icon: FileText },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm safe-bottom">
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors text-xs font-medium min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
