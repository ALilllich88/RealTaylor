# ---- Build stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install system deps for Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Copy package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY prisma ./prisma/
COPY shared ./shared/

# Install all deps (reproducible install)
RUN npm ci --workspaces

# Generate Prisma client (into node_modules — preserved through prune)
RUN npx prisma generate

# Copy source
COPY . .

# Build client and server
RUN npm run build --workspace=client
RUN npm run build --workspace=server

# Prune dev deps in-place — keeps generated Prisma client and engine binaries
RUN npm prune --workspaces --omit=dev

# ---- Production stage ----
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Copy package files (needed for Node module resolution)
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY prisma ./prisma/
COPY shared ./shared/

# Copy pruned node_modules from builder (includes generated Prisma client + engine)
COPY --from=builder /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Copy startup script
COPY startup.sh ./startup.sh

EXPOSE 3000

# Push schema then start server
CMD ["sh", "startup.sh"]
