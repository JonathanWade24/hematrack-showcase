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

The database is organized into several PostgreSQL schemas to logically group tables. These are defined in `src/lib/db/schema.ts`.

> **Note on Naming:** In `src/lib/db/schema.ts`, Drizzle defines JavaScript/TypeScript variables that map to PostgreSQL tables. For example, `export const patientsInClinical = clinical.table("patients", { ... });` declares a variable `patientsInClinical` (used in application code) that corresponds to the `patients` table within the `clinical` PostgreSQL schema. This document will primarily refer to tables using their SQL names (e.g., `clinical.patients`) for clarity regarding database structure.

Based on `src/lib/db/schema.ts`, the schemas and their key tables include:

- **`clinical`**: Contains tables related to clinical patient data, visits, and results originating from clinical systems.
  - `clinical.patients` (Drizzle: `patientsInClinical`)
  - `clinical.lab_orders` (Drizzle: `lab_ordersInClinical`)
  - `clinical.lab_results` (Drizzle: `lab_resultsInClinical`)
  - `clinical.bone_marrow_results` (Drizzle: `bone_marrow_resultsInClinical`)
  - `clinical.subject_registration` (Drizzle: `subject_registrationInClinical`)
  - `clinical.medication_orders` (Drizzle: `medication_ordersInClinical`)
  - `clinical.visits` (Drizzle: `visitsInClinical`)
  - `clinical.medication_administrations` (Drizzle: `medication_administrationsInClinical`)
  - `clinical.visit_diagnoses` (Drizzle: `visit_diagnosesInClinical`)
  - `clinical.fact_bone_marrow_order` (Drizzle: `fact_bone_marrow_orderInClinical`)
  - `clinical.fact_bone_marrow_component` (Drizzle: `fact_bone_marrow_componentInClinical`)
  - `clinical.v_acs_pneumonia_admissions_summary` (View)
- **`laboratory`**: Contains tables related to laboratory processing, samples, and assay results.
  - `laboratory.omics_subjects` (Drizzle: `omics_subjectsInLaboratory`)
  - `laboratory.samples` (Drizzle: `samplesInLaboratory`)
  - `laboratory.results_dna` (Drizzle: `results_dnaInLaboratory`)
  - `laboratory.results_plasma` (Drizzle: `results_plasmaInLaboratory`)
  - `laboratory.results_pbmc` (Drizzle: `results_pbmcInLaboratory`)
  - `laboratory.results_adhesion` (Drizzle: `results_adhesionInLaboratory`)
  - `laboratory.results_advia` (Drizzle: `results_adviaInLaboratory`)
  - `laboratory.results_fcells` (Drizzle: `results_fcellsInLaboratory`)
  - `laboratory.results_lorrca` (Drizzle: `results_lorrcaInLaboratory`)
  - `laboratory.results_viscosity` (Drizzle: `results_viscosityInLaboratory`)
- **`staging`**: Used for temporary data, data import processes, or intermediate data transformations.
  - `staging.raw_bone_marrow` (Drizzle: `raw_bone_marrowInStaging`)
  - `staging.raw_op_visits` (Drizzle: `raw_op_visitsInStaging`)
  - `staging.raw_ip_meds` (Drizzle: `raw_ip_medsInStaging`)
- **`app`**: Contains tables specific to the application's functionality, such as user management (NextAuth.js tables).
  - `app.User` (Drizzle: `UserInApp`)
  - `app.Account` (Drizzle: `AccountInApp`)
  - `app.Session` (Drizzle: `SessionInApp`)
  - `app.VerificationToken` (Drizzle: `VerificationTokenInApp`)

## 3. Key Table Schemas

Below are illustrative examples of key tables. Detailed column definitions are in `src/lib/db/schema.ts`. Individual notes should be created for important tables using the [[Table Documentation Template]].

