# Stage 1: Install dependencies and build the application
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables if needed (can be passed during build)
# ARG NEXT_PUBLIC_SOME_VAR
# ENV NEXT_PUBLIC_SOME_VAR=$NEXT_PUBLIC_SOME_VAR

RUN npm run build

# Stage 2: Production image with only necessary artifacts
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Optionally set timezone if needed by your app
# ENV TZ=America/New_York
# RUN apk add --no-cache tzdata

# Copy built artifacts from the builder stage
COPY --from=builder /app/public ./public
# Copy standalone output
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Set user to non-root for better security
USER node

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Set run-time environment variables (App Runner can override these)
ENV PORT=3000

# Command to run the standalone server
CMD ["node", "server.js"] 