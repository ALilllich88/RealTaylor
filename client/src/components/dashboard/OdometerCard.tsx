import { useState } from 'react';
import { Gauge, Plus, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOdometerReadings, useCreateOdometerReading } from '@/hooks/useOdometer';
import type { DashboardData } from '@shared/types';

interface Props {
  data: DashboardData;
}

function formatOdometer(miles: number): string {
  return miles.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OdometerCard({ data }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [reading, setReading] = useState('');
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const { data: readings = [] } = useOdometerReadings();
  const create = useCreateOdometerReading();

  // Derive latest and first-of-year from the live readings list
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const sorted = [...readings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestOdometer = sorted[0] ?? null;
  const firstYearOdometer =
    [...readings]
      .filter((r) => new Date(r.date) >= yearStart)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  const businessMilesPct: number | null =
    latestOdometer &&
    firstYearOdometer &&
    latestOdometer.reading > firstYearOdometer.reading
      ? Math.round((data.ytdBusinessMiles / (latestOdometer.reading - firstYearOdometer.reading)) * 100 * 10) / 10
      : null;

  const pctColor =
    businessMilesPct === null
      ? 'text-gray-500'
      : businessMilesPct >= 50
      ? 'text-green-600'
      : 'text-red-600';

  const pctBg =
    businessMilesPct === null
      ? 'bg-gray-50'
      : businessMilesPct >= 50
      ? 'bg-green-50'
      : 'bg-red-50';

  async function handleSubmit() {
    const val = parseFloat(reading);
    if (!val || isNaN(val)) return;
    await create.mutateAsync({ date: readingDate, reading: val, notes: notes || undefined });
    setReading('');
    setNotes('');
    setShowForm(false);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            Odometer
          </CardTitle>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3 w-3" />
              Post Reading
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Latest reading */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 font-medium">Last Reading</div>
            {latestOdometer ? (
              <>
                <div className="font-bold text-gray-800 text-lg leading-tight">
                  {formatOdometer(latestOdometer.reading)}
                </div>
                <div className="text-xs text-gray-400">mi · {formatDate(latestOdometer.date)}</div>
              </>
            ) : (
              <div className="text-xs text-gray-400 mt-1">No reading posted yet</div>
            )}
          </div>

          {/* Business % */}
          <div className={`${pctBg} rounded-lg p-3`}>
            <div className={`text-xs font-medium ${pctColor}`}>Business %</div>
            {businessMilesPct !== null ? (
              <>
                <div className={`font-bold text-lg leading-tight ${pctColor}`}>
                  {businessMilesPct.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">of total driven</div>
              </>
            ) : latestOdometer && !firstYearOdometer ? (
              <div className="text-xs text-gray-400 mt-1">Need a year-start reading</div>
            ) : (
              <div className="text-xs text-gray-400 mt-1">Post a reading to calculate</div>
            )}
          </div>
        </div>

        {/* Denominator detail */}
        {firstYearOdometer && latestOdometer && latestOdometer.reading > firstYearOdometer.reading && (
          <div className="text-xs text-muted-foreground px-1">
            {formatOdometer(data.ytdBusinessMiles)} biz mi ÷{' '}
            {formatOdometer(latestOdometer.reading - firstYearOdometer.reading)} total driven
            {' '}(since {formatDate(firstYearOdometer.date)})
          </div>
        )}

        {/* Inline form */}
        {showForm && (
          <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">New Odometer Reading</span>
              <button onClick={() => setShowForm(false)} className="text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Reading (miles)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 48350"
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Date</label>
                <input
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. annual start reading"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <Button
              size="sm"
              className="w-full h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={!reading || create.isPending}
            >
              <Check className="h-3.5 w-3.5" />
              {create.isPending ? 'Saving…' : 'Save Reading'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
