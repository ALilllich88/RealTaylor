import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/places
router.get('/', async (_req, res) => {
  try {
    const places = await prisma.favoritePlace.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(places);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// POST /api/places
router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, zip, category, notes } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const place = await prisma.favoritePlace.create({
      data: { name, address, city, state, zip, category, notes },
    });
    res.status(201).json(place);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create place' });
  }
});

// PUT /api/places/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, zip, category, notes } = req.body;
    const place = await prisma.favoritePlace.update({
      where: { id },
      data: { name, address, city, state, zip, category, notes },
    });
    res.json(place);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update place' });
  }
});

// DELETE /api/places/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Count how many mileage entries reference this place
    const fromCount = await prisma.mileageEntry.count({ where: { fromPlaceId: id } });
    const toCount = await prisma.mileageEntry.count({ where: { toPlaceId: id } });
    const totalLinked = fromCount + toCount;
    await prisma.favoritePlace.delete({ where: { id } });
    res.json({ success: true, linkedTripsRemoved: totalLinked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete place' });
  }
});

// GET /api/places/:id/usage
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const fromCount = await prisma.mileageEntry.count({ where: { fromPlaceId: id } });
    const toCount = await prisma.mileageEntry.count({ where: { toPlaceId: id } });
    res.json({ tripCount: fromCount + toCount });
  } catch {
    res.status(500).json({ error: 'Failed to check usage' });
  }
});

export default router;
