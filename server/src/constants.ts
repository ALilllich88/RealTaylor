// Server-side constants (mirrors shared/types.ts values to avoid cross-workspace TS rootDir issues)

export const AVG_SPEED_MPH = 45;
export const REPS_THRESHOLD = 750;
export const DEFAULT_IRS_MILEAGE_RATE = 0.70;

export const ENTITIES = [
  { value: 'Lillich Holdings',        abbr: 'LH',  color: '#2563EB' },
  { value: 'Lillich Properties',      abbr: 'LP',  color: '#16A34A' },
  { value: 'AJL Investments',         abbr: 'AJL', color: '#EA580C' },
  { value: 'Taylor Lillich, Realtor', abbr: 'TLR', color: '#9333EA' },
  { value: 'Personal',                abbr: 'PER', color: '#6B7280' },
  { value: 'Other',                   abbr: 'OTH', color: '#CA8A04' },
] as const;

export function entityColor(entity: string): string {
  return ENTITIES.find((e) => e.value === entity)?.color ?? '#6B7280';
}

/** Convert an array of objects to a simple CSV string */
export function toCSV(rows: Record<string, unknown>[], fields: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = fields.join(',');
  const body = rows.map((row) => fields.map((f) => escape(row[f])).join(',')).join('\n');
  return `${header}\n${body}`;
}
