import { Link } from 'react-router-dom';
import { Car, Clock } from 'lucide-react';
import { EntityBadge } from '@/components/EntityBadge';
import { formatShortDate, formatHours, formatMiles } from '@/lib/utils';
import type { RecentActivityItem } from '@shared/types';

interface Props {
  items: RecentActivityItem[];
}

export function RecentActivity({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No entries yet. Start logging miles or hours!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          to={item.type === 'mileage' ? `/log-miles/${item.id}` : `/log-hours/${item.id}`}
          className="flex items-start gap-3 px-1 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className={`mt-0.5 p-1.5 rounded-lg ${item.type === 'mileage' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
            {item.type === 'mileage' ? <Car className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <EntityBadge entity={item.entity} />
              {item.isAutoLogged && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">auto</span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-0.5 truncate">{item.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-semibold text-gray-700">
              {item.type === 'mileage' ? `${formatMiles(item.value)} mi` : formatHours(item.value)}
            </div>
            <div className="text-xs text-muted-foreground">{formatShortDate(item.date)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
