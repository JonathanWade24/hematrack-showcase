---
tags: [moc, troubleshooting, errors, debugging, logs, issues]
aliases: [Troubleshooting Guide, Common Errors, Debugging, Problem Solving]
---

# 07 – Troubleshooting

This document provides a guide to common error patterns, solutions, and general troubleshooting strategies for the application.

## 1. General Debugging Steps

1.  **Check Logs**: This is almost always the first step.
    *   **Browser Console**: For frontend issues (JavaScript errors, network requests).
    *   **Next.js Application Logs (Server-Side)**: View the output of `pnpm dev` (local) or Docker container logs (deployed).
        ```bash
        # Local development (Next.js console output)
        # Docker (deployed - find your container name/ID)
        docker logs [your-app-container-name]
        docker logs -f [your-app-container-name] # To follow logs
        ```
    *   **PostgreSQL Logs**: If you suspect database-level errors. Location depends on your Postgres setup.
    *   **Metabase Logs**: For issues related to Metabase itself (admin access usually required).
2.  **Reproduce the Issue**: Try to reliably reproduce the error. Note the steps taken.
3.  **Isolate the Problem**: Simplify the scenario. Does it happen with specific data? On a particular page? After a certain action?
4.  **Check Recent Changes**: If the issue started recently, review recent code commits or configuration changes.
5.  **Consult Documentation**: Check this Obsidian vault, especially specific MOCs like [[03_DATABASE]] or [[01_SETUP_AND_DEPLOYMENT]].
6.  **Search Online**: Use specific error messages to search on Google, Stack Overflow, or relevant GitHub issue trackers (Next.js, Drizzle ORM, etc.).

## 2. Common Error Patterns & Solutions

### 2.1. Database & Migrations Issues

-   **Error**: "Connection to database failed" / "Could not connect to server".
    -   **Solution (Local)**: Ensure PostgreSQL is running. Verify `POSTGRES_URL` in `.env.local` is correct (user, password, host, port, database name). Check network connectivity to the DB host.
    -   **Solution (Deployed)**: Verify Docker container has correct `POSTGRES_URL`. Check network rules/firewalls between app server and DB server. Ensure DB server is running and accessible.

