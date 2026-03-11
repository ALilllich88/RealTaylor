import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { REPS_THRESHOLD } from '../constants.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', async (_req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // YTD hours
    const hoursEntries = await prisma.hoursEntry.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
    });
    const ytdHours = hoursEntries.reduce((sum, e) => sum + e.hours, 0);

    // YTD miles
    const mileageEntries = await prisma.mileageEntry.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
    });
    const ytdBusinessMiles = mileageEntries
      .filter((e) => e.entity !== 'Personal')
      .reduce((sum, e) => sum + e.actualMiles, 0);
    const ytdPersonalMiles = mileageEntries
      .filter((e) => e.entity === 'Personal')
      .reduce((sum, e) => sum + e.actualMiles, 0);

    // Hours by entity
    const hoursByEntityMap: Record<string, number> = {};
    for (const e of hoursEntries) {
      const key = e.entity === 'Other' ? (e.entityOther || 'Other') : e.entity;
      hoursByEntityMap[key] = (hoursByEntityMap[key] || 0) + e.hours;
    }
    const hoursByEntity = Object.entries(hoursByEntityMap).map(([entity, hours]) => ({ entity, hours }));

    // Hours by activity type
    const hoursByActivityMap: Record<string, number> = {};
    for (const e of hoursEntries) {
      const key = e.activityType === 'Other' ? (e.activityOther || 'Other') : e.activityType;
      hoursByActivityMap[key] = (hoursByActivityMap[key] || 0) + e.hours;
    }
    const hoursByActivity = Object.entries(hoursByActivityMap).map(([activityType, hours]) => ({ activityType, hours }));

    // Monthly hours trend
    const monthlyMap: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      const key = new Date(now.getFullYear(), m, 1).toLocaleString('default', { month: 'short' });
      monthlyMap[key] = 0;
    }
    for (const e of hoursEntries) {
      const key = e.date.toLocaleString('default', { month: 'short' });
      monthlyMap[key] = (monthlyMap[key] || 0) + e.hours;
    }
    const monthlyHours = Object.entries(monthlyMap).map(([month, hours]) => ({ month, hours }));

    // Pace calculation
    const dayOfYear = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
    const projectedYearEnd = dayOfYear > 0 ? (ytdHours / dayOfYear) * daysInYear : 0;
    const expectedHoursAtThisPace = (REPS_THRESHOLD / daysInYear) * dayOfYear;
    const behindBy = expectedHoursAtThisPace - ytdHours;
    const behindPct = expectedHoursAtThisPace > 0 ? behindBy / expectedHoursAtThisPace : 0;
    let paceStatus: 'on-track' | 'behind' | 'significantly-behind';
    if (behindPct <= 0.05) paceStatus = 'on-track';
    else if (behindPct <= 0.20) paceStatus = 'behind';
    else paceStatus = 'significantly-behind';

    // Recent activity (last 10 combined)
    const recentHours = await prisma.hoursEntry.findMany({
      orderBy: { date: 'desc' }, take: 10,
    });
    const recentMileage = await prisma.mileageEntry.findMany({
      orderBy: { date: 'desc' }, take: 10,
      include: { fromPlace: true, toPlace: true },
    });

    const recentActivity = [
      ...recentHours.map((e) => ({
        id: e.id, type: 'hours' as const,
        date: e.date.toISOString(),
        entity: e.entity, description: e.description,
        value: e.hours, isAutoLogged: e.isAutoLogged,
      })),
      ...recentMileage.map((e) => ({
        id: e.id, type: 'mileage' as const,
        date: e.date.toISOString(),
        entity: e.entity,
        description: e.description,
        value: e.actualMiles, isAutoLogged: false,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Odometer stats
    const latestOdometer = await prisma.odometerReading.findFirst({
      orderBy: { date: 'desc' },
    });
    const firstYearOdometer = await prisma.odometerReading.findFirst({
      where: { date: { gte: yearStart, lte: yearEnd } },
      orderBy: { date: 'asc' },
    });

    let businessMilesPct: number | null = null;
    if (
      latestOdometer &&
      firstYearOdometer &&
      latestOdometer.reading > firstYearOdometer.reading
    ) {
      const totalDriven = latestOdometer.reading - firstYearOdometer.reading;
      businessMilesPct = Math.round((ytdBusinessMiles / totalDriven) * 100 * 10) / 10;
    }

    res.json({
      ytdHours: Math.round(ytdHours * 100) / 100,
      ytdBusinessMiles: Math.round(ytdBusinessMiles * 100) / 100,
      ytdPersonalMiles: Math.round(ytdPersonalMiles * 100) / 100,
      ytdTotalMiles: Math.round((ytdBusinessMiles + ytdPersonalMiles) * 100) / 100,
      hoursByEntity,
      hoursByActivity,
      monthlyHours,
      recentActivity,
      projectedYearEnd: Math.round(projectedYearEnd * 10) / 10,
      isOnPace: paceStatus === 'on-track',
      paceStatus,
      latestOdometer: latestOdometer
        ? { reading: latestOdometer.reading, date: latestOdometer.date.toISOString() }
        : null,
      firstYearOdometer: firstYearOdometer
        ? { reading: firstYearOdometer.reading, date: firstYearOdometer.date.toISOString() }
        : null,
      businessMilesPct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
