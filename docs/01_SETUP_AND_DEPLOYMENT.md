# Local Setup & Deployment

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

## Quick Start (Demo)

```bash
git clone https://github.com/JonathanWade24/hematrack-showcase.git
cd hematrack-showcase
chmod +x scripts/setup-demo.sh
./scripts/setup-demo.sh

cd app
cp ../.env.example .env.local
# Edit NEXTAUTH_SECRET: openssl rand -base64 32
npm run dev
```

Open http://localhost:3000 and sign in with `admin@demo.local` / `DemoAdmin123!`.

## Environment Variables

Copy `.env.example` to `app/.env.local`:

```env
DATABASE_URL=postgresql://demo:demo@localhost:5432/hema_track_demo
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

## Database

1. Start PostgreSQL: `docker compose up -d postgres`
2. Push schema: `cd app && npm run db:push`
3. Seed demo data: `psql $DATABASE_URL -f database/seed/demo_data.sql`

Optional Metabase: `docker compose up -d metabase` (http://localhost:3001)

## Docker Build (App Only)

```bash
docker build -f app/Dockerfile app/ -t hematrack:local
docker run -p 3000:3000 --env-file app/.env.local hematrack:local
```

## Production Notes

Production deployment used Docker on a secured server with PostgreSQL and Metabase analytics. Internal deployment details are not included in this public portfolio repository.
