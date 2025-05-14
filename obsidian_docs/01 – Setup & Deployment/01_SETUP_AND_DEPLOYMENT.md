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

### 3.2. Deployment Workflow (Manual Example)

1.  **Build the Docker Image:**
    - Build locally (as above) or on a build server.
    ```bash
    docker build -t your-registry/your-app-name:tag .
    # Example: docker build -t mydockerhubusername/scd-dashboard:v1.0.1 .
    ```

2.  **Push Image to a Docker Registry (Optional but Recommended):**
    - E.g., Docker Hub, AWS ECR, GitHub Container Registry.
    ```bash
    docker login your-registry
    # Example: docker login
    docker push your-registry/your-app-name:tag
    # Example: docker push mydockerhubusername/scd-dashboard:v1.0.1
    ```

3.  **On the Ubuntu Server:**
    - **Pull the Image:**
      ```bash
      ssh user@your-server-ip
      docker pull your-registry/your-app-name:tag
      # Example: docker pull mydockerhubusername/scd-dashboard:v1.0.1
      ```
    - **Stop and Remove Old Container (if any):**
      ```bash
      docker stop your-app-container-name || true
      docker rm your-app-container-name || true
      # Example: docker stop scd-dashboard-prod || true && docker rm scd-dashboard-prod || true
      ```
    - **Run the New Container:**
      Ensure you provide necessary environment variables. Using a `.env` file on the server is a common practice.
      ```bash
      # Create an .env file on the server (e.g., /opt/app/.env) with production values
      docker run -d --restart always \
        -p 3000:3000 \
        --env-file /opt/app/.env \
        --name your-app-container-name \
        your-registry/your-app-name:tag
      # Example:
      # docker run -d --restart always \
      #   -p 80:3000 \ # If Nginx is not used, or mapping directly
      #   --env-file /srv/scd-dashboard/.env.production \
      #   --name scd-dashboard-prod \
      #   mydockerhubusername/scd-dashboard:v1.0.1
      ```
      **Note:** The `-p 80:3000` example maps port 80 on the host to port 3000 in the container. If using Nginx as a reverse proxy, Nginx would listen on port 80/443 and forward to the container's port 3000.

### 3.4. Setting up a Reverse Proxy (Nginx Example)
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

### 3.5. Persistent Data
- For the PostgreSQL database, ensure its data is persisted. If running Postgres in Docker, use named volumes.
- Application logs can be managed using Docker logging drivers or by mounting volumes for log files. See [[09_TROUBLESHOOTING#Logging]].

### 3.6. Ubuntu Deployment Steps (Summary from `Server Setup Part 2.md` if relevant)
[TODO: If `Server Setup Part 2.md` contains specific, non-generic steps that are crucial for this project's Ubuntu deployment, summarize them here. Otherwise, mark as N/A or rely on the generic steps above.]

---
Link to: [[02 – System Architecture]], [[03 – Database]], [[07 – Troubleshooting]] 