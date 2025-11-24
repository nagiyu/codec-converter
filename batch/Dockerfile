# Batch worker image for video codec conversion
# Uses ffmpeg for transcoding operations
FROM node:18-bullseye-slim

# Install ffmpeg and dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production || npm install --production --legacy-peer-deps

# Copy application source
COPY src/ ./src/

# Set entrypoint to worker script
ENTRYPOINT ["node", "src/worker.js"]
