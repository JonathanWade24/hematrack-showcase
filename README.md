# SCD Dashboard Documentation Notes

This document contains development notes, key decisions, and reminders for the SCD Dashboard application.

## Overview

*   **Technology Stack:** Next.js (App Router), React, TypeScript, Prisma, PostgreSQL, NextAuth.js, Tailwind CSS, Shadcn/ui.
*   **Purpose:** Manage and visualize omics sample data for Sickle Cell Disease research.

## Development Notes (Add as we go)

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