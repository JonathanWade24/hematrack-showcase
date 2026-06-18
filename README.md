# HemaTrack

**Laboratory data management platform for sickle cell disease research** — merging EMR clinical data with multi-assay laboratory workflows, secured PostgreSQL storage, and Metabase analytics.

Originally developed at [Sheehan Lab](https://github.com/Sheehan-Lab). This public repository is a sanitized portfolio version with **no real patient data**.

## Problem

Research labs running specialized assays (LORRCA, HPLC, Advia, PBMC, plasma, viscosity, and more) need their sample pipeline integrated with EMR clinical context — admissions, labs, medications — without losing data in spreadsheets or siloed exports.

HemaTrack provides:

- Interactive sample processing dashboard with completion status tracking
- Individual and bulk assay data entry
- EPIC pipe-delimited clinical data import pipeline
- Role-based PHI access control
- PostgreSQL multi-schema architecture feeding Metabase analytics

## Architecture

```mermaid
flowchart LR
  subgraph ingest [Data Ingestion]
    EPIC[EPIC EMR Exports]
    Omics[Lab Assay Data]
  end
  subgraph platform [HemaTrack Platform]
    ETL[R and Python ETL]
    App[Next.js Dashboard]
    DB[(PostgreSQL)]
  end
  subgraph analytics [Analytics]
    MB[Metabase]
  end
  EPIC --> ETL --> DB
  Omics --> App --> DB
  DB --> MB
```

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js App Router, Server Actions, Drizzle ORM |
| Database | PostgreSQL 16 — schemas: `clinical`, `laboratory`, `app`, `staging`, `audit` |
| Auth | NextAuth.js with role-based access (`admin`, `viewer`, `noPHI_viewer`, `noPHI_editor`) |
| ETL | R (tidyverse, RPostgres), Python (pandas, psycopg2) |
| Analytics | Metabase (external instance connected to PostgreSQL) |
| Infrastructure | Docker, Docker Compose |

## Repository Structure

```
hematrack/
├── app/                 # Next.js dashboard application
├── database/            # Schema SQL, seed data, security scripts
├── etl/                 # EPIC and omics import pipelines
├── analysis/            # Quarto EDA reports (HTML outputs)
├── docs/                # Architecture and integration documentation
├── docker-compose.yml   # Local PostgreSQL + Metabase
└── scripts/setup-demo.sh
```

## Quick Start

### 1. Clone and set up demo database

```bash
git clone https://github.com/JonathanWade24/hematrack-showcase.git
cd hematrack-showcase
chmod +x scripts/setup-demo.sh
./scripts/setup-demo.sh
```

### 2. Run the application

```bash
cd app
cp ../.env.example .env.local
# Set NEXTAUTH_SECRET: openssl rand -base64 32
npm run dev
```

Open **http://localhost:3000**

| Demo Login | Value |
|------------|-------|
| Email | `admin@demo.local` |
| Password | `DemoAdmin123!` |

### 3. Optional: Metabase

```bash
docker compose up -d metabase
```

Connect Metabase to `postgresql://demo:demo@postgres:5432/hema_track_demo` at **http://localhost:3001**

## Key Features

- **Sample dashboard** — processing funnel, recent samples, completion status by assay type
- **Data entry** — individual sample forms and bulk assay grid entry
- **Sample browser** — search and filter across assay results
- **Clinical import** — EPIC demographics, admissions, labs, medications via ETL scripts
- **RBAC** — PHI visibility controlled per role; lab staff can enter data without seeing patient identifiers
- **Audit trail** — database-level change logging

See [docs/02_SYSTEM_ARCHITECTURE.md](docs/02_SYSTEM_ARCHITECTURE.md) and [docs/07_METABASE_INTEGRATION.md](docs/07_METABASE_INTEGRATION.md) for details.

## ETL Pipeline

Import scripts live in [`etl/`](etl/). They require local EPIC exports (not included):

```bash
export DATA_DIR=/path/to/epic/exports
export PGDATABASE=hema_track_demo PGUSER=demo PGPASSWORD=demo
Rscript etl/epic/import_epic_data.R
```

See [etl/README.md](etl/README.md).

## Disclaimer

This repository contains **de-identified demo data only**. Real EPIC exports and patient records are excluded. Confirm organizational policy before reusing code in other contexts.

## License

[MIT](LICENSE)
