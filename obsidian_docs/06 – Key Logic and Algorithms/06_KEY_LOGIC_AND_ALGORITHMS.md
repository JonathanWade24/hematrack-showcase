# 06 – Key Logic and Algorithms

---
Tags: [algorithms, logic, data-processing, status-calculation, auth-flow, etl]
Aliases: [Core Logic, Business Rules, Algorithms, ETL]
---

This document details some of the core algorithms, business logic, and key data processing flows within the SCD Dashboard application.

## 1. Data Import and Initial Processing (Python ETL Scripts)

The primary mechanism for bulk data import into the application is a set of Python ETL (Extract, Transform, Load) scripts located in `Junk/etl/etl_scripts/`. These scripts have superseded the Next.js API route (`src/app/api/data-import/route.ts`) for handling batch data ingestion from various clinical and laboratory data sources.

The import process generally follows a two-stage pattern for each data type:

1.  **Processing Stage (`process_staging_*.py` scripts)**:
    *   These scripts are responsible for the initial handling of raw data files.
    *   Tasks include: fetching data from source locations (if applicable), parsing file formats (e.g., CSV, Excel), cleaning inconsistencies, transforming data into a standardized structure, and performing initial validation checks.
    *   Examples: `process_staging_omics_reformatted.py`, `process_staging_labs.py`, `process_staging_demographics.py`.
    *   The output of these processing scripts is typically data prepared for loading (e.g., cleaned CSV files or directly staged data if interacting with temporary staging tables, though the exact intermediate step is defined within each script).

2.  **Loading Stage (`load_staging_*.py` scripts)**:
    *   These scripts take the processed and staged data from the previous step.
    *   They are responsible for connecting to the application's PostgreSQL database and loading the data into the final target tables defined by the Drizzle schema (e.g., tables within the `clinical` and `laboratory` schemas).
    *   This involves mapping the staged data to the correct columns, handling data type conversions suitable for PostgreSQL, and executing database insertion or update operations (likely using libraries such as `psycopg2` or potentially an ORM like SQLAlchemy if used by the scripts).
    *   Examples: `load_staging_omics_reformatted.py`, `load_staging_labs.py`, `load_staging_demographics.py`.

**Key Characteristics:**

*   **External Execution**: These Python scripts are run independently of the Next.js application, likely manually or through an external scheduling/orchestration system.
*   **Data Source Specific Logic**: Each pair of `process_` and `load_` scripts encapsulates the specific logic required to handle a particular data source or type (e.g., demographics, lab results, medication records).
*   **Superseded API Route**: The `src/app/api/data-import/route.ts` is no longer the primary method for bulk data uploads and should be considered legacy or repurposed for other minor uses if any. The robust ETL operations are handled by these external Python scripts.

This ETL pipeline is crucial for populating and maintaining the data within the SCD Dashboard.

## 2. Data Transformation and Validation

Data integrity is maintained through validation at different points in the application:

*   **Input Form Validation (Server Actions)**: For user-submitted data via forms (e.g., user creation/management in the `/admin` section), validation is primarily handled within Server Actions. These actions, such as those in `src/app/admin/actions.ts`, utilize Zod schemas (e.g., `UserSchema`, `AdminUserSchema`) to define expected data structures, types, and constraints (e.g., required fields, email format). If validation fails, the Server Action typically returns an error object that can be displayed to the user in the frontend.
    *   Example: `addUserAction` in `src/app/admin/actions.ts` uses `AdminUserSchema.parse(data)` to validate input.

*   **Bulk Data Import Validation (Python ETL Scripts)**: For data imported via the Python ETL scripts located in `Junk/etl/etl_scripts/`, the core transformation and validation logic resides within these scripts, particularly the `process_staging_*.py` set. These scripts are responsible for:
    *   **Parsing**: Converting raw file content (e.g., CSV, TSV, Excel) into structured data (e.g., Pandas DataFrames).
    *   **Data Type Coercion & Cleaning**: Converting string values from files into appropriate Python/database types (e.g., numbers, dates, booleans), handling missing values (NaNs), and cleaning malformed data.
    *   **Business Rule Enforcement**: Applying specific rules, such as checking for required fields, valid ranges, expected values, or consistency across related data points within the source file.
    *   **Error Handling & Logging**: Implementing mechanisms to handle, log, and potentially quarantine or report invalid records/rows or entire files that fail validation checks.
    *   The specifics of these transformations and validations are unique to each data type being imported and are encapsulated within their respective `process_staging_*.py` scripts.

*   **Database Constraints**: PostgreSQL itself enforces certain constraints defined in the Drizzle schema (`src/lib/db/schema.ts`), such as `NOT NULL`, `UNIQUE` constraints (e.g., unique email in `app.User`), foreign key relationships, and data types. These serve as a final layer of validation during the loading phase handled by the `load_staging_*.py` scripts.

## 3. Sample and Assay Processing Status

The processing status of a laboratory sample is a critical piece of information, indicating how many of its associated assays have been completed. This status is dynamically calculated based on the presence of data in specific database fields.

### 3.1. Core Configuration

The logic relies on two main configuration objects, currently defined (and duplicated) in files like `src/app/samples/page.tsx`, `src/app/page.tsx`, and `src/app/data-entry/continue/page.tsx`.

