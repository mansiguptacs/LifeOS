# AccessMap AI — Accessible Navigation for Everyone

> A living, AI-powered accessibility map that helps wheelchair users, parents with
> strollers, older adults, and anyone with mobility needs plan **step-free,
> barrier-aware** journeys — and helps cities find and fix recurring problems.

Access to a city should not depend on physical ability. Most navigation apps optimize
for the fastest route and ignore broken elevators, blocked sidewalks, missing curb
ramps, steep inclines, and stairs-only entrances. **AccessMap AI** treats accessibility
as essential infrastructure by combining live infrastructure data, crowdsourced reports,
and AI-powered photo analysis into one continuously-updating map.

## ✨ Features

1. **Interactive accessibility map** — OpenStreetMap + Leaflet, with clustered markers
   for elevators, curb ramps, accessible entrances/restrooms, crossings, and transit
   stations. Toggle layers and see live status (operational / out of service).
2. **Crowdsourced barrier reports** — anonymously drop a pin, classify the barrier,
   set severity, add a photo, and confirm others' reports with a vote.
3. **Accessible routing** — barrier-aware, step-free routing with a mobility profile
   selector (wheelchair / stroller / walking). Routes are weighted to **avoid reported
   barriers and out-of-service elevators**, and the route summary lists what it avoided.
4. **AI photo analysis** — GPT-4o vision classifies an uploaded photo into a barrier
   type + severity and drafts a description, pre-filling the report form.

## 🧱 Tech Stack

| Layer     | Choice                                                            |
| --------- | ---------------------------------------------------------------- |
| Framework | Next.js (App Router), React, TypeScript                          |
| UI        | Tailwind CSS, shadcn/ui                                          |
| Database  | **Aurora PostgreSQL** (via Prisma ORM + `@prisma/adapter-pg`)    |
| Maps      | OpenStreetMap tiles + Leaflet (free, no key)                     |
| Routing   | OpenRouteService (`wheelchair` profile) with OSRM fallback       |
| Geocoding | Nominatim (OpenStreetMap, free)                                  |
| AI        | OpenAI GPT-4o vision                                             |
| Hosting   | Vercel                                                           |

## 🚀 Getting Started

### 1. Environment

Copy the example env and fill in what you have:

```bash
cp .env.example .env
```

| Variable         | Required | Notes                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Aurora PostgreSQL (or local Postgres) connection string                |
| `ORS_API_KEY`    | optional | Free at https://openrouteservice.org — enables true wheelchair routing |
| `OPENAI_API_KEY` | optional | Enables real GPT-4o photo analysis (otherwise demo mode)               |

> The app is designed to **degrade gracefully**: with no `ORS_API_KEY` it falls back to
> OSRM and still detours around the worst on-route barrier; with no `OPENAI_API_KEY`
> the AI button runs in clearly-labelled demo mode.

### 2. Database

For local development a self-contained Postgres cluster (no Docker/sudo) is included:

```bash
npm run db:start      # start local Postgres on :5432
npm run db:migrate    # apply Prisma migrations
npm run db:seed       # seed the San Jose -> Santa Clara demo corridor
```

For Aurora PostgreSQL, point `DATABASE_URL` at your cluster and run
`npm run db:migrate` + `npm run db:seed`.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## 🎬 Demo Script

1. **Explore** — the map opens on the San Jose <-> Santa Clara corridor showing seeded
   accessible features (green) and reported barriers (pulsing red), including a
   **broken elevator at the Santa Clara VTA station**.
2. **Route** — click **"Use demo route (San Jose -> Santa Clara)"**, keep the
   **Wheelchair** profile, and hit **Find route**. The accessible route is drawn and the
   summary shows the barriers it avoided.
3. **Report** — switch to **Report**, pick a location on the map, attach a photo, and
   click **Analyze with AI** to auto-classify the barrier, then submit. It appears on the
   map instantly and is factored into future routes.

## 📁 Project Structure

```
prisma/
  schema.prisma        # AccessibilityFeature, Report, RouteLog models
  seed.ts              # San Jose -> Santa Clara demo corridor data
src/
  app/
    api/               # features, reports, reports/[id]/vote, route, geocode, analyze
    page.tsx
  components/
    map/AccessibilityMap.tsx   # Leaflet map (markers, clustering, route overlay)
    panels/                    # Explore / Report / Route panels
  lib/
    prisma.ts          # Prisma client (pg driver adapter)
    routing.ts         # ORS + OSRM routing with barrier avoidance
    geo.ts             # haversine + demo coordinates
    constants.ts       # type/severity/status metadata
```

## ♿ Accessibility Notes

The UI itself aims to be accessible: semantic landmarks, keyboard-operable controls,
`aria-pressed`/`aria-label` on toggles, and high-contrast severity colors.

---

Built for a hackathon. Map data © OpenStreetMap contributors.
