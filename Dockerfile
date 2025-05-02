# Dockerfile
# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Builder stage
FROM base AS builder

# Copy package files and prisma schema FIRST
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Add .npmrc file if it exists (optional, for engine config etc.)
# COPY .npmrc ./

# Install dependencies
# This will also trigger the `postinstall` script (prisma generate)
# which now has access to the schema
RUN npm ci 

# Copy the rest of the application code
# Important: Copy code AFTER npm ci + postinstall to leverage caching
COPY . .

# Copy build-time environment variables
COPY .env.docker .env

# --- Prisma generate is now handled by postinstall --- 

# Build the Next.js application
# Needs NODE_ENV=production and the .env file
ENV NODE_ENV=production
RUN npm run build

# Clean up the temporary .env file
RUN rm .env

# --- Installation of production dependencies is handled by `output: standalone` --- 

# 2. Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1 # Already set in builder, check if needed here

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy application artifact from builder stage
# Includes node_modules needed for runtime via `standalone` output
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema needed for runtime (e.g., for migrations)
COPY --from=builder /app/prisma ./prisma

# Optionally, copy Prisma Client Engines if not included in standalone 
# (May be needed depending on Prisma version and specific features used)
# COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime command - relies on env vars passed via `docker run -e ...`
CMD ["node", "server.js"] 