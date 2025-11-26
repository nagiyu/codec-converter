# Batch worker image for video codec conversion
# Uses ffmpeg for transcoding operations
FROM node:18-bullseye-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install || npm install --legacy-peer-deps

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-bullseye-slim

# Install ffmpeg and dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --production || npm install --production --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/dist/ ./dist/

# Set entrypoint to compiled worker script
ENTRYPOINT ["node", "dist/worker.js"]