-   **Error**: Drizzle migration fails (e.g., `pnpm drizzle-kit migrate` error).
    -   **Reason**: SQL error in migration file, conflict with existing data, database user permissions.
    -   **Solution**: 
        1. Read the error message carefully – it often points to the problematic SQL statement or constraint.
        2. Examine the relevant migration file in `drizzle/migrations/`.
        3. Connect to the database directly (e.g., `psql` or Drizzle Studio) and try to run the problematic part of the SQL manually to understand the error.
        4. You might need to manually adjust the migration file (if it's a syntax issue Drizzle Kit generated incorrectly) or fix the underlying data/schema conflict.
        5. If a migration was partially applied, the database might be in an inconsistent state. You might need to restore from a backup or manually revert changes. `[TODO: Define a clear rollback strategy for failed migrations if possible, e.g., using drizzle-kit push/drop for dev, or manual SQL otherwise.]`

-   **Error**: "Unique constraint violated" when inserting/updating data.
    -   **Solution**: Check your Drizzle schema (`src/lib/db/schema.ts`) for `unique()` constraints. Ensure the data you're trying to save doesn't conflict with existing records.

-   **Error**: "Foreign key constraint failed".
    -   **Solution**: You are trying to insert/update a record with a value in a foreign key column that doesn't exist in the referenced primary key column of the parent table. Ensure parent records exist.

-   **Slow Queries / Performance Issues**: 
    -   **Solution**: Use `EXPLAIN ANALYZE` in PostgreSQL to understand query plans. Add necessary database indexes (see `index()` in Drizzle schema). Optimize query logic. See [[03_DATABASE]] for schema and [[06_METABASE_INTEGRATION]] for query best practices.

### 2.2. Docker Build & Deployment Issues

-   **Error**: Docker build fails (`docker build .`).
    -   **Solution**: Read the error output carefully. Common issues:
        -   Missing files specified in `COPY` commands in `Dockerfile`.
        -   `pnpm install` (or `npm install`) fails due to network issues, missing dependencies in `package.json`, or incompatible Node.js/pnpm versions (check `Dockerfile` base image).
        -   Syntax errors in `Dockerfile`.
        -   Ensure `.dockerignore` is not excluding necessary files.

-   **Error**: Docker container fails to start or exits immediately.
    -   **Solution**: Check `docker logs [container_name]`. Common issues:
        -   Application inside the container crashes on start (e.g., missing environment variables, DB connection failure, code error).
        -   Incorrect `CMD` or `ENTRYPOINT` in `Dockerfile`.
        -   Port conflicts if the host port is already in use.

-   **Error**: Application in Docker container cannot connect to services (e.g., Postgres).
    -   **Solution**: 
        - If Postgres is also a Docker container on the same host: Ensure they are on the same Docker network. Use Docker service names for hostnames in connection strings (e.g., `postgres` instead of `localhost` if `postgres` is the service name in `docker-compose.yml`).
        - If Postgres is external: Ensure the `POSTGRES_URL` is correct and the Docker container's network can reach the Postgres host and port.

### 2.3. Frontend / Next.js Issues

-   **Error**: Hydration errors in browser console (common in Next.js).
    -   **Reason**: Mismatch between server-rendered HTML and what React expects to render on the client.
    -   **Solution**: Carefully check component logic, especially conditional rendering or use of browser-specific APIs (`window`, `document`) without proper checks (e.g., `typeof window !== "undefined"`) or in Server Components. Ensure data used for initial render is consistent.

-   **Error**: API route returns 404 or 500.
    -   **Solution (404)**: Check file path and naming for API route handlers (`src/app/api/.../route.ts`).
    -   **Solution (500)**: Check server-side logs for the API route. There's an unhandled error in your route handler logic (e.g., database error, type error). Add `try...catch` blocks for robust error handling. See [[04_FRONTEND_AND_API]].

-   **Error**: Tailwind CSS styles not applying.
    -   **Solution**: Ensure Tailwind is correctly configured (`tailwind.config.ts`, `postcss.config.mjs`). Check that `src/app/globals.css` (or equivalent) includes Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`). Verify class names are correct and not being purged if dynamically generated (check `tailwind.config.ts` `content` paths).

### 2.4. Authentication / Authorization Issues

-   **Error**: User cannot log in / access protected routes.
    -   **Solution**: 
        - Check NextAuth.js configuration (`src/app/api/auth/[...nextauth]/route.ts`) if used. Verify provider credentials/settings.
        - Check `middleware.ts` if used for route protection.
        - Look for errors in server logs during the authentication attempt.
        - Ensure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` environment variables are correctly set.
        - See [[05_USER_AND_PERMISSIONS]].

## 3. Dependency Management

-   **Updating Dependencies**: 
    -   Use `pnpm up -L -i` (or `npm update / yarn upgrade-interactive`) to check for updates.
    -   Update packages one by one or in small groups to isolate breaking changes.
    -   Consult changelogs for major version updates.
    -   Test thoroughly after updates.
-   **Resolving Conflicts**: If dependency conflicts arise, `pnpm` usually handles them well. For `npm`, you might need to use `--force` or `--legacy-peer-deps` (use with caution) or manually resolve.

## 4. Rollback Strategies

-   **Code**: Revert to a previous Git commit/branch/tag.
    ```bash
    git checkout [commit_hash_or_branch_name]
    ```
-   **Database Migrations**: This is more complex.
    -   **Best Case**: If the migration only adds tables/columns, a new migration could drop them.
    -   **Drizzle ORM**: Drizzle doesn't have built-in down migrations. You'd need to write SQL manually to revert schema changes or restore from a backup.
    -   **Strategy**: For critical changes, always back up the database before migrating. Test migrations thoroughly in staging. See [[03_DATABASE#Best Practices for Migrations]].
-   **Docker Images**: If a new Docker image causes issues, redeploy a previously working image tag from your Docker registry.
    ```bash
    # (On server) Stop and remove bad container
    docker stop [container_name] && docker rm [container_name]
    # Run previous image tag
    docker run ... [your-registry/your-app-name:previous-working-tag]
    ```

## 5. Logging

- **Frontend Logging**: Use `console.log`, `console.warn`, `console.error` judiciously. Consider a third-party logging service (e.g., Sentry, LogRocket) for production frontend error tracking.
    - `[TODO: Check if any client-side logging/monitoring service is integrated.]`
- **Backend Logging (Next.js/Node.js)**: Default console logs go to STDOUT/STDERR, captured by Docker.
    - For structured logging in production, consider libraries like Pino or Winston.
    - `[TODO: Check if structured logging is implemented. If so, document its format and how to access/query logs if stored centrally.]`
- **PostgreSQL Logging**: Configure in `postgresql.conf`. Useful for debugging complex DB issues.

---
*This is a living document. Add new troubleshooting tips as issues are discovered and resolved.*
Links to: [[01 – Setup & Deployment]], [[03 – Database]], [[04 – Frontend & API]], [[05 – User & Permissions]] 