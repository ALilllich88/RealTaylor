import { useNavigate } from 'react-router-dom';
import { Car, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RepsProgress } from '@/components/dashboard/RepsProgress';
import { MileageSummary } from '@/components/dashboard/MileageSummary';
import { OdometerCard } from '@/components/dashboard/OdometerCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useDashboard } from '@/hooks/useDashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useDashboard();

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold">RealTaylor</h1>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => refetch()} className="p-2 text-muted-foreground">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => navigate('/log-miles')} size="xl" className="h-16 flex-col gap-1 bg-blue-600 hover:bg-blue-700">
          <Car className="h-6 w-6" />
          <span className="text-sm font-semibold">Log Miles</span>
        </Button>
        <Button onClick={() => navigate('/log-hours')} size="xl" className="h-16 flex-col gap-1 bg-purple-600 hover:bg-purple-700">
          <Clock className="h-6 w-6" />
          <span className="text-sm font-semibold">Log Hours</span>
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          <RepsProgress data={data} />
          <MileageSummary data={data} />
          <OdometerCard data={data} />

          {/* Monthly Hours Chart */}
          {data.monthlyHours.some((m) => m.hours > 0) && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Hours</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data.monthlyHours} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)} hrs`, 'Hours']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RecentActivity items={data.recentActivity} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
