import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function calculateDistance(
  fromAddress: string,
  toAddress: string
): Promise<{ miles: number; cached: boolean }> {
  const fromNorm = normalizeAddress(fromAddress);
  const toNorm = normalizeAddress(toAddress);

  // Check cache
  const cached = await prisma.distanceCache.findUnique({
    where: { fromAddress_toAddress: { fromAddress: fromNorm, toAddress: toNorm } },
  });
  if (cached) {
    return { miles: cached.miles, cached: true };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/distancematrix/json',
    {
      params: {
        origins: fromAddress,
        destinations: toAddress,
        mode: 'driving',
        units: 'imperial',
        key: apiKey,
      },
    }
  );

  const data = response.data;

  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`No route found between addresses`);
  }

  // distance.value is in meters
  const meters: number = element.distance.value;
  const miles = Math.round((meters / 1609.344) * 100) / 100;

  // Save to cache
  await prisma.distanceCache.create({
    data: { fromAddress: fromNorm, toAddress: toNorm, miles },
  });

  return { miles, cached: false };
}

interface NominatimResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

function formatNominatimAddress(r: NominatimResult): string {
  const a = r.address;
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const city = a.city ?? a.town ?? a.village ?? a.county ?? '';
  const parts = [street, city, a.state, a.postcode].filter(Boolean);
  return parts.length >= 3 ? parts.join(', ') : r.display_name;
}

export async function suggestAddresses(input: string): Promise<string[]> {
  // Use OpenStreetMap Nominatim — free, no extra API key required
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      format: 'json',
      q: input,
      limit: 6,
      countrycodes: 'us',
      addressdetails: 1,
    },
    headers: {
      'User-Agent': 'RealTaylor-REPS-Tracker/1.0',
      'Accept-Language': 'en-US,en',
    },
    timeout: 5000,
  });

  const results: NominatimResult[] = response.data ?? [];
  return results.map(formatNominatimAddress);
}
