import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateHoursPdf, generateMileagePdf, generateAnnualSummaryPdf } from '../services/reportGenerator.js';
import { DEFAULT_IRS_MILEAGE_RATE, toCSV } from '../constants.js';

const router = Router();
const prisma = new PrismaClient();
const irsRate = parseFloat(process.env.IRS_MILEAGE_RATE || String(DEFAULT_IRS_MILEAGE_RATE));

function dateRange(start: string, end: string): string {
  if (start && end) return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`;
  if (start) return `From ${new Date(start).toLocaleDateString()}`;
  if (end) return `Through ${new Date(end).toLocaleDateString()}`;
  return 'All Dates';
}

// GET /api/reports/hours
router.get('/hours', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }

    const entries = await prisma.hoursEntry.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const byEntityMap: Record<string, number> = {};
    const byActivityMap: Record<string, number> = {};
    for (const e of entries) {
      byEntityMap[e.entity] = (byEntityMap[e.entity] || 0) + e.hours;
      byActivityMap[e.activityType] = (byActivityMap[e.activityType] || 0) + e.hours;
    }

    const summary = {
      totalHours: entries.reduce((s, e) => s + e.hours, 0),
      byEntity: byEntityMap,
      byActivity: byActivityMap,
      entryCount: entries.length,
    };

    if (format === 'pdf') {
      const buf = await generateHoursPdf(entries, summary, dateRange(startDate, endDate));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reps-hours-report.pdf"');
      res.send(buf);
      return;
    }

    if (format === 'csv') {
      const fields = ['date', 'entity', 'activityType', 'hours', 'description', 'notes', 'isAutoLogged'];
      const csv = toCSV(entries.map((e) => ({ ...e, date: new Date(e.date).toLocaleDateString() })), fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reps-hours-report.csv"');
      res.send(csv);
      return;
    }

    res.json({ summary, entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate hours report' });
  }
});

// GET /api/reports/mileage
router.get('/mileage', async (req, res) => {
  try {
    const { startDate, endDate, entity, format = 'json' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }
    if (entity && entity !== 'all') {
      if (entity === 'business') where.entity = { not: 'Personal' };
      else if (entity === 'personal') where.entity = 'Personal';
      else where.entity = entity;
    }

    const entries = await prisma.mileageEntry.findMany({
      where,
      include: { fromPlace: true, toPlace: true },
      orderBy: { date: 'asc' },
    });

    const businessMiles = entries.filter((e) => e.entity !== 'Personal').reduce((s, e) => s + e.actualMiles, 0);
    const personalMiles = entries.filter((e) => e.entity === 'Personal').reduce((s, e) => s + e.actualMiles, 0);
    const summary = {
      totalMiles: businessMiles + personalMiles,
      businessMiles, personalMiles,
      businessPct: businessMiles + personalMiles > 0 ? (businessMiles / (businessMiles + personalMiles)) * 100 : 0,
      estimatedDeduction: businessMiles * irsRate,
      irsRate,
    };

    if (format === 'pdf') {
      const buf = await generateMileagePdf(entries, summary, dateRange(startDate, endDate));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="mileage-report.pdf"');
      res.send(buf);
      return;
    }

    if (format === 'csv') {
      const flat = entries.map((e) => ({
        date: new Date(e.date).toLocaleDateString(),
        from: e.fromPlace?.name ?? e.fromAddress ?? '',
        to: e.toPlace?.name ?? e.toAddress ?? '',
        miles: e.actualMiles,
        roundTrip: e.isRoundTrip,
        entity: e.entity,
        description: e.description,
        notes: e.notes ?? '',
      }));
      const csv = toCSV(flat, ['date', 'from', 'to', 'miles', 'roundTrip', 'entity', 'description', 'notes']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="mileage-report.csv"');
      res.send(csv);
      return;
    }

    res.json({ summary, entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate mileage report' });
  }
});

// GET /api/reports/annual-summary
router.get('/annual-summary', async (req, res) => {
  try {
    const { year = String(new Date().getFullYear()), format = 'json' } = req.query as Record<string, string>;
    const yearNum = parseInt(year);
    const start = new Date(yearNum, 0, 1);
    const end = new Date(yearNum, 11, 31, 23, 59, 59);

    const [hoursEntries, mileageEntries] = await Promise.all([
      prisma.hoursEntry.findMany({ where: { date: { gte: start, lte: end } } }),
      prisma.mileageEntry.findMany({ where: { date: { gte: start, lte: end } }, include: { fromPlace: true, toPlace: true } }),
    ]);

    const totalHours = hoursEntries.reduce((s, e) => s + e.hours, 0);
    const businessMiles = mileageEntries.filter((e) => e.entity !== 'Personal').reduce((s, e) => s + e.actualMiles, 0);
    const personalMiles = mileageEntries.filter((e) => e.entity === 'Personal').reduce((s, e) => s + e.actualMiles, 0);

    const hoursByEntityMap: Record<string, number> = {};
    for (const e of hoursEntries) {
      hoursByEntityMap[e.entity] = (hoursByEntityMap[e.entity] || 0) + e.hours;
    }
    const hoursByEntity = Object.entries(hoursByEntityMap).map(([entity, hours]) => ({ entity, hours }));

    const milesByEntityMap: Record<string, number> = {};
    for (const e of mileageEntries) {
      milesByEntityMap[e.entity] = (milesByEntityMap[e.entity] || 0) + e.actualMiles;
    }
    const mileageByEntity = Object.entries(milesByEntityMap).map(([entity, miles]) => ({ entity, miles }));

    const data = {
      year: yearNum, totalHours, hoursByEntity,
      businessMiles, personalMiles, mileageByEntity,
      estimatedDeduction: businessMiles * irsRate, irsRate,
      repsQualified: totalHours >= 750,
    };

    if (format === 'pdf') {
      const buf = await generateAnnualSummaryPdf(data, yearNum);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="annual-summary-${yearNum}.pdf"`);
      res.send(buf);
      return;
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate annual summary' });
  }
});

export default router;
