# SCD Dashboard Documentation Notes

This document contains development notes, key decisions, and reminders for the SCD Dashboard application.

## Overview

*   **Technology Stack:** Next.js (App Router), React, TypeScript, Prisma, PostgreSQL, NextAuth.js, Tailwind CSS, Shadcn/ui.
*   **Purpose:** Manage and visualize omics sample data for Sickle Cell Disease research.

## Development Notes (Add as we go)

*   **YYYY-MM-DD:** (Placeholder, use today's date) Successfully configured the application to build a Docker image (`scd-dashboard:latest`). This involved:
    *   Reviewing and refining the existing `Dockerfile` and `.dockerignore` files.
    *   Uninstalling Prisma (`prisma`, `@prisma/client`) as a direct dependency.
    *   Temporarily disabling Prisma-dependent logic in numerous API routes (`/api/auth/register`, `/api/registration`, `/api/data-import/preview`, `/api/clinical`, `/api/data-preview`, `/api/medications`, `/api/lab-components`, `/api/user-roles`, `/api/query/values`) by commenting out Prisma client usage and returning placeholder 503 responses. These routes will require full migration to Drizzle ORM.
    *   Resolving a build-time error where `DATABASE_URL` was not set by providing it to the `npm run build` command in the `Dockerfile`.
    *   Resolving a subsequent `ECONNREFUSED` error during build by changing the build-time `DATABASE_URL` to use `host.docker.internal` (e.g., `postgresql://user@host.docker.internal:5432/db`) to allow the build process within the Docker container to connect to a PostgreSQL instance running on the host machine.
*   **YYYY-MM-DD:** (Placeholder, use today's date) Fixed build errors due to module resolution and NextAuth.js migration:
    *   Created `src/lib/db/column-queries.ts` to replace missing `@/lib/prisma/column-queries` module, implementing Drizzle ORM-based column query functionality.
    *   Created a placeholder `src/lib/prisma/operations.ts` module to satisfy lazy imports in the omics route, enabling future migration.
    *   Updated API routes to use the NextAuth.js v5 syntax: Replaced `getServerSession` from 'next-auth/next' with the `auth` function exported from `@/app/api/auth/[...nextauth]/route`.
    *   These changes enable a successful build while maintaining functionality, setting the stage for further migration to Drizzle.
*   **YYYY-MM-DD:** (Placeholder, use today's date) Refined role-based access control for `noPHI_viewer` and `noPHI_editor` roles:
    *   `src/app/patients/page.tsx`: Access restricted. Users with `noPHI_viewer` or `noPHI_editor` roles will be denied access.
    *   `src/app/visits/[id]/page.tsx`: Access remains restricted to 'admin' and 'viewer' roles, effectively blocking `noPHI_viewer` and `noPHI_editor`.
    *   `src/app/samples/[id]/page.tsx`: Ensured accessibility for `noPHI_viewer` and `noPHI_editor` roles by adding them to the `ALLOWED_ROLES` list.
    *   `src/app/subjects/[id]/page.tsx`: Page remains accessible to `noPHI_viewer` and `noPHI_editor`, but the clinical timeline section within the page continues to be hidden for these roles (visible only to 'admin' and 'viewer').
*   **YYYY-MM-DD:** (Placeholder, use today's date) Implemented role-based access control for the patient visit timeline page (`src/app/visits/[id]/page.tsx`). Access is restricted to users with 'admin' or 'viewer' roles. Users without these roles will see an "Access Denied" message. This aligns the page's access control with the clinical timeline visibility on the subject detail page.
*   **YYYY-MM-DD:** (Placeholder, use today's date) Refactored the main samples listing page (`src/app/samples/page.tsx`) to use Drizzle ORM for data fetching. This involved:
    *   Replacing the Prisma-based `getSamplesData` function with a Drizzle equivalent.
    *   Updating the data fetching logic to query the `samplesInLaboratory` table and `LEFT JOIN` relevant assay-specific tables (`results_adviaInLaboratory`, `results_dnaInLaboratory`, `results_pbmcInLaboratory`, `results_plasmaInLaboratory`, `results_lorrcaInLaboratory`) to gather all necessary data for display and status calculation.
    *   Modifying the `SampleFromDb` type to match the structure of data returned by the new Drizzle query (a flat object containing fields from all joined tables).
    *   Ensuring the existing `calculateProcessingStatus` function works correctly with the Drizzle-fetched data.
    *   Updating imports and utility functions (`isNonZero`, `SQL` type import) as needed.
*   **YYYY-MM-DD:** Migrated `logAuditEvent` from Supabase to Prisma.
*   **YYYY-MM-DD:** Migrated `searchSubjects` from Supabase to Prisma.
*   **YYYY-MM-DD:** Migrated `getPatientByMRN` from Supabase to Prisma.
*   **YYYY-MM-DD:** Migrated `getOmicsResultsBySubjectId` and `getOmicsResultsByAssayType` from Supabase to Prisma.
*   **YYYY-MM-DD:** Migrated `updateOmicsSubject` and `updatePatient` functions from Supabase to Prisma (`src/lib/prisma/operations.ts`) and removed old Supabase versions.
*   **YYYY-MM-DD:** Migrated API route `src/app/api/omics/route.ts` from Supabase to Prisma operations. Implemented missing Prisma operations (`createOmicsResult`, `updateOmicsResult`, `createOmicsSubject`, `createPatient`, `getOmicsResultBySampleId`) in `src/lib/prisma/operations.ts`.
*   **YYYY-MM-DD:** Migrated `/patients` page (`src/app/patients/page.tsx`) to use Prisma `getAllPatients` function.
*   **YYYY-MM-DD:** Refactored sample status calculation logic into shared helper functions (`calculateProcessingStatus`, `isNonZero`) and introduced configuration objects (`ASSAY_DEFINITIONS`, `REQUIRED_ASSAYS_FOR_COMPLETION`) in `src/app/page.tsx` and `src/app/samples/page.tsx` to define "Complete" status and handle assay checks dynamically.
*   **YYYY-MM-DD:** Migrated `getOmicsSubjectById` function from Supabase (`src/lib/supabase/operations.ts`) to Prisma (`src/lib/prisma/operations.ts`). Updated calling page `src/app/subjects/[id]/page.tsx` to use the new Prisma function and handle data serialization (Decimals, Dates).
*   **2024-07-25:** Migrated `getPatientByMRN` from Supabase to Prisma (`src/lib/prisma/operations.ts`). Removed Supabase version.
*   **2024-07-25:** Migrated `updateOmicsSubject` from Supabase to Prisma.
*   **2024-07-25:** Migrated `updatePatient` from Supabase to Prisma.
*   **2024-07-26:** Migrated `searchSubjects` from Supabase to Prisma.
*   **2024-07-26:** Migrated `logAuditEvent` from Supabase to Prisma.
*   **2024-07-26:** Migrated `getOmicsResultsCount` from Supabase to Prisma. **All functions from `src/lib/supabase/operations.ts` are now migrated.**
*   **YYYY-MM-DD:** Implemented database insertion logic for basic sample information in `src/app/data-entry/actions.ts` within the `saveSampleInfoAction`. This includes handling for subject and patient creation (if new and confirmed) using Drizzle. The action now attempts to insert into `laboratory.samples` table. Encountering a persistent TypeScript linter error on the `sample_id` field during insertion, despite schema alignment. Further investigation needed to resolve the type inference issue.
*   **2023-10-27:** (Placeholder for older relevant entries based on summary - adjust date) Refactored `SampleViewer.tsx` to handle nested assay results from Drizzle queries (`SampleWithAllResults` type) and updated HVR data display.
*   **2023-10-27:** (Placeholder) Resolved NextAuth.js v5 authentication issues on `/samples/[id]` page by using the exported `auth()` function from `src/app/api/auth/[...nextauth]/route.ts` instead of `getServerSession`.
*   **2023-10-26:** (Placeholder) Began refactor of data entry (`/data-entry/individual`) from API routes to Next.js Server Actions. Created `saveSampleInfoAction` with auth and Zod validation.
*   **2024-07-30:** Fixed a data saving issue in the data entry form (`src/components/data-entry/SampleEntryForm.tsx`) where assays other than Advia were not saving correctly. The root cause was missing `name` attributes on the `<Input>` and `<Select>` components within the individual assay section files (e.g., `src/components/data-entry/form-sections/DNASection.tsx`, `PBMCSection.tsx`, etc.). Added the appropriate `name` attributes to all relevant fields, ensuring `FormData` correctly captures their values for the server actions.
*   **YYYY-MM-DD:** (Use today's date) Initiated implementation of a new bulk assay data entry feature. 
    *   Created a new page at `src/app/data-entry/bulk-assay-entry/page.tsx` to host the feature.
    *   Added a `BulkAssaySelector.tsx` component (`src/components/data-entry/BulkAssaySelector.tsx`) with a dropdown for users to select the target assay. It's currently populated with a temporary list of assays.
    *   Created a placeholder `BulkAssayDataGrid.tsx` component (`src/components/data-entry/BulkAssayDataGrid.tsx`) which will later display the editable grid for data input.
    *   The main page (`page.tsx`) now renders the `BulkAssaySelector` and has a basic structure to show content once an assay is selected. Next steps will involve implementing sample identification methods and the dynamic data grid.
*   **YYYY-MM-DD:** (Use today's date) Advanced the bulk assay data entry feature:
    *   Replaced manual sample ID pasting with a `BulkSampleSelector.tsx` component (`src/components/data-entry/BulkSampleSelector.tsx`) that allows searching for samples and selecting multiple via checkboxes. It uses the existing `searchSamplesAction`.
    *   The main page (`BulkAssayEntryPage.tsx`) now integrates this selector, accumulates selected samples into a `batchSamples` state, and triggers fetching of existing assay data for this batch using `getExistingAssayDataAction`.
    *   The `ASSAY_CONFIGS` object in `src/config/assayConfigs.ts` was created and populated to define UI labels, DB table mappings, field types, and options for various assays. `BulkAssaySelector.tsx` now uses this config to dynamically populate its options.
    *   `BulkAssayDataGrid.tsx` was updated to dynamically render table headers and read-only data based on the selected assay and the `batchSamples` (which now include fetched `assayData`).
    *   A link to the new bulk entry page was added to `src/app/data-entry/page.tsx`, and the old "Bulk Upload from CSV" card was removed.
    *   Refined `searchSamplesAction` in `actions.ts` to better handle queries with leading zeros in numeric suffixes.
*   **YYYY-MM-DD:** (Use today's date) Completed the core functionality for the bulk assay data entry feature:
    *   Made `BulkAssayDataGrid.tsx` interactive by allowing inline editing of assay data. Input fields (text, number, date, select, boolean checkbox) are dynamically rendered based on `ASSAY_CONFIGS`.
    *   Created a new server action `saveBulkAssayDataAction` in `src/app/data-entry/actions.ts`. This action handles the upserting of multiple assay records to the correct database table based on the `assayKey` and provided data, using `ASSAY_CONFIGS` for table and field mapping.
    *   Updated `BulkAssayEntryPage.tsx` to call `saveBulkAssayDataAction` when the user submits the data from the grid. The page now manages loading/saving states and displays success/error messages to the user. After a successful save, it re-fetches the assay data to reflect the persisted changes in the grid.
*   **YYYY-MM-DD:** (Use today's date) Addressed UI issues in the bulk assay data entry grid:
    *   Corrected a condition in `BulkAssayEntryPage.tsx` within the `useEffect` hook responsible for fetching and setting existing assay data. This ensures that previously saved data is correctly populated into the editable grid when samples are loaded.
    *   Modified `BulkAssayDataGrid.tsx` to apply Tailwind CSS classes to number input fields to hide the default browser-provided spinner buttons (up/down arrows), improving visibility of the entered numeric values.
*   **YYYY-MM-DD:** (Use today's date) Resolved a `TypeError` in `saveBulkAssayDataAction` occurring during data submission. The action was attempting to save JavaScript `Date` objects directly, while the database adapter expected date strings. The fix ensures that `Date` objects are converted to 'YYYY-MM-DD' formatted strings before being passed to the database query, aligning with the expected data type.
*   **YYYY-MM-DD:** (Use today's date) Added a "Purge Subject Data" feature to the Admin Panel (`src/app/admin/page.tsx`):
    *   Created a new server action `purgeSubjectDataAction` in `src/app/admin/actions.ts`. This action, restricted to admin users, deletes a specified subject and all its associated laboratory data (samples from `samplesInLaboratory`, and all corresponding assay results from `results_*` tables) within a database transaction.
    *   The admin page now includes a new card section for this functionality, with an input for the `subject_id` and a button to initiate the purge.
    *   An `AlertDialog` is used to require explicit confirmation from the admin before proceeding with the data deletion, including re-typing the subject ID.
    *   The UI provides loading indicators and success/error feedback for the purge operation.
*   **YYYY-MM-DD:** (Use today's date) Enhanced the "Purge Subject Data" feature in the Admin Panel (`src/app/admin/page.tsx`):
    *   Replaced the manual subject ID input with a search-and-select mechanism. Admins can now search for subjects using a new server action `searchOmicsSubjectsAction` (added to `src/app/admin/actions.ts`).
    *   The UI displays search results, allowing the admin to select a subject for purging, reducing the risk of errors from manual ID entry.
    *   The confirmation dialog and purge process now use the subject ID selected from the search results.
*   **YYYY-MM-DD:** (Use today's date) Resolved a `TypeError` in the Admin Panel's "Purge Subject Data" feature (`src/app/admin/page.tsx`). The error occurred when clearing search results after selecting a subject, due to incorrectly calling the `useActionState` dispatcher with `null`. The fix involves removing the direct dispatcher call and relying on conditional rendering to manage the visibility of search results, aligning with standard `useActionState` usage.

## Configuration Points

*   **Sample Status Logic:** The definition of sample processing statuses ("Not Started", "Complete", "Partial: Missing X") is configured via `ASSAY_DEFINITIONS` and `REQUIRED_ASSAYS_FOR_COMPLETION` constants within:
    *   `src/app/page.tsx` (for dashboard overview counts and simplified recent sample status)
    *   `src/app/samples/page.tsx` (for detailed status display)
    *   Ensure consistency between these files when updating the logic.

## Database

*   Uses Prisma ORM connected to a PostgreSQL database (initially RDS, local connection available).
*   Authentication managed by NextAuth.js with Prisma Adapter, storing user/session info in the database.

## TODO / Future Considerations

*   **Investigate `src/lib/operations.ts`:** This file appears to contain duplicate definitions (e.g., `logAuditEvent`). Determine if this file is still needed or if its contents can be merged/removed.
*   **Implement calculations on `/subjects` page (`src/app/subjects/page.tsx`):**
    - Calculate `sample_count` (count of related `omics_results`).
    - Calculate `latest_sample_date` (most recent `collection_date` from related `omics_results`).
*   **Review all Prisma Client instances:** Ensure proper error handling and connection management.
*   **Consider adding more robust logging/monitoring.**
*   **Refactor UI components for better reusability.**

## Deployment to EC2 (via Docker & ECR)

This section outlines the steps to deploy code changes to the target EC2 instance using Docker and AWS Elastic Container Registry (ECR).

**Prerequisites:**

*   Docker Desktop installed and running locally.
*   AWS CLI installed and configured locally (e.g., using `aws configure sso` with a profile like `Hippa`).
*   Target EC2 instance must have an IAM role attached with ECR read permissions (e.g., `AmazonEC2ContainerRegistryReadOnly` policy attached to the `EC2-ECR-Pull-Role-Auto` role).
*   SSH access configured for the target EC2 instance.

**Deployment Steps:**

1.  **Build Docker Image (Targeting Correct Architecture):**
    Build the image locally, specifying the platform required by the EC2 instance (`linux/amd64`).
    ```bash
    docker build --platform linux/amd64 -t hematrack .
    ```
    *Note: This is crucial if building on an ARM-based machine (like Apple Silicon) for an x86_64 EC2 instance.* 

2.  **Tag Image for ECR:**
    Tag the built image with the ECR repository URL.
    ```bash
    docker tag hematrack:latest 557690625517.dkr.ecr.us-east-1.amazonaws.com/hematrack:latest
    ```

3.  **Log in to AWS ECR (Locally):**
    Authenticate Docker with ECR using your configured AWS CLI profile.
    ```bash
    aws ecr get-login-password --region us-east-1 --profile Hippa | docker login --username AWS --password-stdin 557690625517.dkr.ecr.us-east-1.amazonaws.com
    ```
    *Note: Replace `Hippa` with your actual profile name if different. This token expires.* 

4.  **Push Image to ECR:**
    Upload the tagged image to the ECR repository.
    ```bash
    docker push 557690625517.dkr.ecr.us-east-1.amazonaws.com/hematrack:latest
    ```

5.  **Deploy on EC2 Instance:**
    a.  **SSH into the EC2 instance:**
        ```bash
        ssh -i path/to/your-key.pem ec2-user@your-ec2-instance-ip
        ```
    b.  **Log in to ECR (on EC2):** The instance uses its attached IAM role for authentication.
        ```bash
        # Ensure AWS CLI is installed on the EC2 instance
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 557690625517.dkr.ecr.us-east-1.amazonaws.com 
        ```
    c.  **Pull the Latest Image:**
        ```bash
        docker pull 557690625517.dkr.ecr.us-east-1.amazonaws.com/hematrack:latest
        ```
    d.  **Stop and Remove the Old Container:** (Use the correct container name)
        ```bash
        docker stop hematrack && docker rm hematrack || true
        ``` 
        *Note: `|| true` prevents errors if the container doesn't exist.* 
    e.  **Run the New Container:** Provide necessary runtime environment variables.
        ```bash
        docker run -d \
          --name hematrack \
          -p 3000:3000 \
          -e DATABASE_URL="YOUR_RUNTIME_RDS_DB_URL" \
          -e NEXTAUTH_URL="YOUR_RUNTIME_APP_URL" \
          -e NEXTAUTH_SECRET="YOUR_RUNTIME_NEXTAUTH_SECRET" \
          # Add other required runtime environment variables here
          --restart unless-stopped \
          557690625517.dkr.ecr.us-east-1.amazonaws.com/hematrack:latest
        ```
        * **IMPORTANT:** Replace the placeholder values for environment variables (`-e ...`) with the actual production values required by the application at runtime.*