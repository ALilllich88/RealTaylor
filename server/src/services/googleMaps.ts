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

export async function suggestAddresses(input: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
    {
      params: {
        input,
        key: apiKey,
        types: 'address',
        language: 'en',
        components: 'country:us',
      },
    }
  );

  const predictions: Array<{ description: string }> = response.data.predictions ?? [];
  return predictions.map((p) => p.description);
}
