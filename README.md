# WheelWise (Vehiql)

An AI-assisted car marketplace built with Next.js. Browse and search cars (including AI image search), book test drives, save favorites, and manage listings through an admin portal with AI-assisted car detail extraction from photos.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Clerk](https://clerk.com/) for authentication
- [Supabase Storage](https://supabase.com/) for car images
- [Google Gemini](https://ai.google.dev/) for AI image-to-car-detail extraction and AI image search
- [Arcjet](https://arcjet.com/) for bot detection and rate limiting
- shadcn/ui, Radix, and Tailwind CSS for UI

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL connection strings for Prisma.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from your [Clerk](https://dashboard.clerk.com) application.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your [Supabase](https://supabase.com) project (used for image storage in a `car-images` bucket).
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/).
- `ARCJET_KEY` — from [Arcjet](https://arcjet.com).

### 3. Set up the database

```bash
npx prisma migrate deploy
```

### 4. Run the dev server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — start the production server
- `npm run lint` — run ESLint
- `npm test` — run the unit test suite once
- `npm run test:watch` — run the unit test suite in watch mode

## Testing

Unit tests (Vitest) cover `lib/` and `actions/`, mocking Prisma, Clerk, Supabase, and Arcjet — no real database or external services are required to run them. Test files live next to the code they cover (`*.test.js`).

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: lint, unit tests, `prisma validate`, and a production build (all against placeholder env vars — no real database or third-party credentials are used in CI).

## Project structure

- `app/` — Next.js App Router routes, split into `(main)` (public site), `(admin)` (admin portal, requires an `ADMIN` user role), and `(auth)` (Clerk sign-in/sign-up)
- `actions/` — server actions for data mutations and queries
- `components/` — shared React components, including `components/ui` (shadcn/ui primitives)
- `lib/` — shared utilities (Prisma client, Supabase client, Arcjet config, helpers)
- `prisma/` — database schema and migrations

## Admin access

New users are created with the `USER` role by default. To access `/admin`, promote a user to `ADMIN` directly in the database (via `prisma studio` or SQL), then have them sign in.
