FROM node:20-bullseye-slim

# Install system dependencies: native FFmpeg and CA certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies (fallback to npm install if optional dependencies mismatch cross-platform)
RUN npm ci || npm install --include=optional

# Copy application source
COPY . .

# Build production bundle (compiles strongs DB, builds Vite SPA, bundles server.cjs)
ENV NODE_ENV=production
RUN npm run build

# Expose default HTTP/WebSocket port
ENV PORT=3000
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
