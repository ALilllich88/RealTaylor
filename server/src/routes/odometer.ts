import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/odometer — all readings, newest first
router.get('/', async (_req, res) => {
  try {
    const readings = await prisma.odometerReading.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(readings.map((r) => ({ ...r, date: r.date.toISOString() })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch odometer readings' });
  }
});

// POST /api/odometer — create a new reading
router.post('/', async (req, res) => {
  try {
    const { date, reading, notes } = req.body as {
      date: string;
      reading: number;
      notes?: string;
    };

    if (!date || reading == null) {
      return res.status(400).json({ error: 'date and reading are required' });
    }

    const entry = await prisma.odometerReading.create({
      data: {
        date: new Date(date),
        reading: Number(reading),
        notes: notes || null,
      },
    });

    res.status(201).json({ ...entry, date: entry.date.toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create odometer reading' });
  }
});

export default router;
