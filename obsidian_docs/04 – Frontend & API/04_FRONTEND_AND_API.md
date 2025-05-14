---
tags: [moc, frontend, api, nextjs, react, components, data-flow]
aliases: [Frontend, API, Next.js Pages, UI Components]
---

# 04 – Frontend & API Documentation

This document covers the frontend architecture, key components, API structure, and important frontend-related workflows for the SCD Dashboard application.

## 1. Frontend Technology Stack

*   **Framework**: The application is built using Next.js, specifically leveraging the App Router paradigm.
*   **Language**: TypeScript is used for static typing throughout the frontend codebase.
*   **Styling**: Tailwind CSS is employed for all styling, with utility classes applied directly in JSX.
*   **UI Components**:
    *   Shadcn/ui provides a set of pre-built, accessible UI components, which are integrated via `src/components/ui/` and utility functions like `cn` in `src/lib/utils.ts`.
    *   Custom React components are developed and organized within the `src/components/` directory, categorized by feature or type.
*   **State Management**:
    *   Authentication state is managed by NextAuth.js, using its `SessionProvider` (typically in a root layout) and hooks like `useSession` or server-side functions like `getServerSession`.
    *   For other global state requirements, the application relies on React Context API, as no other dedicated global state management libraries (e.g., Redux, Zustand) are present.
    *   Local component state (`useState`, `useReducer`) and server-fetched state are the primary methods for managing data within components.
*   **Forms**:
    *   Forms are implemented using standard HTML elements within React components.
    *   Data submission and mutation are handled primarily by Next.js Server Actions. For instance, user management forms in `/admin` utilize Server Actions defined in `src/app/admin/actions.ts`.
*   **Data Fetching**:
    *   Data fetching primarily occurs within React Server Components (RSCs), which directly call Drizzle ORM queries (from `src/lib/db/queries.ts`).
    *   Client Components utilize `fetch` or invoke Server Actions for data needs that require client-side initiation.

## 2. Project Structure (Frontend Focus)

Key directories structuring the frontend:

*   **`src/app/`**: The core of the Next.js App Router implementation, containing all routes, pages, layouts, and API handlers.
    *   `layout.tsx`: The root layout component for the entire application.
    *   `page.tsx`: The entry Server Component for the main dashboard homepage.
    *   `(auth)/`: A route group dedicated to authentication-related pages (e.g., login page).
    *   `admin/`: Contains pages and Server Actions for user administration.
    *   `api/`: Houses backend API route handlers.
        *   `auth/[...nextauth]/route.ts`: Manages all NextAuth.js authentication flows.
        *   `data-import/route.ts`: Handles bulk data import functionalities.
    *   `data-entry/`: Includes pages and components for sample and assay data input and editing.
    *   `samples/`: Features pages for listing, viewing, and managing samples.
    *   `subjects/`: Contains pages related to viewing and managing subjects.
*   **`src/components/`**: A central repository for reusable React components, organized into subdirectories based on features or common UI patterns.
    *   `auth/`: Components specific to authentication UI (e.g., login forms).
    *   `dashboard/`: Components used in the main dashboard display.
    *   `data-entry/`: UI elements supporting data entry workflows.
    *   `forms/`: Contains more generic form components; specific assay forms like `SimpleAdviaForm.tsx` are found here, while some data entry UIs are directly within `src/app/data-entry/edit/[sampleId]/page.tsx` and its sub-components.
    *   `layout/`: Structural components like `DashboardLayout.tsx` and `Sidebar.tsx`.
    *   `samples/`: Components for displaying sample data, such as `SamplesTable.tsx` and `SampleViewer.tsx`.
    *   `subjects/`: Components used in subject-related views.
    *   `ui/`: Base UI elements, typically styled wrappers or direct exports from Shadcn/ui (e.g., `button.tsx`, `card.tsx`, `table.tsx`).
*   **`src/lib/`**: Contains shared libraries, utility functions, and core configurations.
    *   `actions.ts`: Some global or widely used Server Actions are defined here, though many are co-located with their respective routes (e.g., `src/app/admin/actions.ts`).
    *   `auth/`: Utilities related to authentication and user management logic.
    *   `db/`: Holds Drizzle ORM setup (`index.ts`), the database schema (`schema.ts`), Drizzle Kit configurations, and data access queries (`queries.ts`).
    *   `utils.ts`: General utility functions, including `cn` for Tailwind class merging.
    *   `validators/`: Data validation logic, such as Zod schemas for form or API input.
