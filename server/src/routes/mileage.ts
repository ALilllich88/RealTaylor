import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateDistance, suggestAddresses } from '../services/googleMaps.js';
import { AVG_SPEED_MPH } from '../constants.js';

const router = Router();
const prisma = new PrismaClient();

function buildFromLabel(entry: { fromPlace?: { name: string } | null; fromAddress?: string | null }): string {
  return entry.fromPlace?.name ?? entry.fromAddress ?? 'Unknown';
}
function buildToLabel(entry: { toPlace?: { name: string } | null; toAddress?: string | null }): string {
  return entry.toPlace?.name ?? entry.toAddress ?? 'Unknown';
}

function buildTravelDescription(from: string, to: string, isRoundTrip: boolean): string {
  return `Travel: ${from} → ${to}${isRoundTrip ? ' (round trip)' : ''}`;
}

function estimateHours(miles: number): number {
  return Math.round((miles / AVG_SPEED_MPH) * 100) / 100;
}

// GET /api/mileage
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, entity, limit } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }
    if (entity) where.entity = entity;

    const entries = await prisma.mileageEntry.findMany({
      where,
      include: {
        fromPlace: true,
        toPlace: true,
        autoHoursEntry: true,
      },
      orderBy: { date: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mileage entries' });
  }
});

