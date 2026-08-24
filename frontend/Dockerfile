# frontend/Dockerfile
# Multi-stage production container for DDAS React/Vite Frontend

# Stage 1: Build static distribution
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build-time API URL argument
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:8000}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve via High-Performance NGINX Alpine
FROM nginx:alpine AS runtime

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