*   **`public/`**: Stores static assets like images and fonts that are served directly by the web server.

## 3. Key UI Components & Conventions

*   **Shadcn/ui Integration**: The project uses Shadcn/ui for foundational UI elements. These are typically available through `src/components/ui/` and are styled with Tailwind CSS.
*   **Custom Component Development**: Domain-specific components are built upon Shadcn/ui elements or created from scratch to meet specific application needs. Notable examples include:
    *   `DashboardLayout` (`src/components/layout/DashboardLayout.tsx`): Defines the main authenticated application shell, including navigation.
    *   `SamplesTable` (`src/components/samples/SamplesTable.tsx`): Provides a paginated, searchable, and sortable table for displaying sample information.
    *   `SampleViewer` (`src/components/samples/SampleViewer.tsx`): Renders a detailed view of a single sample, including its associated assay results.
*   **Styling**: Tailwind CSS is the exclusive method for styling. Utility classes are applied directly within JSX markup.
*   **Interactivity**: Client-side interactivity (event handlers, state management via `useState`/`useEffect`) is enabled by designating components as Client Components using the `"use client"` directive at the top of the file.
*   **Accessibility**: The use of Shadcn/ui components provides a strong baseline for accessibility. Standard web accessibility practices, such as semantic HTML, ARIA attributes where appropriate, and keyboard navigability, are followed.

## 4. Rendering Strategy (Next.js App Router)

*   **React Server Components (RSCs)**: These are the default component type in the Next.js App Router. They run on the server, allowing direct data fetching and reducing the amount of JavaScript sent to the client. Most components that primarily display data are RSCs.
*   **Client Components**: Components requiring browser-specific APIs, lifecycle hooks (like `useEffect`), or event handlers are explicitly marked as Client Components with the `"use client"` directive.
*   **Server Actions**: Used for handling form submissions and data mutations. They enable direct, RPC-like calls from Client Components to server-side functions, streamlining data updates without needing to manually create API endpoints for such operations. Server Actions are found in files like `src/app/admin/actions.ts` and can also be defined within Server Components.

## 5. Adding a New Assay: Workflow

Adding a new assay to the system is a multi-step process involving database modifications, backend logic updates, and frontend component development. The established patterns in the codebase suggest the following workflow, using existing assays like Advia or DNA as a structural guide:

### 5.1. Database Schema (`src/lib/db/schema.ts`)

1.  **Define New Assay Table**: Introduce a new Drizzle schema table in `src/lib/db/schema.ts` to store the results for the new assay, mirroring the structure of existing assay tables like `results_adviaInLaboratory` or `results_dnaInLaboratory`. This table includes:
    *   A primary key (e.g., `id: serial('id').primaryKey()`).
    *   A foreign key `sample_id` referencing `samplesInLaboratory.sample_id`. For example, in `results_adviaInLaboratory`, this is defined as: `sample_id: varchar('sample_id', { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id)`.
    *   Columns for each data point specific to the new assay, typed appropriately (e.g., `numeric`, `varchar`, `text`, `timestampWithTimezone`). Refer to columns like `rbc_advia` (numeric) or `qc_pass_advia` (varchar) in `results_adviaInLaboratory` for examples.
    *   Quality Control (QC) related columns, such as `qc_pass_newassay: varchar('qc_pass_newassay', { length: 10 })` and `qc_notes_newassay: text('qc_notes_newassay')`.
    *   Standard timestamp columns: `created_at` and `updated_at`, typically defined like `created_at: timestampWithTimezone('created_at').defaultNow().notNull()`.
