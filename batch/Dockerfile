# Batch worker image for video codec conversion
# Uses ffmpeg for transcoding operations
#
# Build TypeScript first: npm ci && npm run build
# Then build Docker: docker build -t codec-converter-batch .
#
FROM node:18-bullseye-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
# Note: Uses --prefer-offline to leverage npm cache when available
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source code
COPY src/ ./src/

# Build TypeScript using local tsc
RUN ./node_modules/.bin/tsc

# Production stage
FROM node:18-bullseye-slim

# Install ffmpeg and dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit --no-fund

# Copy built application from builder
COPY --from=builder /app/dist/ ./dist/

# Set entrypoint to compiled worker script
ENTRYPOINT ["node", "dist/worker.js"]
