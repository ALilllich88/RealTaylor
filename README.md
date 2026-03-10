# RealTaylor

**REPS Hours & Mileage Tracker** — A mobile-first web app for Taylor Lillich to log real estate professional hours and vehicle mileage for IRS tax compliance.

## Features

- **REPS Hours Tracking** — Log real estate work hours across 4 entities. Visual progress toward 750-hr IRS threshold with projected year-end totals.
- **Mileage Logging** — Log every trip with Google Maps auto-calculated distances, round-trip toggle, and business purpose.
- **Auto-Hours from Trips** — Business mileage entries automatically create linked travel hours entries.
- **Favorite Places** — Save frequently used addresses for one-tap trip selection.
- **IRS-Compliant Reports** — Export hours reports, mileage logs, and annual CPA summaries to PDF and CSV.
- **Mobile-First** — Optimized for iPhone use with bottom navigation and large tap targets.

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL (or use the Docker Compose setup)
- Google Maps API key with Distance Matrix API enabled

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd RealTaylor
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Run database migrations and seed
npm run db:migrate
npm run db:seed

# 4. Start dev server (runs both server on :3000 and client on :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and enter your PIN (default: `1234`).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key | — |
| `APP_PIN` | Login PIN | `1234` |
| `JWT_SECRET` | JWT signing secret (change in production!) | `dev-secret-...` |
| `IRS_MILEAGE_RATE` | IRS standard mileage rate per mile | `0.70` |
| `PORT` | Server port | `3000` |

## Docker Compose (Self-Hosted)

```bash
cp .env.example .env
# Set GOOGLE_MAPS_API_KEY, APP_PIN, JWT_SECRET in .env

docker-compose up -d

# Seed the database
docker-compose exec app npx prisma db seed
```

App will be available at `http://localhost:3000`.

## Railway Deployment

1. Create a new Railway project and add a PostgreSQL plugin.
2. Set the following environment variables in Railway:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL plugin)
   - `GOOGLE_MAPS_API_KEY`
   - `APP_PIN`
   - `JWT_SECRET`
   - `IRS_MILEAGE_RATE`
3. Deploy from GitHub — Railway will use the `Dockerfile`.
4. After first deploy, run the seed: `npx prisma db seed` in the Railway shell.

## Entity Reference

| Entity | Color | Badge |
|---|---|---|
| Lillich Holdings | Blue `#2563EB` | LH |
| Lillich Properties | Green `#16A34A` | LP |
| AJL Investments | Orange `#EA580C` | AJL |
| Taylor Lillich, Realtor | Purple `#9333EA` | TLR |
| Personal | Gray `#6B7280` | PER |

## IRS Compliance Notes

- **REPS**: The IRS requires 750+ hours/year in real estate activities, with more than 50% of total working time in real estate. Every hours entry must include a date, entity, specific activity type, and description.
- **Mileage**: The IRS requires a contemporaneous mileage log with date, destination, business purpose, and miles. All fields are required.
- Keep this app's exports for at least 7 years in case of audit.
