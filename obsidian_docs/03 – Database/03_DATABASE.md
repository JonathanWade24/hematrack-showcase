---
tags: [moc, database, drizzle, postgres, schema, migrations]
aliases: [DB, Postgres, Drizzle ORM, Database Schema]
---

# 03 – Database

This document details the PostgreSQL database used by the application, including its schema organization, how Drizzle ORM is utilized for interactions, and procedures for managing schema changes and migrations.

## 1. Overview

- **Database System**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema Definition**: Located primarily in `src/lib/db/schema.ts`.
- **Migrations**: Handled by `drizzle-kit`.

## 2. PostgreSQL Schemas

The database is organized into several PostgreSQL schemas to logically group tables. Based on `src/lib/db/schema.ts`, these include:

- **`clinical`**: Contains tables related to clinical patient data, visits, and results originating from clinical systems.
  - [[patientsInClinical]]
  - [[lab_ordersInClinical]]
  - [[lab_resultsInClinical]]
  - [[bone_marrow_resultsInClinical]]
  - [[subject_registrationInClinical]]
  - [[medication_ordersInClinical]]
  - [[visitsInClinical]]
  - `[TODO: Add other tables from clinical schema as identified]`
- **`laboratory`**: Contains tables related to laboratory processing, samples, and assay results.
  - [[omics_subjectsInLaboratory]]
  - [[samplesInLaboratory]]
  - [[results_dnaInLaboratory]]
  - [[results_plasmaInLaboratory]]
  - [[results_pbmcInLaboratory]]
  - [[results_adhesionInLaboratory]]
  - [[results_adviaInLaboratory]]
  - `[TODO: Add other tables from laboratory schema as identified, e.g., processing_statuses, specific assay result tables]`
- **`staging`**: Likely used for temporary data, data import processes, or intermediate data transformations.
  - `[TODO: Identify and list tables in the staging schema if any defined in schema.ts]`
- **`app`**: Contains tables specific to the application's functionality, such as user management, application settings, or other non-clinical/non-lab core data.
  - [[usersInApp]] (Expected, verify from schema)
  - [[processing_statusInApp]] (Expected for assay tracking, verify from schema)
  - `[TODO: Add other tables from app schema as identified, e.g., roles, permissions, audit_logs]`

## 3. Key Table Schemas

Below are illustrative examples. Detailed column definitions are in `src/lib/db/schema.ts`. Individual notes should be created for important tables using the [[Table Documentation Template]].

### 3.1. `app.users` (User Management)
   - `id`: Primary key (e.g., UUID, serial)
   - `name`: User's name
   - `email`: User's email (unique)
   - `password_hash`: Hashed password
   - `role_id` (or similar): Foreign key to a roles table
   - `created_at`, `updated_at`
   - `[TODO: Verify actual columns from src/lib/db/schema.ts for the users table, likely in the app schema. Create a separate note: [[usersInApp]].]`

### 3.2. `laboratory.samples` (Sample Tracking)
   - `sample_id`: Primary key (e.g., varchar)
   - `subject_id`: Foreign key to `omics_subjects`
   - `sample_number`: Integer
   - `date_of_collection`: Date
   - `[TODO: Add more columns from schema.ts. Create a separate note: [[samplesInLaboratory]].]`

### 3.3. `laboratory.results_...` (Assay Results)
   - Multiple tables like `results_dna`, `results_advia`, etc.
   - Typically include: `id`, `sample_id` (FK), `date_assay`, result fields, QC fields.
   - `[TODO: Create separate notes for key assay result tables, e.g., [[results_dnaInLaboratory]], [[results_adviaInLaboratory]].]`

### 3.4. `app.processing_statuses` (Processing Status - Example)
   - This is a hypothetical table for tracking sample processing completeness. Verify if it exists or if status is derived.
   - `id`: Primary key
   - `sample_id`: Foreign key to `laboratory.samples`
   - `assay_type_id`: Foreign key to an assay definitions table (if any)
   - `status`: (e.g., 'Pending', 'In Progress', 'Complete', 'Failed')
   - `notes`: Text field for comments
   - `updated_at`, `updated_by`
   - `[TODO: Verify existence and structure of processing status tracking. Create [[processing_statusInApp]] if applicable.]`

## 4. Drizzle ORM Usage

