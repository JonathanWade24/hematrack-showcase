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
Create a `.env.local` file (or `.env` if specified by the project, check `.gitignore`) in the root of the project and populate it with the necessary environment variables.
Refer to `.env.example` if available, or add the following common keys:

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (PostgreSQL with Drizzle ORM)
POSTGRES_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
# Example: POSTGRES_URL="postgresql://postgres:mysecretpassword@localhost:5432/mydb"

# Authentication (if applicable)
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET= # Generate a strong secret: openssl rand -hex 32

# Other service keys
# ... [TODO: List other required .env keys based on project needs, e.g., S3, Stripe, etc.]
```
**Note:** Ensure your PostgreSQL connection string is correct and the database exists.

### 1.5. Initialize PostgreSQL Database
- Ensure PostgreSQL is running.
- Create the database specified in `POSTGRES_URL`.
- Drizzle ORM will handle schema creation/migration.

### 1.6. Drizzle ORM Commands
Refer to `package.json` for exact script names. Common commands include:

- **Generate Migrations:** After changing your schema in `drizzle/schema.ts` (or relevant schema files):
  ```bash
  pnpm drizzle-kit generate:pg
  # or npm run drizzle-kit generate:pg
  ```
- **Apply Migrations:** To apply pending migrations to your database:
  ```bash
  pnpm drizzle-kit migrate
  # or npm run drizzle-kit migrate
  # Some projects might have a custom script like `pnpm db:migrate`
  ```
- **Drizzle Studio (Optional):** For a UI to browse your database:
  ```bash
  pnpm drizzle-kit studio
  # or npm run drizzle-kit studio
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

The project uses Docker for containerization. Key files:
- `Dockerfile`: Defines the image for the Next.js application. Found at the root.
- `.dockerignore`: Specifies files to exclude from the Docker build context. Found at the root.
- `docker-compose.yml` (if used for local development with services like Postgres): [TODO: Check if docker-compose.yml exists and document its services]

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
docker build -t your-app-name:latest .
# Example: docker build -t scd-dashboard:latest .
```

### 2.3. Running the Docker Container Locally
```bash
# Ensure your .env variables (especially POSTGRES_URL if connecting to an external DB)
# are either baked into the image (not recommended for secrets) or passed at runtime.
docker run -p 3000:3000 --env-file ./.env.local your-app-name:latest
# Or for specific variables:
# docker run -p 3000:3000 -e POSTGRES_URL="your_db_connection_string" your-app-name:latest

# If you have a docker-compose.yml for local development:
# docker-compose up -d --build
```

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
- Application logs can be managed using Docker logging drivers or by mounting volumes for log files. See [[07_TROUBLESHOOTING#Logging]].

### 3.6. Ubuntu Deployment Steps (Summary from `Server Setup Part 2.md` if relevant)
[TODO: If `Server Setup Part 2.md` contains specific, non-generic steps that are crucial for this project's Ubuntu deployment, summarize them here. Otherwise, mark as N/A or rely on the generic steps above.]

---
Link to: [[02 – System Architecture]], [[03 – Database]], [[07 – Troubleshooting]] 