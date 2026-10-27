# Multi-stage Dockerfile for Shared Self-Attendance Tracker
# Stage 1: Build client and server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN cd server && npm install
RUN cd client && npm install

# Copy source codes
COPY server ./server
COPY client ./client

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy root manifest and server dependencies
COPY package.json ./
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/db/schema.sql ./server/src/db/schema.sql
COPY --from=builder /app/client/dist ./client/dist

# Expose port and declare persistent volume for SQLite
EXPOSE 5000
VOLUME [ "/app/server/data" ]

WORKDIR /app/server
CMD ["node", "dist/index.js"]
