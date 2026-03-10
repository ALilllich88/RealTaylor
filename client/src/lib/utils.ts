import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'M/d/yy');
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function decimalToHrMin(hours: number): { hr: number; min: number } {
  const hr = Math.floor(hours);
  const min = Math.round((hours - hr) * 60);
  return { hr, min };
}

export function hrMinToDecimal(hr: number, min: number): number {
  return Math.round((hr + min / 60) * 100) / 100;
}

export function formatMiles(miles: number): string {
  return miles.toFixed(1);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function todayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export type DatePreset = 'this-year' | 'last-year' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';

export function getDateRangeForPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  switch (preset) {
    case 'this-year':
      return { startDate: format(startOfYear(now), 'yyyy-MM-dd'), endDate: format(endOfYear(now), 'yyyy-MM-dd') };
    case 'last-year':
      return { startDate: `${year - 1}-01-01`, endDate: `${year - 1}-12-31` };
    case 'q1':
      return { startDate: `${year}-01-01`, endDate: `${year}-03-31` };
    case 'q2':
      return { startDate: `${year}-04-01`, endDate: `${year}-06-30` };
    case 'q3':
      return { startDate: `${year}-07-01`, endDate: `${year}-09-30` };
    case 'q4':
      return { startDate: `${year}-10-01`, endDate: `${year}-12-31` };
    default:
      return { startDate: format(startOfYear(now), 'yyyy-MM-dd'), endDate: format(endOfYear(now), 'yyyy-MM-dd') };
  }
}
