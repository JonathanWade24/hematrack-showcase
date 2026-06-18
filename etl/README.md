# ETL Pipeline

This directory contains scripts that ingest EMR (EPIC) exports and laboratory omics data into PostgreSQL.

## Overview

```mermaid
flowchart LR
  EPIC[EPIC Pipe-Delimited Exports] --> EpicETL[etl/epic/]
  Omics[Omics CSV/XLSX] --> OmicsETL[etl/omics/]
  EpicETL --> PG[(PostgreSQL)]
  OmicsETL --> PG
```

## EPIC Clinical Data (`etl/epic/`)

| Script | Purpose |
|--------|---------|
| `import_epic_data.R` | Import demographics, admissions, labs, meds from pipe-delimited EPIC baseline files |
| `import_all_data.R` | Full orchestration pipeline for all EPIC tables |
| `import_medications.py` | Medication order imports |
| `import_alloimmunization_data.py` | Alloimmunization data import |

### Configuration

Set environment variables before running (real EPIC exports are **not** included in this repo):

```bash
export DATA_DIR=/path/to/epic/baseline/exports
export DATABASE_URL=postgresql://user:pass@localhost:5432/your_db
```

R scripts read `DATA_DIR` (defaults to `./data/epic/` if unset). Python scripts use `DATABASE_URL` and `DATA_DIR`.

## Omics / Laboratory Data (`etl/omics/`)

| Script | Purpose |
|--------|---------|
| `import_omics_data.R` | Import omics subjects and assay results from spreadsheet exports |
| `import_omics.py` | Python alternative for omics results ingestion |

## Requirements

- **R:** tidyverse, RPostgres, readxl, janitor
- **Python:** psycopg2, pandas

## Important

These scripts were built for a secured research environment. **No patient data is included.** To run against real data, obtain appropriate IRB/data use approvals and place exports locally outside version control.
