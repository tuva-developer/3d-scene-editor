#!/bin/sh
set -e

echo "[backend] running prisma migrate deploy..."
npx prisma migrate deploy

echo "[backend] starting server..."
exec node dist/server.js
