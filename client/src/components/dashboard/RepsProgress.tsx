import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REPS_THRESHOLD } from '@/lib/constants';
import { formatHours } from '@/lib/utils';
import type { DashboardData } from '@shared/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  data: DashboardData;
}

export function RepsProgress({ data }: Props) {
  const pct = Math.min(100, (data.ytdHours / REPS_THRESHOLD) * 100);
  const remaining = Math.max(0, REPS_THRESHOLD - data.ytdHours);

  const statusConfig = {
    'on-track': { color: '#16a34a', barClass: 'bg-green-500', label: 'On track', Icon: TrendingUp },
    'behind': { color: '#ca8a04', barClass: 'bg-yellow-500', label: 'Behind pace', Icon: Minus },
    'significantly-behind': { color: '#dc2626', barClass: 'bg-red-500', label: 'Significantly behind', Icon: TrendingDown },
  }[data.paceStatus];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">REPS Progress</CardTitle>
          <span
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: statusConfig.color }}
          >
            <statusConfig.Icon className="h-3 w-3" />
            {statusConfig.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-3xl font-bold">{data.ytdHours.toFixed(1)}</span>
            <span className="text-muted-foreground text-sm ml-1">/ {REPS_THRESHOLD} hrs</span>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{pct.toFixed(1)}% complete</div>
          </div>
        </div>
        <Progress
          value={pct}
          className="h-3 mb-3"
          indicatorClassName={statusConfig.barClass}
        />
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-semibold text-sm">{formatHours(remaining)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Proj. Year-End</div>
            <div className="font-semibold text-sm" style={{ color: statusConfig.color }}>
              {data.projectedYearEnd.toFixed(0)} hrs
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
