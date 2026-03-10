export { ENTITIES, HOUR_ENTITIES, ACTIVITY_TYPES, PLACE_CATEGORIES, REPS_THRESHOLD, DEFAULT_IRS_MILEAGE_RATE } from '@shared/types';

export const ENTITY_MAP: Record<string, { label: string; abbr: string; color: string }> = {
  'Lillich Holdings':        { label: 'Lillich Holdings',        abbr: 'LH',  color: '#2563EB' },
  'Lillich Properties':      { label: 'Lillich Properties',      abbr: 'LP',  color: '#16A34A' },
  'AJL Investments':         { label: 'AJL Investments',         abbr: 'AJL', color: '#EA580C' },
  'Taylor Lillich, Realtor': { label: 'Taylor Lillich, Realtor', abbr: 'TLR', color: '#9333EA' },
  'Personal':                { label: 'Personal',                abbr: 'PER', color: '#6B7280' },
  'Other':                   { label: 'Other',                   abbr: 'OTH', color: '#CA8A04' },
};

export const IRS_MILEAGE_RATE = parseFloat(import.meta.env.VITE_IRS_MILEAGE_RATE ?? '0.70');
