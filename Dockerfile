# Dockerfile
# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Builder stage
FROM base AS builder

# Copy package files
COPY package.json package-lock.json ./
# COPY .npmrc ./ # If you have an .npmrc file

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# If you have a specific build-time .env file (NOT for secrets)
# COPY .env.docker .env

# Build the Next.js application
ENV NODE_ENV=production
# Provide the DATABASE_URL for the build process, using host.docker.internal for host DB access
RUN DATABASE_URL="postgresql://jonathanwade@host.docker.internal:5432/scd_research_refactored" npm run build

# Clean up build-time .env if it was used
# RUN rm .env

# 2. Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1 # Consider if needed

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy application artifact from builder stage (standalone output)
COPY --from=builder /app/.next/standalone ./

# Copy public and static assets from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Drizzle configuration and migrations 
# Adjust path if your Drizzle files are elsewhere. Assuming migrations are in 'src/lib/drizzle' and config is at root.
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/drizzle ./src/lib/drizzle

USER nextjs

EXPOSE 3000

ENV PORT=3000
# ENV HOSTNAME=0.0.0.0 # Default for Next.js standalone is 0.0.0.0

CMD ["node", "server.js"] 