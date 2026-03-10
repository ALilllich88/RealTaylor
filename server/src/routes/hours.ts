import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/hours
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

    const entries = await prisma.hoursEntry.findMany({
      where,
      include: { mileageEntry: { include: { fromPlace: true, toPlace: true } } },
      orderBy: { date: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Failed to fetch hours entries' });
  }
});

// POST /api/hours
router.post('/', async (req, res) => {
  try {
    const { date, entity, entityOther, activityType, activityOther, hours, description, notes } = req.body;
    if (!date || !entity || !activityType || hours == null || !description) {
      res.status(400).json({ error: 'date, entity, activityType, hours, and description are required' });
      return;
    }
    const entry = await prisma.hoursEntry.create({
      data: {
        date: new Date(date),
        entity,
        entityOther: entityOther || null,
        activityType,
        activityOther: activityOther || null,
        hours: parseFloat(hours),
        description,
        notes: notes || null,
        isAutoLogged: false,
      },
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hours entry' });
  }
});

// PUT /api/hours/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, entity, entityOther, activityType, activityOther, hours, description, notes } = req.body;
    const entry = await prisma.hoursEntry.update({
      where: { id },
      data: {
        ...(date ? { date: new Date(date) } : {}),
        ...(entity ? { entity } : {}),
        entityOther: entityOther ?? undefined,
        ...(activityType ? { activityType } : {}),
        activityOther: activityOther ?? undefined,
        ...(hours != null ? { hours: parseFloat(hours) } : {}),
        ...(description ? { description } : {}),
        notes: notes ?? undefined,
      },
    });
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to update hours entry' });
  }
});

// DELETE /api/hours/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.hoursEntry.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete hours entry' });
  }
});

export default router;