// POST /api/mileage
router.post('/', async (req, res) => {
  try {
    const {
      date, fromPlaceId, fromAddress, toPlaceId, toAddress,
      calculatedMiles, actualMiles, isRoundTrip, odometerReading,
      entity, entityOther, description, notes,
      timeAtLocation, // decimal hours spent at destination (optional)
    } = req.body;

    if (!date || actualMiles == null || !entity || !description) {
      res.status(400).json({ error: 'date, actualMiles, entity, and description are required' });
      return;
    }

    // Resolve place names for labels
    const fromPlace = fromPlaceId ? await prisma.favoritePlace.findUnique({ where: { id: fromPlaceId } }) : null;
    const toPlace = toPlaceId ? await prisma.favoritePlace.findUnique({ where: { id: toPlaceId } }) : null;

    const entry = await prisma.mileageEntry.create({
      data: {
        date: new Date(date),
        fromPlaceId: fromPlaceId || null,
        fromAddress: fromAddress || null,
        toPlaceId: toPlaceId || null,
        toAddress: toAddress || null,
        calculatedMiles: calculatedMiles ?? null,
        actualMiles: parseFloat(actualMiles),
        isRoundTrip: !!isRoundTrip,
        odometerReading: odometerReading != null ? parseFloat(odometerReading) : null,
        entity,
        entityOther: entityOther || null,
        description,
        notes: notes || null,
      },
      include: { fromPlace: true, toPlace: true },
    });

    if (entity !== 'Personal') {
      const fromLabel = fromPlace?.name ?? fromAddress ?? 'Unknown';
      const toLabel = toPlace?.name ?? toAddress ?? 'Unknown';
      const hoursEstimate = estimateHours(parseFloat(actualMiles));

      // Auto-create travel hours entry (linked to this mileage entry)
      await prisma.hoursEntry.create({
        data: {
          date: new Date(date),
          entity,
          entityOther: entityOther || null,
          activityType: 'Travel (real estate related)',
          hours: hoursEstimate,
          description: buildTravelDescription(fromLabel, toLabel, !!isRoundTrip),
          isAutoLogged: true,
          mileageEntryId: entry.id,
        },
      });

      // Auto-create "time at location" hours entry if provided (unlinked)
      const locationHours = timeAtLocation != null ? parseFloat(timeAtLocation) : 0;
      if (locationHours > 0) {
        const toLabel2 = toPlace?.name ?? toAddress ?? 'Unknown';
        await prisma.hoursEntry.create({
          data: {
            date: new Date(date),
            entity,
            entityOther: entityOther || null,
            activityType: description, // business purpose selected by user
            hours: Math.round(locationHours * 100) / 100,
            description: `At location: ${toLabel2} — ${description}`,
            isAutoLogged: true,
            mileageEntryId: null, // cannot reuse the unique FK
          },
        });
      }
    }

    const fullEntry = await prisma.mileageEntry.findUnique({
      where: { id: entry.id },
      include: { fromPlace: true, toPlace: true, autoHoursEntry: true },
    });
    res.status(201).json(fullEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create mileage entry' });
  }
});

// GET /api/mileage/address-suggest?input=<query>
router.get('/address-suggest', async (req, res) => {
  try {
    const input = String(req.query.input ?? '').trim();
    if (input.length < 2) {
      res.json({ suggestions: [] });
      return;
    }
    const suggestions = await suggestAddresses(input);
    res.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Autocomplete failed';
    res.status(500).json({ error: message });
  }
});

// PUT /api/mileage/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date, fromPlaceId, fromAddress, toPlaceId, toAddress,
      calculatedMiles, actualMiles, isRoundTrip, odometerReading,
      entity, entityOther, description, notes,
    } = req.body;

    const existing = await prisma.mileageEntry.findUnique({
      where: { id },
      include: { autoHoursEntry: true, fromPlace: true, toPlace: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    // Resolve place names
    const fromPlace = fromPlaceId ? await prisma.favoritePlace.findUnique({ where: { id: fromPlaceId } }) : null;
    const toPlace = toPlaceId ? await prisma.favoritePlace.findUnique({ where: { id: toPlaceId } }) : null;

    const updated = await prisma.mileageEntry.update({
      where: { id },
      data: {
        ...(date ? { date: new Date(date) } : {}),
        fromPlaceId: fromPlaceId ?? existing.fromPlaceId,
        fromAddress: fromAddress ?? existing.fromAddress,
        toPlaceId: toPlaceId ?? existing.toPlaceId,
        toAddress: toAddress ?? existing.toAddress,
        calculatedMiles: calculatedMiles ?? existing.calculatedMiles,
        actualMiles: actualMiles != null ? parseFloat(actualMiles) : existing.actualMiles,
        isRoundTrip: isRoundTrip != null ? !!isRoundTrip : existing.isRoundTrip,
        odometerReading: odometerReading !== undefined
          ? (odometerReading != null ? parseFloat(odometerReading) : null)
          : existing.odometerReading,
        entity: entity ?? existing.entity,
        entityOther: entityOther ?? existing.entityOther,
        description: description ?? existing.description,
        notes: notes ?? existing.notes,
      },
      include: { fromPlace: true, toPlace: true },
    });

    const newEntity = entity ?? existing.entity;
    const newMiles = actualMiles != null ? parseFloat(actualMiles) : existing.actualMiles;
    const newDate = date ? new Date(date) : existing.date;
    const newIsRoundTrip = isRoundTrip != null ? !!isRoundTrip : existing.isRoundTrip;
    const fromLabel = fromPlace?.name ?? fromAddress ?? existing.fromPlace?.name ?? existing.fromAddress ?? 'Unknown';
    const toLabel = toPlace?.name ?? toAddress ?? existing.toPlace?.name ?? existing.toAddress ?? 'Unknown';

    if (existing.autoHoursEntry) {
      if (newEntity === 'Personal') {
        // Changed to personal → delete the hours entry
        await prisma.hoursEntry.delete({ where: { id: existing.autoHoursEntry.id } });
      } else {
        // Update the linked hours entry
        await prisma.hoursEntry.update({
          where: { id: existing.autoHoursEntry.id },
          data: {
            date: newDate,
            entity: newEntity,
            entityOther: entityOther ?? existing.entityOther,
            hours: estimateHours(newMiles),
            description: buildTravelDescription(fromLabel, toLabel, newIsRoundTrip),
          },
        });
      }
    } else if (existing.entity === 'Personal' && newEntity !== 'Personal') {
      // Changed from personal to business → create hours entry
      await prisma.hoursEntry.create({
        data: {
          date: newDate,
          entity: newEntity,
          entityOther: entityOther ?? null,
          activityType: 'Travel (real estate related)',
          hours: estimateHours(newMiles),
          description: buildTravelDescription(fromLabel, toLabel, newIsRoundTrip),
          isAutoLogged: true,
          mileageEntryId: id,
        },
      });
    }

    const fullEntry = await prisma.mileageEntry.findUnique({
      where: { id },
      include: { fromPlace: true, toPlace: true, autoHoursEntry: true },
    });
    res.json(fullEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update mileage entry' });
  }
});

// DELETE /api/mileage/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await prisma.mileageEntry.findUnique({
      where: { id },
      include: { autoHoursEntry: true },
    });
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    const hadAutoHours = !!entry.autoHoursEntry;
    // Cascade delete handles HoursEntry via Prisma onDelete: Cascade
    await prisma.mileageEntry.delete({ where: { id } });
    res.json({ success: true, autoHoursDeleted: hadAutoHours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mileage entry' });
  }
});

// POST /api/mileage/calculate-distance
router.post('/calculate-distance', async (req, res) => {
  try {
    const { fromAddress, toAddress } = req.body as { fromAddress: string; toAddress: string };
    if (!fromAddress || !toAddress) {
      res.status(400).json({ error: 'fromAddress and toAddress are required' });
      return;
    }
    const result = await calculateDistance(fromAddress, toAddress);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Distance calculation failed';
    res.status(500).json({ error: message });
  }
});

// GET /api/mileage/recent-trips — last 5 unique from→to combos
router.get('/recent-trips', async (_req, res) => {
  try {
    const recent = await prisma.mileageEntry.findMany({
      orderBy: { date: 'desc' },
      take: 50,
      include: { fromPlace: true, toPlace: true },
    });

    const seen = new Set<string>();
    const trips: typeof recent = [];
    for (const entry of recent) {
      const key = `${entry.fromPlaceId ?? entry.fromAddress}|${entry.toPlaceId ?? entry.toAddress}`;
      if (!seen.has(key)) {
        seen.add(key);
        trips.push(entry);
        if (trips.length >= 5) break;
      }
    }
    res.json(trips);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recent trips' });
  }
});

export default router;
