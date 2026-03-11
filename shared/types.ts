// Shared types between client and server

export const ENTITY_IDS = {
  LILLICH_HOLDINGS: 'Lillich Holdings',
  LILLICH_PROPERTIES: 'Lillich Properties',
  AJL_INVESTMENTS: 'AJL Investments',
  TAYLOR_REALTOR: 'Taylor Lillich, Realtor',
  PERSONAL: 'Personal',
  OTHER: 'Other',
} as const;

export type EntityId = (typeof ENTITY_IDS)[keyof typeof ENTITY_IDS];

export const ENTITIES = [
  { value: 'Lillich Holdings',        label: 'Lillich Holdings',        abbr: 'LH',  color: '#2563EB' },
  { value: 'Lillich Properties',      label: 'Lillich Properties',      abbr: 'LP',  color: '#16A34A' },
  { value: 'AJL Investments',         label: 'AJL Investments',         abbr: 'AJL', color: '#EA580C' },
  { value: 'Taylor Lillich, Realtor', label: 'Taylor Lillich, Realtor', abbr: 'TLR', color: '#9333EA' },
  { value: 'Personal',                label: 'Personal',                abbr: 'PER', color: '#6B7280' },
  { value: 'Other',                   label: 'Other',                   abbr: 'OTH', color: '#CA8A04' },
] as const;

// Hours entries cannot be "Personal"
export const HOUR_ENTITIES = ENTITIES.filter((e) => e.value !== 'Personal');

export const ACTIVITY_TYPES = [
  'Property Management',
  'Inspect Equipment',
  'Inspect Property',
  'Leasing / Tenant Relations',
  'Collect or Deposit Rent',
  'Property Showings',
  'Marketing / Listing',
  'Administrative / Paperwork',
  'Property Maintenance Coordination',
  'Property Acquisition Activities',
  'Travel (real estate related)',
  'Continuing Education',
  'Other',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Entity-specific business purpose lists for the Log Miles form.
// Entities not listed here use a free-text description field instead.
export const BUSINESS_PURPOSES: Partial<Record<string, readonly string[]>> = {
  'Lillich Holdings': [
    'Property Management',
    'Inspect Equipment',
    'Leasing / Tenant Relations',
    'Collect or Deposit Rent',
    'Travel (real estate related)',
    'Property Acquisition Activities',
    'Other',
  ],
  'Lillich Properties': [
    'Property Management',
    'Inspect Property',
    'Leasing / Tenant Relations',
    'Collect or Deposit Rent',
    'Travel (real estate related)',
    'Property Acquisition Activities',
    'Other',
  ],
  'AJL Investments': [
    'Property Management',
    'Inspect Property',
    'Leasing / Tenant Relations',
    'Collect or Deposit Rent',
    'Travel (real estate related)',
    'Property Acquisition Activities',
    'Other',
  ],
};

// Maps FavoritePlace name keywords → default entity for auto-population.
export const PLACE_ENTITY_DEFAULTS: Array<{ contains: string; entity: string }> = [
  { contains: 'Envoltz',     entity: 'Lillich Holdings' },
  { contains: 'Sundance',    entity: 'Lillich Properties' },
  { contains: 'Beach House', entity: 'AJL Investments' },
];

export const PLACE_CATEGORIES = ['Home', 'Office', 'Client', 'Government', 'Other'] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const REPS_THRESHOLD = 750;
export const DEFAULT_IRS_MILEAGE_RATE = 0.70;
export const AVG_SPEED_MPH = 45; // Used to estimate drive time from miles

// --- API Types ---

export interface FavoritePlace {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  category?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MileageEntry {
  id: string;
  date: string;
  fromPlaceId?: string | null;
  fromPlace?: FavoritePlace | null;
  fromAddress?: string | null;
  toPlaceId?: string | null;
  toPlace?: FavoritePlace | null;
  toAddress?: string | null;
  calculatedMiles?: number | null;
  actualMiles: number;
  isRoundTrip: boolean;
  odometerReading?: number | null;
  entity: string;
  entityOther?: string | null;
  description: string;
  notes?: string | null;
  autoHoursEntry?: HoursEntry | null;
  createdAt: string;
  updatedAt: string;
}

export interface HoursEntry {
  id: string;
  date: string;
  entity: string;
  entityOther?: string | null;
  activityType: string;
  activityOther?: string | null;
  hours: number;
  description: string;
  notes?: string | null;
  isAutoLogged: boolean;
  mileageEntryId?: string | null;
  mileageEntry?: MileageEntry | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  ytdHours: number;
  ytdBusinessMiles: number;
  ytdPersonalMiles: number;
  ytdTotalMiles: number;
  hoursByEntity: { entity: string; hours: number }[];
  hoursByActivity: { activityType: string; hours: number }[];
  monthlyHours: { month: string; hours: number }[];
  recentActivity: RecentActivityItem[];
  projectedYearEnd: number;
  isOnPace: boolean;
  paceStatus: 'on-track' | 'behind' | 'significantly-behind';
}

export interface RecentActivityItem {
  id: string;
  type: 'mileage' | 'hours';
  date: string;
  entity: string;
  description: string;
  value: number; // miles or hours
  isAutoLogged?: boolean;
}

export interface CalculateDistanceRequest {
  fromAddress: string;
  toAddress: string;
}

export interface CalculateDistanceResponse {
  miles: number;
  cached: boolean;
}