2.  **Establish Relations**: Update the `relations` object in `src/lib/db/schema.ts` for `samplesInLaboratory` to include a one-to-many or one-to-one relationship with the new assay's results table. For example, `samplesInLaboratoryRelations` defines relationships to `results_adviaInLaboratory`, `results_dnaInLaboratory`, etc. A new assay would have a similar entry:
    ```typescript
    // In samplesInLaboratoryRelations (src/lib/db/schema.ts)
    results_newassay: one(results_newassayInLaboratory, { // Replace with actual new table name
      fields: [samplesInLaboratory.sample_id],
      references: [results_newassayInLaboratory.sample_id], // Replace with actual new table name
    }),
    ```

### 5.2. Drizzle Migrations

1.  **Generate Migration**: Execute `npx drizzle-kit generate:pg` to create a new SQL migration file reflecting the schema changes.
2.  **Apply Migration**: Apply the migration to the PostgreSQL database. This is typically done via a script (e.g., `npm run db:migrate` if `src/lib/db/migrate.ts` is set up) or `npx drizzle-kit push:pg` (primarily for development; use migrations for production).

### 5.3. Update Status Calculation Logic

The logic for determining sample processing status, currently defined in `src/app/samples/page.tsx`, `src/app/page.tsx`, and `src/app/data-entry/continue/page.tsx` (see [[06_KEY_LOGIC_AND_ALGORITHMS#3. Sample and Assay Processing Status]]), must be updated:

1.  **Modify `ASSAY_DEFINITIONS`**: Add an entry for the new assay, mapping its name to an array of its key result column(s) from its newly created table. Data presence in these columns signifies assay completion.
    *   Example (from `src/app/samples/page.tsx`, to be adapted for the new assay): `DNA: ['concentration_1_dna']`
2.  **Modify `REQUIRED_ASSAYS_FOR_COMPLETION`**: If the new assay is mandatory for a sample's "Complete" status, add its name (the key used in `ASSAY_DEFINITIONS`) to this array.
    *   Example (from `src/app/samples/page.tsx`): `REQUIRED_ASSAYS_FOR_COMPLETION: ['Advia', 'DNA', 'Lorrca']`

### 5.4. Update Data Fetching Queries (`src/lib/db/queries.ts`)

Modify Drizzle queries in `src/lib/db/queries.ts` that fetch sample data for display and status calculation:

1.  **Update Joins**: In functions like `getAllSamplesWithStatusFields` and `getRecentSamplesWithStatusFields`, add a `LEFT JOIN` to the new assay's results table. These functions already join with tables like `results_adviaInLaboratory`, `results_dnaInLaboratory`, etc., providing a clear pattern to follow.
2.  **Select New Fields**: Include the necessary result and QC columns from the new assay table in the `select` clause of these queries.
3.  **Update Types**: Adjust the `SampleWithStatusFields` TypeScript type (defined in `src/lib/db/queries.ts`) and any consuming types (like `AllSampleData`, `RecentSampleData` in `src/app/page.tsx`) to include the newly selected fields from the new assay.

### 5.5. Frontend: Data Entry

Develop UI for inputting the new assay's data:

1.  **Create/Modify Form Component**: Build a new React component for the new assay's data entry form. This can be structured similarly to existing assay forms like `SimpleAdviaForm.tsx` (located in `src/components/forms/`) or components within the `src/app/data-entry/edit/[sampleId]/` directory structure.
2.  **Integrate Form**: Add the form to the sample editing page, `src/app/data-entry/edit/[sampleId]/page.tsx`. This page already dynamically renders forms for different assays; the new assay form would be integrated into this system. Pre-fill with existing data if editing.
3.  **Implement Server Action**: Create a Server Action to handle form submission. This action will validate the data (similar to validation in `src/app/admin/actions.ts` which uses Zod) and save it to the new assay's results table using Drizzle. The Server Actions in `src/app/admin/actions.ts` (e.g., `updateUserRole`, `toggleUserActive`) serve as good examples for structuring mutations.

### 5.6. Frontend: Data Display

Display the new assay's data in relevant UI sections:

1.  **Update Viewing Components**: Modify components like `SampleViewer.tsx` (in `src/components/samples/`) to display the new assay's results alongside others for a single sample.
2.  **Update Tables/Lists**: If applicable, the main samples table component, `SamplesTable.tsx` (in `src/components/samples/`), might need adjustments if any columns directly reflect the new assay's data, though its `status` column will automatically update due to changes in the status calculation logic.

### 5.7. Update QC Status Logic (If Applicable)

If the new assay's `qc_pass_...` field impacts the overall sample QC status (calculated by `getQCStatus` functions, e.g., in `src/app/samples/page.tsx`):
1.  **Modify `getQCStatus`**: Update its logic (in the duplicated instances or the refactored central version) to consider the new QC field, similar to how it checks `qc_pass_advia`, `qc_pass_lorrca`, etc.

### 5.8. Testing

Thoroughly test all new functionalities: data entry, display, status calculations (processing and QC), and database migrations.

## 6. API Endpoints

The application utilizes both traditional API routes and Next.js Server Actions for client-server communication:

*   **`src/app/api/auth/[...nextauth]/route.ts`**: This dynamic route handles all authentication-related operations via NextAuth.js, including user sign-in, sign-out, session retrieval, and OAuth provider callbacks (if configured).
*   **`src/app/api/data-import/route.ts`**: A `POST` endpoint designed for bulk importing various data types (e.g., demographics, lab results) from uploaded files. It internally routes data to specific processing functions based on a `dataType` parameter.
*   **Server Actions**: These are extensively used for data mutations and some queries, providing a direct and type-safe way for Client Components to call server-side code. Examples include:
    *   User management operations (create, update role, toggle active status) in `src/app/admin/actions.ts`.
    *   Data entry form submissions.

## 7. State Management

*   **Authentication State**: Globally managed by NextAuth.js via its `SessionProvider` and session retrieval mechanisms. The session object, accessible on both client and server, contains user information, including their role.
*   **Global Application State**: Beyond authentication, no dedicated global state library (like Redux or Zustand) is implemented. Any shared state beyond what NextAuth provides is handled using React Context API or passed down through props.
*   **Server-Side State & Cache**: Next.js's App Router manages server-side state. Data fetched in Server Components is cached by Next.js according to its built-in heuristics or explicit configurations (e.g., route segment configs, `fetch` options).
*   **Local Component State**: Standard React hooks (`useState`, `useReducer`) are used for managing UI state within individual Client Components.

## 8. Error Handling

*   **Server Actions & API Routes**: Implement try-catch blocks for robust error management. API routes return appropriate HTTP status codes, while Server Actions return structured error objects or throw errors that can be caught on the client.
*   **Frontend Components**:
    *   Next.js Error Boundaries (using `error.tsx` files within route segments) catch rendering errors in RSCs and their children.
    *   Client Components handle promise rejections from `fetch` calls or Server Action invocations, displaying user-friendly error messages.
*   **Input Validation**: Data validation, using libraries like Zod, is employed (evident in Server Actions like `src/app/admin/actions.ts`) to provide clear feedback for invalid form inputs.

## 9. Future Considerations / TODOs (Frontend)

Based on current observations of the codebase:

*   **Centralize Status Calculation Logic**: The duplicated `ASSAY_DEFINITIONS`, `REQUIRED_ASSAYS_FOR_COMPLETION`, and helper functions (`isNonZero`, `calculateProcessingStatus`, `getQCStatus`) across `src/app/samples/page.tsx`, `src/app/page.tsx`, and `src/app/data-entry/continue/page.tsx` should be refactored into a single, shared utility module in `src/lib/utils/` or `src/lib/helpers/`. This is critical for maintainability and consistency.
*   **Enhance Type Safety for Dynamic Field Access**: The dynamic property access (e.g., `sample[field]`) in `calculateProcessingStatus` can be made more type-safe.
*   **Consistent Form Validation**: Ensure all data entry forms implement comprehensive client-side and server-side validation.
*   **Loading State UX**: Standardize and implement more consistent loading indicators (e.g., skeleton screens) for data-intensive components.
*   **Accessibility Review**: Conduct a thorough accessibility audit to ensure adherence to WCAG guidelines.
*   **Testing Strategy**: Expand automated testing, particularly for critical UI interactions, data entry workflows, and Server Actions. Consider implementing end-to-end tests.

---
Links to: [[02 – System Architecture]], [[03 – Database]], [[06 – Key Logic and Algorithms]], [[08 – Templates & Appendices#Component Documentation Template]] 