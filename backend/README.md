# Backend (Node + TS + Express + Prisma)

## Quick start
1. `cd backend`
2. `npm install`
3. Copy env: `copy .env.example .env` (Windows) or `cp .env.example .env`
4. Start PostgreSQL and make sure `DATABASE_URL` is valid
5. `npx prisma migrate dev --name init`
6. `npm run seed`
7. `npm run dev`

API base: `http://localhost:4000/api`

## User-scoped data
- All `assets` and `scenes` are scoped by current user.
- Backend resolves current user from headers:
  - `x-user-id` (required logically, fallback: `guest`)
  - `x-user-name` (optional, fallback: `Guest`)
- Each request will upsert user by `externalId = x-user-id`.

## Test login
- Seed creates default user: `admin/admin`
- Login endpoint: `POST /api/auth/login`
  - body: `{ "username": "admin", "password": "admin" }`

### Main endpoints
- `POST /api/assets/upload` (multipart field: `file`)
- `GET /api/assets`
- `GET /api/scenes`
- `GET /api/scenes/:id`
- `POST /api/scenes`
- `PUT /api/scenes/:id`
- `DELETE /api/scenes/:id`
