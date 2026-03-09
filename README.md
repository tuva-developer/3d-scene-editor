# 3DSceneEditor Monorepo

This repository now contains:

- `frontend/`: React + Vite + TypeScript app (existing scene editor UI)
- `backend/`: Node.js + TypeScript + Express + Prisma API scaffold

## Run frontend
```bash
npm --prefix frontend install
npm run dev:frontend
```

## Run backend
```bash
npm --prefix backend install
copy backend\.env.example backend\.env
npm run prisma:generate
npm run prisma:migrate
npm run dev:backend
```

Backend default URL: `http://localhost:4000`
Frontend default URL: `http://localhost:5173`

## Next integration step
Wire frontend save/load scene flow to backend APIs:
- Upload files to `POST /api/assets/upload`
- Save scene JSON to `POST /api/scenes` / `PUT /api/scenes/:id`
- Load scene JSON from `GET /api/scenes/:id`

## Deploy backend with Docker (frontend runs on IIS)

### 1) Prepare environment
```bash
copy backend\.env.docker backend\.env.docker.bak
```
Edit `backend/.env.docker` if you need to change database credentials, CORS, or file service URLs.

### 2) Start backend container
```bash
docker compose up -d --build
```

Default Docker published ports (to avoid conflict with local dev):
- Backend: `4001` (container `4000`)

### 3) Verify
```bash
docker compose ps
curl http://localhost:4001/health
```
Access from LAN:
- Backend: `http://<YOUR_LAN_IP>:4001`

You can still run local dev at the same time:
- Frontend dev: `http://localhost:5173`
- Backend dev: `http://localhost:4000`

### 4) Seed initial user (optional)
```bash
docker compose exec backend npm run seed
```

### 5) Stop services
```bash
docker compose down
```
