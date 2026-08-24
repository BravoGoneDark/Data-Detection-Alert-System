# backend/Dockerfile
# Multi-stage production container for DDAS FastAPI Gateway

# Stage 1: Build & Dependencies
FROM python:3.13-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime Minimal Image
FROM python:3.13-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Create non-root application user for production security hardening
RUN groupadd -g 1000 ddasgroup && \
    useradd -u 1000 -g ddasgroup -s /bin/bash -m ddasuser

# Copy application source code
COPY . .

# Create and set permissions on persistent CAS directory and entrypoint
RUN mkdir -p /app/storage/cas && \
    dos2unix /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    chown -R ddasuser:ddasgroup /app

USER ddasuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
