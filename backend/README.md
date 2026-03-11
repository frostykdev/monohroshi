# Monohroshi Backend

Express + TypeScript backend with modular architecture, Prisma ORM, and Firebase token authentication.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally or remotely
- Firebase service account credentials

## Setup

1. Copy env template:
   - `cp .env.example .env`
2. Fill in:
   - `DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migrations:
   - `npm run prisma:migrate:dev`

## Scripts

- `npm run dev` - start dev server with watch mode
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - run compiled server
- `npm run typecheck` - validate TypeScript types
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate:dev` - create/apply local migration
- `npm run prisma:migrate:deploy` - apply migrations in CI/prod

## API Endpoints

- `GET /` - service status
- `GET /v1/health` - health check
- `GET /v1/me` - protected route, requires `Authorization: Bearer <firebase_id_token>`

## Token Verification

`checkAuthenticated` middleware validates Firebase ID token via Firebase Admin `verifyIdToken` and attaches decoded token to `req.user`.
