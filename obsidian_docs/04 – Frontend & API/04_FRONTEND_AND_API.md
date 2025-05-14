---
tags: [moc, frontend, api, nextjs, react, components, data-flow]
aliases: [Frontend, API, Next.js Pages, UI Components]
---

# 04 – Frontend & API

This document describes the frontend and API aspects of the Next.js application, including data flow, component structure, and guidelines for adding new features or modifying existing UI elements.

## 1. Frontend Overview

- **Framework**: Next.js (using the App Router)
- **Language**: TypeScript
- **UI Components**: React Server Components (RSC) and Client Components (`"use client"`).
- **Styling**: Tailwind CSS. UI primitives might be from a library like Shadcn UI (check `components.json` and `src/components/ui`).
- **Key Directories**:
    - `src/app/`: Contains page routes, layouts, and API route handlers.
    - `src/components/`: Reusable UI components.
    - `src/lib/`: Utility functions, potentially frontend-specific logic (e.g., hooks, context).

## 2. Data Flow: Pages → API Routes → Drizzle

Data typically flows through the application as follows:

1.  **User Interaction (Client-Side)**: A user interacts with a UI element on a Next.js page (e.g., submits a form, clicks a button to fetch data).
2.  **Client Component / Server Action / Route Handler Invocation**:
    *   **Client Components**: May use `fetch` or a library like `react-query`/`SWR` to call a Next.js API Route Handler.
    *   **Server Actions**: Forms or button clicks can directly invoke Server Actions defined in a Server Component or a separate file. These actions execute on the server.
    *   **Server Components**: Can fetch data directly during rendering using async/await, often calling server-side data fetching functions that might encapsulate Drizzle logic.
3.  **API Route Handler / Server Action (Server-Side)**:
    *   Located in `src/app/api/.../route.ts` (for Route Handlers) or co-located with components (for Server Actions).
    *   Receives the request, validates input, and performs business logic.
    *   Calls Drizzle ORM functions to interact with the PostgreSQL database.
    *   Example API Route Handler (`src/app/api/assays/route.ts`):
        ```typescript
        // src/app/api/assays/route.ts (Example)
        import { NextRequest, NextResponse } from 'next/server';
        import { db } from '@/lib/db'; // Assuming db is your Drizzle instance
        import { samplesInLaboratory } from '@/lib/db/schema';
        // import { eq } from 'drizzle-orm';

        export async function GET(request: NextRequest) {
          try {
            // const { searchParams } = new URL(request.url);
            // const sampleId = searchParams.get('sampleId');
            // const data = await db.select().from(samplesInLaboratory).where(eq(samplesInLaboratory.id, sampleId));
            const data = await db.select().from(samplesInLaboratory).limit(10); // Example fetch
            return NextResponse.json(data);
          } catch (error) {
            console.error("API Error:", error);
            return NextResponse.json({ message: "Error fetching data" }, { status: 500 });
          }
        }

        // POST, PUT, DELETE handlers would follow a similar pattern
        ```
