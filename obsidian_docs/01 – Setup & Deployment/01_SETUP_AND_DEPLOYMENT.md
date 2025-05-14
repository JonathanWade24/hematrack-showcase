---
tags: [moc, setup, deployment, docker, postgres]
aliases: [Setup, Deployment, Local Environment, Docker Setup]
---

# 01 – Setup & Deployment

This document provides instructions for setting up the local development environment, building and running the application with Docker, and deploying it to an Ubuntu server.

## 1. Local Development Setup

### 1.1. Prerequisites
- Node.js (version specified in `.nvmrc` or `package.json`, e.g., v18.x or v20.x)
- pnpm (or npm/yarn, verify `package.json` scripts)
- Docker & Docker Compose
- Access to a PostgreSQL instance

### 1.2. Clone Repository
```bash
git clone [YOUR_REPOSITORY_URL]
cd [PROJECT_DIRECTORY]
```

### 1.3. Install Dependencies
Check `package.json` for the correct package manager. Assuming `pnpm`:
```bash
pnpm install
```
If using `npm`:
```bash
npm install
```

### 1.4. Environment Variables (`.env`)
Create a `.env.local` file in the root of the project and populate it with the necessary environment variables.
Based on your provided `.env.local` and project dependencies, key variables include:

```env
# Next.js (Defaults, adjust if needed)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (PostgreSQL with Drizzle ORM)
# For local Next.js server (node server on host) connecting to local Postgres:
DATABASE_URL="postgresql://jonathanwade@localhost:5432/scd_research_refactored"
# For Docker build process (if DATABASE_URL is needed at build time, as suggested by Dockerfile comment):
# The Dockerfile example was: DATABASE_URL="postgresql://jonathanwade@host.docker.internal:5432/scd_research_refactored"
# Ensure the correct one is available or passed during `npm run build` if run within Docker or for Docker builds.

# Authentication (NextAuth.js)
NEXTAUTH_URL="http://10.66.54.59" # As provided, typically http://localhost:3000 for local dev
NEXTAUTH_SECRET="KLEDpi+o8183f7rpG4Tfi4U26WFtj+XIxqcCPDKjVTw=" # As provided

# TODO: Add any other NextAuth.js provider credentials if used (e.g., GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).

# Other service keys (potential based on dependencies)
# AWS Secrets Manager (if @aws-sdk/client-secrets-manager is actively used to fetch secrets) - User confirmed this is not actively used.
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_SECRETS_MANAGER_SECRET_ID=

# TODO: List any other required .env keys (e.g., for Keycloak if its client is actively used, Supabase if its JS client is used for more than SSR helpers).
```
**Note:**
- The `NEXTAUTH_URL` you provided (`http://10.66.54.59`) seems like a specific IP. For typical local development, this is often `http://localhost:3000`. Ensure this is correct for your local setup vs. deployed environments.
- Ensure your PostgreSQL connection string is correct and the database exists and is accessible.

### 1.5. Initialize PostgreSQL Database
- Ensure PostgreSQL is running.
- Create the database specified in `DATABASE_URL`.
- Drizzle ORM will handle schema creation/migration based on files in `src/lib/drizzle/` (as per Dockerfile).

### 1.6. Drizzle ORM Commands
Common Drizzle Kit commands are typically run directly using `npx`:

- **Generate Migrations:** After changing your schema in `src/lib/db/schema.ts` (or relevant schema files, likely under `src/lib/drizzle/` or `src/lib/db/`):
  ```bash
  npx drizzle-kit generate:pg
  ```
- **Apply Migrations:** To apply pending migrations to your database (migrations are in `src/lib/drizzle/migrations/` if Dockerfile path is accurate):
  ```bash
  npx drizzle-kit migrate
  ```