*   **`ASSAY_DEFINITIONS`**: An object where keys are assay names (strings, e.g., "Advia", "DNA") and values are arrays of strings. These strings are the names of columns in the respective assay result tables (e.g., `results_adviaInLaboratory`, `results_dnaInLaboratory`). If *any* of these specified columns contain a non-zero/non-empty value for a sample, that particular assay is considered "done" for that sample.
    *   Example from `src/app/samples/page.tsx`:
        ```typescript
        const ASSAY_DEFINITIONS = {
          Advia: [
            'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia',
            'mchc_advia', 'rdw_advia', 'plt_advia', 'wbc_advia'
          ],
          DNA: ['concentration_1_dna'],
          PBMC: ['cell_number_1_pbmc'],
          Plasma: ['vol_plasma_1'],
          Lorrca: ['ei_min_lorrca', 'ei_max_lorrca'],
        };
        ```

*   **`REQUIRED_ASSAYS_FOR_COMPLETION`**: An array of assay names (which must be keys in `ASSAY_DEFINITIONS`). For a sample to achieve a "Complete" status, *all* assays listed in this array must be "done".
    *   Example from `src/app/samples/page.tsx`:
        ```typescript
        const REQUIRED_ASSAYS_FOR_COMPLETION: (keyof typeof ASSAY_DEFINITIONS)[] = [
          'Advia', 'DNA', 'Lorrca'
        ];
        ```

### 3.2. Calculation Logic (`calculateProcessingStatus` function)

A function, typically named `calculateProcessingStatus`, performs the status calculation:

1.  **Initialization**: It prepares to track the completion status of each assay defined in `ASSAY_DEFINITIONS`.
2.  **Assay Completion Check**: For each assay in `ASSAY_DEFINITIONS`:
    *   It iterates through the array of associated database field names.
    *   It uses a helper function (commonly `isNonZero`) to check if any of these fields have a meaningful value (not null, not undefined, not an empty string, and if a string parses to a non-zero number).
    *   If at least one field has a meaningful value, the assay is marked as "done" for the current sample.
3.  **Determining Overall Status**:
    *   **`'Not Started'`**: If *no* assays were marked as "done" in the previous step.
    *   **`'Complete'`**: If *all* assays listed in `REQUIRED_ASSAYS_FOR_COMPLETION` are marked as "done".
    *   **`'Partial: Missing AssayX, AssayY...'`**: If at least one assay is "done" but not all assays in `REQUIRED_ASSAYS_FOR_COMPLETION` are "done". The status string will include a comma-separated list of the defined assays that are not yet "done".

### 3.3. Data Fetching for Status Calculation

The `calculateProcessingStatus` function requires a sample object that contains all the relevant fields from the `ASSAY_DEFINITIONS`. This data is typically fetched by Drizzle ORM queries located in `src/lib/db/queries.ts`, such as:
*   `getAllSamplesWithStatusFields()`
*   `getRecentSamplesWithStatusFields(limit: number)`

These queries perform `LEFT JOIN` operations from the main `samplesInLaboratory` table to the various `results_*` tables (e.g., `results_adviaInLaboratory`, `results_dnaInLaboratory`, etc.) to gather all necessary data points for each sample. The resulting sample objects, often typed as `SampleWithStatusFields` or similar, are then passed to the `calculateProcessingStatus` function.

### 3.4. Related QC Status (`getQCStatus` function)

Separate from the processing status, a `getQCStatus` function is often found in the same files. This function determines an overall Quality Control (QC) status for a sample (typically 'Passed', 'Failed', or 'Review'). It does this by checking the values of specific `qc_pass_...` columns (e.g., `qc_pass_advia`, `qc_pass_lorrca`, `qc_pass_dna`) in the assay results tables.

### 3.5. Recommendation for Refactoring

The configuration objects (`ASSAY_DEFINITIONS`, `REQUIRED_ASSAYS_FOR_COMPLETION`) and the helper functions (`isNonZero`, `calculateProcessingStatus`, `getQCStatus`) are currently duplicated across multiple files (primarily `src/app/samples/page.tsx`, `src/app/page.tsx`, and `src/app/data-entry/continue/page.tsx`).

**It is strongly recommended to refactor this logic into a central, shared utility module** (e.g., `src/lib/utils/statusCalculations.ts` or `src/lib/statusLogic.ts`). This module would export the necessary configurations and functions, which can then be imported and used wherever status calculations are needed. This will:
*   Reduce code duplication.
*   Ensure consistency in status calculation across the application.
*   Simplify updates and maintenance (e.g., when adding a new assay or changing completion criteria).

## 4. User Authentication/Authorization Flow

The primary mechanisms for user authentication (verifying identity) and authorization (determining access rights) are managed by NextAuth.js and custom logic within the application.

**Key aspects include:**
*   Credentials-based login (email/password).
*   Use of `DrizzleAdapter` for storing user and session information in the database (`app` schema).
*   JWT session strategy.
*   Propagation of user roles (from `app.User.role`) into the JWT and session object.
*   Middleware (`src/middleware.ts`) for basic route protection based on authentication status.
*   Role-based access control (RBAC) implemented at the page and Server Action level, particularly for admin functionalities (`/admin` route and its actions).

A comprehensive description of this flow, including table structures, NextAuth.js configuration, and authorization patterns, is detailed in [[05 – User & Permissions]].

---
Links: [[01 – Setup & Deployment]], [[03 – Database]], [[04 – Frontend & API]], [[05 – User & Permissions]] 