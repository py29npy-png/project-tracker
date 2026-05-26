# Project Tracker Web App

Vercel-ready web app for the editable project tracker.

The tracker stores project name, project code, original contract sum, date created, task rows, totals, and export-ready data. PDF export downloads a PDF file; Print opens the browser print window.

## Setup

Open the app with the existing starter script or URL shortcut. Do not open files under `src/` directly in a browser; those are source files and can show syntax errors outside the Next.js app server.

The app opens directly with no login. Without Redis keys, it saves edits to this PC in `.project-tracker-data`. Staff on the same office network can open the LAN link, press `Sync`, and see the same saved tracker. Add Redis keys when you want one shared data source on a Vercel link that works from any network.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` only when adding Vercel Redis.

3. Configure Vercel Marketplace Upstash Redis:
   - Add the Redis integration to the Vercel project.
   - Use either `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the `KV_REST_API_URL` / `KV_REST_API_TOKEN` pair.

4. Run locally:

   ```bash
   npm run dev
   ```

5. Deploy:

   ```bash
   vercel
   vercel --prod
   ```

## CI

The CircleCI workflow in `.circleci/config.yml` installs dependencies, runs TypeScript checks, and builds the app.

## Data

- Local PC latest programme: `.project-tracker-data/work-programme-latest.json`
- Local PC backup snapshots: `.project-tracker-data/backups/*.json`
- Vercel Redis latest programme: `work-programme:latest`
- Vercel Redis backup index: `work-programme:backups`
- Vercel Redis backup snapshots: `work-programme:backup:<timestamp>:v<version>`
- The app keeps the latest 30 backup snapshots.