- **Drizzle Studio (Optional):** For a UI to browse your database:
  ```bash
  npx drizzle-kit studio
  ```
  See [[03_DATABASE#Drizzle Studio]] for more details.

### 1.7. Running the Application Locally
Check `package.json` for the development script:
```bash
pnpm dev
# or npm run dev
```
The application should now be accessible at `http://localhost:3000` (or as configured).

### 1.8. Key `package.json` Scripts
- `dev`: Starts the development server.
- `build`: Creates a production build of the application.
- `start`: Starts the production server (after building).
- `lint`: Runs linters (e.g., ESLint).
- `test`: Runs tests (e.g., Jest, Playwright).
- `drizzle-kit generate:pg`: Generates SQL migration files based on schema changes.
- `drizzle-kit migrate`: Applies migrations to the database.
- `drizzle-kit studio`: Opens Drizzle Studio.
- `[TODO: Add any other important custom scripts from package.json]`

## 2. Docker Setup

The project uses Docker for containerization, primarily to package the Next.js application for deployment. Key files:
- `Dockerfile`: Defines the image for the Next.js application. Found at the root.
- `.dockerignore`: Specifies files to exclude from the Docker build context. Found at the root.
- `docker-compose.yml`: Not typically used for local development in this project, as Docker is focused on packaging the standalone Next.js application.

### 2.1. Understanding the `Dockerfile`
I will read the `Dockerfile` to provide a summary here.
[TODO: Read `Dockerfile` and summarize its stages and key commands. Example:
- Multi-stage build (builder and runner)
- Copies `package.json`, `pnpm-lock.yaml` (or equivalent) and installs dependencies
- Copies source code
- Builds the Next.js application (`pnpm build`)
- Sets up the runtime environment, exposes port (e.g., 3000)
- Defines the CMD or ENTRYPOINT to run the application (`pnpm start`)]

### 2.2. Building the Docker Image
From the project root directory:
```bash
docker build -t scd-dashboard:latest .
# The DATABASE_URL for the build process is typically sourced from the environment
# where the `docker build` command is run, or it might be hardcoded
# in the Dockerfile (as seen in the example within the Dockerfile's build stage) if appropriate for your setup.
# If it needs to be passed explicitly as a build argument (and the Dockerfile is set up to receive it with ARG DATABASE_URL):
# docker build --build-arg DATABASE_URL="your_build_time_db_url" -t scd-dashboard:latest .
```

### 2.3. Running the Docker Container Locally
To run the built container, you'll need to provide runtime environment variables. Common methods include:
1.  Using an environment file (`--env-file`):
    ```bash
    # Ensure your .env.local file (or a dedicated .env.production file) has the runtime DATABASE_URL
    # and other necessary runtime environment variables like NEXTAUTH_URL, NEXTAUTH_SECRET.
    docker run -p 3000:3000 --env-file ./.env.local scd-dashboard:latest
    ```
2.  Passing variables individually (`-e`):
    ```bash
    # docker run -p 3000:3000 \
    #   -e DATABASE_URL="postgresql://user:pass@runtime_host:port/db" \
    #   -e NEXTAUTH_URL="http://localhost:3000" \
    #   -e NEXTAUTH_SECRET="your_secret" \
    #   scd-dashboard:latest
    ```
Choose the method that best suits your workflow. Using an `--env-file` is often more convenient for managing multiple variables.

## 3. Deployment to Ubuntu Server

This section outlines a general workflow for deploying the Dockerized application to an Ubuntu server. Specific steps might vary based on your server setup (e.g., Nginx, SSL, CI/CD pipeline).

### 3.1. Prerequisites on Server
- Docker installed on the Ubuntu server.
- PostgreSQL database accessible by the server (can be local, on another Docker container, or a managed service).
- (Optional but recommended) Nginx or another reverse proxy.
- (Optional) CI/CD system for automating builds and deployments.

### 3.2. Deployment Workflow

This section outlines the typical workflow for building a new version of the application locally and deploying it to the server.

**Prerequisites:**
*   Docker (and Docker Buildx for multi-platform builds) configured on your local machine.
*   Docker installed on the deployment server.
*   SSH access to the deployment server.
*   The application code updated with the latest changes.

**Steps:**

1.  **Local Machine: Build the Docker Image**
    *   Build the image specifically for the `linux/amd64` platform (common for many servers). The `--load` flag is important if your local machine architecture differs from the target, as it loads the image into the local Docker daemon.
    ```bash
    docker buildx build --platform linux/amd64 -t scd-dashboard:latest --load .
    ```

2.  **Local Machine: Save the Docker Image**
    *   Save the newly built image to a `.tar` file. It's good practice to include a version or date in the filename for tracking.
    ```bash
    # Replace YYYY-MM-DD with the current date or version
    docker save -o scd-dashboard_amd64_YYYY-MM-DD.tar scd-dashboard:latest
    ```
    *   Example: `docker save -o scd-dashboard_amd64_2023-10-15.tar scd-dashboard:latest`

3.  **Local Machine: Transfer Image to Server**
    *   Use `scp` (Secure Copy) to transfer the `.tar` file to your deployment server. Replace `your_user`, `your_server_ip`, and `/path/to/deploy/directory/` with your actual server details.
    ```bash
    scp scd-dashboard_amd64_YYYY-MM-DD.tar your_user@your_server_ip:/path/to/deploy/directory/
    ```
    *   Example: `scp scd-dashboard_amd64_2023-10-15.tar sheehanlab_db@10.224.106.69:/opt/scd-dashboard/`

4.  **Server: SSH into the Server**
    *   Connect to your server via SSH.
    ```bash
    ssh your_user@your_server_ip
    ```
    *   Navigate to the directory where you copied the `.tar` file (e.g., `/opt/scd-dashboard/`).

5.  **Server: Stop and Remove Old Container**
    *   Stop the currently running application container.
    ```bash
    docker stop scd-dashboard-app
    ```
    *   Remove the stopped container to avoid name conflicts.
    ```bash
    docker rm scd-dashboard-app
    ```

6.  **Server: Load the New Docker Image**
    *   Load the image from the `.tar` file into the server's Docker daemon.
    ```bash
    docker load -i scd-dashboard_amd64_YYYY-MM-DD.tar
    ```
    *   If an image with the same tag (`scd-dashboard:latest`) already exists, Docker may rename the old one.

7.  **Server: Run the New Container**
    *   Run the new version of the application using the loaded image. Ensure all environment variables are correctly set for your server environment.
    ```bash
    docker run -d \
      --name scd-dashboard-app \
      -p 3000:3000 \
      -e DATABASE_URL="postgresql://jonathanwade@172.17.0.1:5432/scd_research_refactored" \
      -e NEXTAUTH_URL="http://10.224.106.69:3000" \
      -e NEXTAUTH_SECRET="KLEDpi+o8183f7rpG4Tfi4U26WFtj+XIxqcCPDKjVTw=" \
      -e AUTH_TRUST_HOST="true" \
      --restart unless-stopped \
      scd-dashboard:latest
    ```
    *   **Note on `DATABASE_URL` for Docker**: The IP `172.17.0.1` is often the default gateway for the Docker bridge network, allowing containers to reach services running on the host machine. If your PostgreSQL database is running as another Docker container on the same custom Docker network, you would typically use that container's service name as the host in the `DATABASE_URL`.
    *   Verify the application is running correctly by accessing its URL.

### 3.3. Setting up a Reverse Proxy (Nginx Example)
[TODO: Add basic Nginx configuration snippet if applicable.
Example:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000; # Assuming container is mapped to host port 3000
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Remember to configure SSL (e.g., with Certbot) for HTTPS.]

### 3.4. Persistent Data
- PostgreSQL database is installed directly on the Ubuntu server, not in Docker. The application container connects to this local PostgreSQL instance via the DATABASE_URL environment variable.
- Application logs can be managed using Docker logging drivers or by mounting volumes for log files. See [[09_TROUBLESHOOTING#Logging]].

## 4. Environment Variables Summary

```env
# Next.js (Defaults, adjust if needed)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (PostgreSQL with Drizzle ORM)
# For local Next.js server (node server on host) connecting to local Postgres:
DATABASE_URL="postgresql://jonathanwade@localhost:5432/scd_research_refactored"
# For Docker build process (if DATABASE_URL is needed at build time, as suggested by Dockerfile comment):
# The Dockerfile example was: DATABASE_URL="postgresql://jonathanwade@host.docker.internal:5432/scd_research_refactored"
# Ensure the correct one is available or passed during `npm run build` if run within Docker or for Docker builds.

# Authentication (NextAuth.js)
NEXTAUTH_URL="http://10.66.54.59" # As provided, typically http://localhost:3000 for local dev
NEXTAUTH_SECRET="KLEDpi+o8183f7rpG4Tfi4U26WFtj+XIxqcCPDKjVTw=" # As provided

# TODO: Add any other NextAuth.js provider credentials if used (e.g., GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).

# Other service keys (potential based on dependencies)
# AWS Secrets Manager (if @aws-sdk/client-secrets-manager is actively used to fetch secrets) - User confirmed this is not actively used.
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_SECRETS_MANAGER_SECRET_ID=

# TODO: List any other required .env keys (e.g., for Keycloak if its client is actively used, Supabase if its JS client is used for more than SSR helpers).
```

---
Link to: [[02 – System Architecture]], [[03 – Database]] 