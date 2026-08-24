#!/bin/sh
set -e

echo "=========================================================="
echo "⚡ STARTING DDAS ENTERPRISE API GATEWAY CONTAINER"
echo "=========================================================="

echo "Waiting for PostgreSQL database to be reachable..."
until python -c "
import os, sys, psycopg2
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    conn.close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; do
  echo "  -> Database unavailable, retrying in 2 seconds..."
  sleep 2
done
echo "✓ PostgreSQL connection established."

echo "Applying latest database migrations via Alembic..."
alembic upgrade head
echo "✓ Database schema synchronized."

PORT="${PORT:-8000}"
WORKERS="${UVICORN_WORKERS:-${WEB_CONCURRENCY:-1}}"

echo "Starting Uvicorn ASGI Server on port ${PORT} with ${WORKERS} worker(s)..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT}" --workers "${WORKERS}"