### 3.1. `app.User` (User Management - NextAuth.js)
   - Corresponds to the `UserInApp` Drizzle object.
   - `id`: `text` (Primary Key) - User's unique identifier.
   - `name`: `text` (Nullable) - User's display name.
   - `email`: `text` (Not Null, Unique) - User's email address.
   - `emailVerified`: `timestamp` (Nullable) - Timestamp if email has been verified.
   - `image`: `text` (Nullable) - URL to user's profile image.
   - `password`: `text` (Nullable) - Hashed password (if using credentials provider).
   - `role`: `text` (Nullable) - User's role for authorization.
   - `isActive`: `boolean` (Not Null, Default: `true`) - Whether the user account is active.
   - `created_at`: `timestamp` (Default: `CURRENT_TIMESTAMP`)
   - `updated_at`: `timestamp` (Default: `CURRENT_TIMESTAMP`)
   - See also: `app.Account`, `app.Session`, `app.VerificationToken` for complete NextAuth.js setup.
   - Create a separate note for details: [[UserInApp]]

### 3.2. `laboratory.samples` (Sample Tracking)
   - Corresponds to the `samplesInLaboratory` Drizzle object.
   - `sample_id`: `varchar(50)` (Primary Key) - Unique identifier for the sample.
   - `subject_id`: `varchar(20)` (Not Null, FK to `laboratory.omics_subjects.subject_id`) - Identifier for the subject.
   - `sample_number`: `integer` (Not Null) - Sequential number for the sample from a subject.
   - `date_of_collection`: `date` (Nullable) - Date the sample was collected.
   - `age_at_collection`: `numeric` (Nullable) - Age of the subject at collection.
   - `genotype`: `varchar(50)` (Nullable) - Subject's genotype.
   - `therapies`: `text` (Nullable) - Information about therapies.
   - `days_to_processing`: `integer` (Nullable) - Days from collection to processing.
   - `steady_state`: `varchar(50)` (Nullable) - Clinical state at collection.
   - `transfusion_status`: `varchar(50)` (Nullable) - Transfusion status.
   - `transfusion_confirmed`: `varchar(50)` (Nullable) - Confirmation of transfusion status.
   - `created_at`: `timestamp` (Default: `CURRENT_TIMESTAMP`)
   - `updated_at`: `timestamp` (Default: `CURRENT_TIMESTAMP`)
   - Create a separate note for details: [[samplesInLaboratory]]

### 3.3. `laboratory.results_...` (Assay Results)
   - Multiple tables store results for different assays, e.g., `laboratory.results_dna`, `laboratory.results_advia`, `laboratory.results_fcells`, etc.
   - Common structure typically includes:
     - `id`: Primary key (often UUID).
     - `sample_id`: Foreign key to `laboratory.samples.sample_id`.
     - `date_...`: Date of the assay or relevant measurement.
     - Various numeric or text fields for specific result values.
     - `qc_pass_...`: Quality control status (e.g., varchar).
     - `qc_notes_...`: Text field for quality control notes.
     - `created_at`, `updated_at` timestamps.
   - For example, `laboratory.results_dna` (Drizzle: `results_dnaInLaboratory`) includes fields like `concentration_1_dna`, `purity_1_dna`, `qc_pass_dna`.
   - Create separate notes for key assay result tables as needed, e.g., [[results_dnaInLaboratory]], [[results_adviaInLaboratory]].

### 3.4. Processing Status Tracking
   - A dedicated `app.processing_statuses` table (as initially hypothesized) was not found in the schema.
   - Sample processing status or assay completion status appears to be managed within individual assay result tables (e.g., `laboratory.results_dna`) through fields like `qc_pass_...`, `qc_notes_...`, or by the presence/absence of a result record itself.
   - Business logic in the application would determine overall sample completeness based on these distributed flags and the requirements defined for a "complete" sample (see [[04_FRONTEND_AND_API]] for application logic).

## 4. Drizzle ORM Usage

- **Schema Definition**: Tables, columns, relationships, and types are defined in `src/lib/db/schema.ts` using Drizzle's PG-specific functions (`pgTable`, `varchar`, `serial`, `timestamp`, `foreignKey`, etc.).
- **Querying**: Drizzle is used in API routes and server-side logic to query the database.
  - Centralized database query functions are primarily located in:
    - `src/lib/db/queries.ts`
    - `src/lib/drizzle/operations.ts` (Note: verify exact path if distinct from `queries.ts`)
  - Direct Drizzle ORM usage can also be found in other specific locations, such as:
    - API route handlers, for example, `src/app/api/auth/[...nextauth]/route.ts` uses `db.query.UserInApp.findFirst({...})` for authentication logic.
    - Utility files like `src/lib/auth/user-management.ts` which uses `db.delete(...)`.
  - These files typically import the `db` instance from `src/lib/db/index.ts`, necessary Drizzle schema objects (e.g., `UserInApp`, `samplesInLaboratory`), and Drizzle utility functions (`eq`, `sql`, `desc`, etc.) from `drizzle-orm`.

