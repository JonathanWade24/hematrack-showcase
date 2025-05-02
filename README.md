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