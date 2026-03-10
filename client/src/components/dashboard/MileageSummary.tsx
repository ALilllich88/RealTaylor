import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IRS_MILEAGE_RATE } from '@/lib/constants';
import { formatCurrency, formatMiles } from '@/lib/utils';
import type { DashboardData } from '@shared/types';

interface Props {
  data: DashboardData;
}

export function MileageSummary({ data }: Props) {
  const businessPct = data.ytdTotalMiles > 0
    ? ((data.ytdBusinessMiles / data.ytdTotalMiles) * 100).toFixed(0)
    : '0';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mileage YTD</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">Business</div>
            <div className="font-bold text-blue-800">{formatMiles(data.ytdBusinessMiles)}</div>
            <div className="text-xs text-blue-500">miles</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 font-medium">Personal</div>
            <div className="font-bold text-gray-700">{formatMiles(data.ytdPersonalMiles)}</div>
            <div className="text-xs text-gray-400">miles</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">Deduction</div>
            <div className="font-bold text-green-800">{formatCurrency(data.ytdBusinessMiles * IRS_MILEAGE_RATE)}</div>
            <div className="text-xs text-green-500">{businessPct}% biz</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