- **Schema Definition**: Tables, columns, relationships, and types are defined in `src/lib/db/schema.ts` using Drizzle's PG-specific functions (`pgTable`, `varchar`, `serial`, `timestamp`, `foreignKey`, etc.).
- **Querying**: Drizzle is used in API routes and server-side logic to query the database. Example:
  ```typescript
  // src/lib/db/queries.ts (example file)
  import { db } from './index'; // Assuming db is your Drizzle instance
  import { usersInApp } from './schema';
  import { eq } from 'drizzle-orm';

  export async function getUserById(userId: string) {
    return await db.select().from(usersInApp).where(eq(usersInApp.id, userId)).limit(1);
  }
  ```
  `[TODO: Link to actual files where Drizzle queries are performed, e.g., in src/lib/db/operations.ts or API routes.]`

- **Database Connection**: The Drizzle instance is typically initialized in a central file (e.g., `src/lib/db/index.ts`) using the `POSTGRES_URL` environment variable.
  ```typescript
  // src/lib/db/index.ts (example)
  import { drizzle } from 'drizzle-orm/postgres-js';
  import postgres from 'postgres';
  import * as schema from './schema';

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set.');
  }

  const client = postgres(connectionString);
  export const db = drizzle(client, { schema });
  ```
  `[TODO: Verify this setup in the actual codebase.]`

## 5. Schema Migrations

Migrations are managed by `drizzle-kit`.

### 5.1. Generating Migrations
1.  **Modify Schema**: Make changes to your table definitions in `src/lib/db/schema.ts`.
2.  **Run Generation Command**: Use the script defined in `package.json`.
    ```bash
    pnpm drizzle-kit generate:pg
    # or npm run drizzle-kit generate:pg
    # or bun run drizzle-kit generate:pg
    ```
    This command compares the current state of your schema file (`src/lib/db/schema.ts`) with the state of your database (or previous migrations) and generates SQL migration files in the `drizzle/migrations/` folder.

### 5.2. Applying Migrations
1.  **Run Migration Command**: Use the script defined in `package.json`.
    ```bash
    pnpm drizzle-kit migrate
    # or npm run drizzle-kit migrate
    # or a custom script like `pnpm db:migrate`
    ```
    This command applies any pending SQL migration files from `drizzle/migrations/` to the connected PostgreSQL database.
    It is crucial to run migrations in development, staging, and production environments when deploying schema changes.

### 5.3. Drizzle Studio
   Drizzle Kit includes Drizzle Studio, a GUI tool to browse and manage your database.
   ```bash
   pnpm drizzle-kit studio
   # or npm run drizzle-kit studio
   ```
   This typically opens a web interface at `http://localhost:PORT_NUMBER_SPECIFIED_BY_STUDIO`.

### 5.4. Best Practices for Migrations
- **Review Generated Migrations**: Always review the SQL in generated migration files before applying them, especially for destructive changes (e.g., dropping tables/columns).
- **Backup Database**: Before running migrations in a production environment, ensure you have a recent backup of your database.
- **Test Migrations**: Test migrations in a development or staging environment that mirrors production as closely as possible.
- **Version Control**: Commit your schema file (`schema.ts`) and the generated migration files to version control.

## 6. Adding or Modifying Models & Migrations (Workflow)

1.  **Define/Update Model**: Edit `src/lib/db/schema.ts` to add a new table or modify an existing one.
    ```typescript
    // Example: Adding a new 'tags' table in src/lib/db/schema.ts
    export const tagsInApp = app.table("tags", {
      id: serial().primaryKey(),
      name: varchar("name", { length: 50 }).notNull().unique(),
      created_at: timestamp("created_at").defaultNow(),
    });
    ```
2.  **Generate Migration**: Run `pnpm drizzle-kit generate:pg`.
    - This will create a new file in `drizzle/migrations/` like `000X_some_description.sql`.
3.  **Review Migration File**: Check the generated SQL for correctness.
4.  **Apply Migration (Local)**: Run `pnpm drizzle-kit migrate` (or equivalent) to update your local development database.
5.  **Test**: Verify that your application works as expected with the new schema changes.
6.  **Commit**: Commit `src/lib/db/schema.ts` and the new migration file(s) in `drizzle/migrations/`.
7.  **Deploy**: When deploying your application, ensure the migration script is run as part of the deployment process *before* the new application code starts, to update the production/staging database schema.

## 7. Troubleshooting Database Issues
See [[07_TROUBLESHOOTING#Database & Migrations Issues]].

---
Links to: [[01_SETUP_AND_DEPLOYMENT]], [[02 – System Architecture]], [[04 – Frontend & API]], [[07 – Troubleshooting]] 