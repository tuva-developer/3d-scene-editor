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
