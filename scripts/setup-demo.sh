#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Starting PostgreSQL..."
docker compose up -d postgres

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U demo -d hema_track_demo >/dev/null 2>&1; do
  sleep 2
done

export DATABASE_URL="${DATABASE_URL:-postgresql://demo:demo@localhost:5432/hema_track_demo}"

echo "Pushing Drizzle schema..."
cd app
npm install --silent
npx drizzle-kit push --force

echo "Seeding demo data..."
docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  psql -U demo -d hema_track_demo -f - < "$ROOT/database/seed/demo_data.sql" 2>/dev/null || \
  PGPASSWORD=demo psql -h localhost -U demo -d hema_track_demo -f "$ROOT/database/seed/demo_data.sql"

echo ""
echo "Demo database ready."
echo "  Database: postgresql://demo:demo@localhost:5432/hema_track_demo"
echo "  Admin login: admin@demo.local / DemoAdmin123!"
echo ""
echo "Start the app: cd app && cp ../.env.example .env.local && npm run dev"
