# ==============================================================================
# Multi-Stage Production Dockerfile for AI Teacher Documentation Management Portal
# Builds frontend, packages backend, and bundles into a single hardened container.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Single Page Application
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Install Backend Dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

# ------------------------------------------------------------------------------
# Stage 3: Lightweight Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000 \
    TIMEZONE=Asia/Kolkata

# Install fontconfig and curl for container health check
RUN apk add --no-cache curl fontconfig ttf-dejavu

# Copy backend dependencies and source code
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Copy built frontend assets so Express can serve the web app directly
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure upload directory exists
RUN mkdir -p ./backend/uploads ./uploads

EXPOSE 5000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

WORKDIR /app/backend
CMD ["node", "src/server.js"]