4.  **Drizzle ORM (Server-Side)**:
    *   Receives calls from API Route Handlers or Server Actions.
    *   Translates these calls into SQL queries.
    *   Executes queries against the PostgreSQL database.
    *   Returns data to the API Route / Server Action.
    *   See [[03_DATABASE#Drizzle ORM Usage]].
5.  **Response to Client (Client-Side)**:
    *   The API Route Handler sends a JSON response back to the client component.
    *   Server Actions return data that can be used to update the UI, often with `revalidatePath` or `revalidateTag` for cache invalidation.
    *   Server Components render with the fetched data.
    *   The client component updates its state and the UI based on the received data or Server Action result.

## 3. UI Components (`src/components/`)

- **Structure**: Components are typically organized into `src/components/`.
    - `src/components/ui/`: Likely for generic, reusable UI primitives (buttons, inputs, cards, etc.), possibly from Shadcn UI.
    - `src/components/forms/`: For specific form components (e.g., `AssayDataForm.tsx`).
    - `src/components/features/` or `src/components/[feature-name]/`: For components related to specific application features.
    - `[TODO: Document actual sub-folder structure if more specific patterns are observed.]`

- **Types of Components**:
    - **Server Components (Default)**: Run on the server, can directly access server-side resources (like database via Drizzle) and perform async operations. Cannot use hooks like `useState` or `useEffect` or browser-only APIs.
    - **Client Components (`"use client"` directive)**: Pre-rendered on the server (if part of initial load), then hydrated and run on the client. Can use hooks, state, effects, and browser APIs. Needed for interactivity.

- **Styling**: Use Tailwind CSS utility classes directly in the JSX.
  ```tsx
  // Example Component with Tailwind CSS
  // src/components/ui/Button.tsx
  type ButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>;

  export const Button = ({ children, onClick, className, ...props }: ButtonProps) => {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  };
  ```

- **Where and How to Tweak Existing UI Components**:
    1.  **Identify the Component**: Use browser developer tools (React DevTools) to find the name of the component you want to modify.
    2.  **Locate the File**: Search for the component file in `src/components/` or `src/app/` (if it's a page-specific component).
    3.  **Understand its Props**: Check the component's TypeScript type definitions for its props to see how it can be configured.
    4.  **Modify Styles**: Adjust Tailwind classes directly in the JSX.
    5.  **Modify Logic**: For Client Components, update state, effects, or event handlers. For Server Components, adjust data fetching or server-side logic.
    6.  **Test**: Thoroughly test your changes.
    7.  Refer to [[Component Documentation Template]] for documenting individual components if needed.

## 4. Adding a New Assay: UI, Form, API, Drizzle Model

This outlines the general steps to add a new feature, using an "assay" as an example. Let's assume we're adding a "Metabolomics Assay".

**Estimated Files Involved:**
-   Database Schema: `src/lib/db/schema.ts`
-   New Drizzle Model: (part of `schema.ts`)
-   API Route Handler: `src/app/api/assays/metabolomics/route.ts`
-   Frontend Page/Component: `src/app/assays/metabolomics/page.tsx` or `src/components/forms/MetabolomicsForm.tsx`
-   Types/Interfaces: Potentially `src/lib/types/assays.ts`

**Steps:**

1.  **Define Database Model (Drizzle)**:
    *   Open `src/lib/db/schema.ts`.
    *   Add a new table definition for `results_metabolomics` in the `laboratory` schema (or appropriate schema).
      ```typescript
      // In src/lib/db/schema.ts, within laboratory schema
      export const results_metabolomicsInLaboratory = laboratory.table("results_metabolomics", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" }),
        date_metabolomics: date("date_metabolomics"),
        metabolite_x_concentration: numeric("metabolite_x_concentration"),
        metabolite_y_score: numeric("metabolite_y_score"),
        // ... other specific fields
        qc_pass_metabolomics: varchar("qc_pass_metabolomics", { length: 50 }),
        qc_notes_metabolomics: text("qc_notes_metabolomics"),
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
        // Add indexes if needed
      });
      ```
    *   Run Drizzle migration commands: `pnpm drizzle-kit generate:pg` and then `pnpm drizzle-kit migrate`. See [[03_DATABASE#Schema Migrations]].

2.  **Create API Endpoint (Next.js Route Handler)**:
    *   Create `src/app/api/assays/metabolomics/route.ts`.
    *   Implement `POST` (to create new results), `GET` (to fetch results), `PUT` (to update), etc.
      ```typescript
      // src/app/api/assays/metabolomics/route.ts (Simplified POST example)
      import { NextRequest, NextResponse } from 'next/server';
      import { db } from '@/lib/db';
      import { results_metabolomicsInLaboratory } from '@/lib/db/schema';
      // import { z } from 'zod'; // For validation

      // const metabolomicsSchema = z.object({ /* ... define Zod schema for validation */ });

      export async function POST(request: NextRequest) {
        try {
          const body = await request.json();
          // const validatedData = metabolomicsSchema.parse(body); // Validate
          const newData = await db.insert(results_metabolomicsInLaboratory).values(body).returning();
          return NextResponse.json(newData[0], { status: 201 });
        } catch (error) {
          // Handle validation errors, database errors
          return NextResponse.json({ message: "Error creating metabolomics result", error }, { status: 500 });
        }
      }
      // Implement GET, PUT, DELETE as needed
      ```

3.  **Develop UI Form & Page (React Components)**:
    *   Create a form component, e.g., `src/components/forms/MetabolomicsForm.tsx` (as a Client Component `"use client"`).
    *   Use Shadcn UI components or other UI primitives for form fields.
    *   Handle form state, validation (client-side and/or server-side via Zod in API).
    *   On submit, call the API endpoint created in step 2 (or use a Server Action).
    *   Create a page to host this form or display data, e.g., `src/app/assays/metabolomics/page.tsx`.
      ```tsx
      // src/components/forms/MetabolomicsForm.tsx (Simplified Example)
      "use client";
      import { useState } from 'react';
      // import { Input } from "@/components/ui/input";
      // import { Button } from "@/components/ui/button";

      export const MetabolomicsForm = ({ sampleId }: { sampleId: string }) => {
        const [formData, setFormData] = useState({ /* initial form data */ });

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          const response = await fetch('/api/assays/metabolomics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, sample_id: sampleId }),
          });
          // Handle response, show success/error message
        };
        // ... form JSX with inputs and button
        return <form onSubmit={handleSubmit}>{/* ... */}</form>;
      };
      ```

4.  **Define Types/Interfaces (Optional but Recommended)**:
    *   Create or update TypeScript types for the new assay data in a shared location, e.g., `src/lib/types/assays.ts`.

5.  **Navigation & Links**: Add links to the new assay page/functionality from relevant parts of the application (e.g., a navigation menu, a sample details page).

6.  **Testing**: Test the entire flow from UI to database.

This is a general guideline. Specific implementation details will depend on the existing codebase structure and conventions.

## 5. State Management

- **Local Component State**: `useState` and `useReducer` in Client Components.
- **Server Cache/State**: Next.js App Router provides caching for Server Components and fetched data. Server Actions manage server-side state mutations.
- **URL State**: Using search params or dynamic route segments.
- **Global State (if needed)**: For complex cross-component state, consider:
    - React Context API (for simpler cases).
    - Zustand, Jotai (for more complex global state, if already in use or deemed necessary).
    - `[TODO: Identify if a global state management library is currently used, e.g., by checking package.json and src/lib/store or src/context]`

---
Links to: [[02 – System Architecture]], [[03 – Database]], [[08 – Templates & Appendices#Component Documentation Template]] 