- **Database Connection**: The Drizzle instance is initialized in `src/lib/db/index.ts`.
  - It uses the `DATABASE_URL` environment variable for the connection string.
  - The `postgres` library is used to create the underlying database connection.
    - The connection is configured with `max: 1` (max connections, noted as a serverless recommendation).
    - SSL configuration is commented out but present as an example (`ssl: 'require'`).
  - Schemas (`./schema.ts`) and relations (`./relations.ts`) are imported and combined for the Drizzle instance: `{ schema: { ...schema, ...relations } }`.
  - SQL logging is enabled for Drizzle: `logger: true`.
  - A `closeDbConnection` function is provided to explicitly close the database connection, potentially for tests.
  - The file also re-exports everything from `./schema` and `./relations`.

  ```typescript
  // Actual setup from src/lib/db/index.ts (simplified)
  import 'dotenv/config';
  import { drizzle } from 'drizzle-orm/postgres-js';
  import postgres from 'postgres';
  import * as schema from './schema';
  import * as relations from './relations';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const connectionString = process.env.DATABASE_URL;

  const connection = postgres(connectionString, {
    max: 1 // Recommended setting for serverless environments
    // ssl: 'require', // Example for production
  });

  export const db = drizzle(connection, {
    schema: { ...schema, ...relations }, // Combine schema and relations
    logger: true // Enable detailed SQL logging
  });
  ```

## 5. Schema Migrations

Migrations are managed by `drizzle-kit`.

### 5.1. Generating Migrations
1.  **Modify Schema**: Make changes to your table definitions in `src/lib/db/schema.ts`.
2.  **Run Generation Command**: Use the script defined in `package.json` (or run `npx drizzle-kit generate:pg` if not aliased).
    ```bash
    # Example using npm, adjust if using pnpm/yarn/bun
    npm run generate-migrations 
    # or directly if no script: npx drizzle-kit generate:pg
    ```
    This command compares the current state of your schema file (`src/lib/db/schema.ts`) with the state of your database (or previous migrations) and generates SQL migration files in the `drizzle/migrations/` folder.

### 5.2. Applying Migrations
1.  **Run Migration Command**: Use the script defined in `package.json` (or run `npx drizzle-kit migrate:pg` or `npx drizzle-kit push:pg` - note `push:pg` is for prototyping and not recommended for production workflows with migration files).
    ```bash
    # Example using npm for a migration script
    npm run migrate
    # or directly: npx drizzle-kit migrate:pg 
    ```
    This command applies any pending SQL migration files from `drizzle/migrations/` to the connected PostgreSQL database.
    It is crucial to run migrations in development, staging, and production environments when deploying schema changes.

### 5.3. Drizzle Studio
   Drizzle Kit includes Drizzle Studio, a GUI tool to browse and manage your database.
   ```bash
   # Example using npm
   npm run drizzle-studio
   # or directly: npx drizzle-kit studio
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
    // Assuming 'app' schema is already defined: import { app } from './schema';
    export const tagsInApp = app.table("tags", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 50 }).notNull().unique(),
      created_at: timestamp("created_at").defaultNow(),
    });
    ```
2.  **Generate Migration**: Run `npx drizzle-kit generate:pg` (or your `package.json` script).
    - This will create a new file in `drizzle/migrations/` like `000X_some_description.sql`.
3.  **Review Migration File**: Check the generated SQL for correctness.
4.  **Apply Migration (Local)**: Run `npx drizzle-kit migrate:pg` (or equivalent) to update your local development database.
5.  **Test**: Verify that your application works as expected with the new schema changes.
6.  **Commit**: Commit `src/lib/db/schema.ts` and the new migration file(s) in `drizzle/migrations/`.
7.  **Deploy**: When deploying your application, ensure the migration script is run as part of the deployment process *before* the new application code starts, to update the production/staging database schema.

## 7. Troubleshooting Database Issues
See [[09_TROUBLESHOOTING#Database & Migrations Issues]].

---
Links to: [[01_SETUP_AND_DEPLOYMENT]], [[02 – System Architecture]], [[04 – Frontend & API]], [[07 – Troubleshooting]] 