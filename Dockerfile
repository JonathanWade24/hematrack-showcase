# Dockerfile
# Base image for installing dependencies
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock / pnpm-lock.yaml)
# Assumes package files are in the workspace root
COPY package.json package-lock.json* ./

# Install dependencies using npm ci for consistency
RUN npm ci

# ---

# Builder stage: Build the Next.js application
FROM base AS builder
WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application source code from the root
# This includes the 'src' directory if it exists in the root
COPY . ./

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the Next.js application
# This assumes your build script is named 'build' in package.json
RUN npm run build

# ---

# Runner stage: Create the final production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage (relative to WORKDIR /app in builder)
COPY --from=builder /app/.next/standalone ./
# Copy the static assets from the public directory (relative to WORKDIR /app in builder)
COPY --from=builder /app/public ./public
# Copy the static assets built by Next.js (relative to WORKDIR /app in builder)
COPY --from=builder /app/.next/static ./.next/static

# Copy prisma schema and generate client
COPY --from=builder /app/prisma ./prisma
RUN npm install -g prisma
RUN prisma generate

USER nextjs

# Expose the port the app runs on (default 3000)
EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# Define the command to start the application
# The entrypoint is server.js in the standalone output directory
CMD ["node", "server.js"] 