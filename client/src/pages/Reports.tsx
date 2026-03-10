import { useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadReport } from '@/lib/api';
import { getDateRangeForPreset, type DatePreset } from '@/lib/utils';
import { ENTITIES } from '@/lib/constants';

type Format = 'pdf' | 'csv';

function DateRangeFilter({
  startDate, endDate, onStartDate, onEndDate,
}: { startDate: string; endDate: string; onStartDate: (v: string) => void; onEndDate: (v: string) => void }) {
  const [preset, setPreset] = useState<DatePreset>('this-year');

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const { startDate: s, endDate: e } = getDateRangeForPreset(p);
      onStartDate(s);
      onEndDate(e);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Date Range</Label>
        <Select value={preset} onValueChange={(v) => applyPreset(v as DatePreset)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
            <SelectItem value="q1">Q1</SelectItem>
            <SelectItem value="q2">Q2</SelectItem>
            <SelectItem value="q3">Q3</SelectItem>
            <SelectItem value="q4">Q4</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>From</Label>
            <Input type="date" value={startDate} onChange={(e) => onStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={endDate} onChange={(e) => onEndDate(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadButtons({ onDownload, loading }: { onDownload: (f: Format) => void; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <Button onClick={() => onDownload('pdf')} disabled={loading} className="h-12 flex-col gap-0.5 text-xs" variant="default">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Download PDF
      </Button>
      <Button onClick={() => onDownload('csv')} disabled={loading} className="h-12 flex-col gap-0.5 text-xs" variant="outline">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        Download CSV
      </Button>
    </div>
  );
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const yearEnd = `${today.getFullYear()}-12-31`;

  const [hoursStart, setHoursStart] = useState(yearStart);
  const [hoursEnd, setHoursEnd] = useState(yearEnd);

  const [mileageStart, setMileageStart] = useState(yearStart);
  const [mileageEnd, setMileageEnd] = useState(yearEnd);
  const [mileageEntity, setMileageEntity] = useState('all');

  const [annualYear, setAnnualYear] = useState(String(today.getFullYear()));

  const download = async (type: 'hours' | 'mileage' | 'annual-summary', params: Record<string, string>, filename: string) => {
    setLoading(true);
    try {
      await downloadReport(type, params, filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <h1 className="text-xl font-bold pt-2">Reports</h1>
      <p className="text-sm text-muted-foreground">Generate IRS-compliant reports for tax filing.</p>

      <Tabs defaultValue="hours" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="hours" className="flex-1 text-xs">Hours</TabsTrigger>
          <TabsTrigger value="mileage" className="flex-1 text-xs">Mileage</TabsTrigger>
          <TabsTrigger value="annual" className="flex-1 text-xs">Annual</TabsTrigger>
        </TabsList>

        <TabsContent value="hours">
          <Card className="border-0 shadow-sm mt-3">
            <CardHeader><CardTitle className="text-base">REPS Hours Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">All logged real estate work hours. Required for IRS REPS election documentation.</p>
              <DateRangeFilter
                startDate={hoursStart} endDate={hoursEnd}
                onStartDate={setHoursStart} onEndDate={setHoursEnd}
              />
              <DownloadButtons
                loading={loading}
                onDownload={(fmt) => download('hours', { startDate: hoursStart, endDate: hoursEnd, format: fmt }, `reps-hours-${hoursStart}-${hoursEnd}.${fmt}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mileage">
          <Card className="border-0 shadow-sm mt-3">
            <CardHeader><CardTitle className="text-base">Mileage Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">IRS-compliant mileage log with business purpose. Required for standard mileage deduction.</p>
              <DateRangeFilter
                startDate={mileageStart} endDate={mileageEnd}
                onStartDate={setMileageStart} onEndDate={setMileageEnd}
              />
              <div>
                <Label>Filter by Entity</Label>
                <Select value={mileageEntity} onValueChange={setMileageEntity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trips</SelectItem>
                    <SelectItem value="business">Business Only</SelectItem>
                    <SelectItem value="personal">Personal Only</SelectItem>
                    {ENTITIES.filter((e) => e.value !== 'Personal' && e.value !== 'Other').map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DownloadButtons
                loading={loading}
                onDownload={(fmt) => download('mileage', { startDate: mileageStart, endDate: mileageEnd, entity: mileageEntity, format: fmt }, `mileage-${mileageStart}-${mileageEnd}.${fmt}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual">
          <Card className="border-0 shadow-sm mt-3">
            <CardHeader><CardTitle className="text-base">Annual CPA Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">One-page summary of REPS status and mileage deductions. Give this to your CPA.</p>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={annualYear}
                  onChange={(e) => setAnnualYear(e.target.value)}
                  min="2024"
                  max="2030"
                  className="mt-1"
                />
              </div>
              <DownloadButtons
                loading={loading}
                onDownload={(fmt) => download('annual-summary', { year: annualYear, format: fmt }, `annual-summary-${annualYear}.${fmt}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
