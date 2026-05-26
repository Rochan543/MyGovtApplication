# ExamEdge — AI Exam Platform

A full-stack competitive exam preparation platform (like Testbook/Oliveboard) for SSC, RRB, Banking, UPSC, State PSC exams.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/exam-platform run dev` — run the frontend Vite dev server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS v4, Recharts
- API: Express 5 with Pino logging
- DB: PostgreSQL + Drizzle ORM (12 tables)
- Auth: JWT (access 15m + refresh 7d) stored in localStorage, Bearer tokens
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/` — all API routes (auth, exams, questions, attempts, results, etc.)
- `artifacts/api-server/src/lib/auth.ts` — JWT helpers (generateAccessToken, generateRefreshToken, hashPassword, comparePassword)
- `artifacts/api-server/src/middlewares/authenticate.ts` — JWT auth middleware
- `artifacts/exam-platform/src/` — React frontend
- `artifacts/exam-platform/src/pages/` — all page components (student + admin)
- `artifacts/exam-platform/src/contexts/AuthContext.tsx` — auth state, login/register/logout
- `artifacts/exam-platform/src/components/Layout.tsx` — sidebar layout + PageHeader
- `lib/api-client-react/src/generated/` — auto-generated hooks and Zod schemas (never edit manually)
- `lib/db/src/schema.ts` — canonical DB schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI 3.0 spec (source of truth for API contract)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → React Query hooks. Frontend never writes raw fetch calls.
- JWT stored in localStorage (not cookies), Bearer token attached via `setAuthTokenGetter` in the custom fetch layer.
- Papers use URL input only (no file upload); admin pastes a Cloudinary or direct URL.
- Anti-cheat: fullscreen enforcement + tab-switch detection in exam engine; 2 violations = auto-submit.
- Admin routes are protected with `adminOnly` flag in `ProtectedRoute`, which checks `user.role === "ADMIN"`.

## Product

- **Students**: browse/take exams, quizzes, topic mocks; download PYQ papers; view results with answer review + leaderboard; anti-cheat exam engine with timer and question palette.
- **Admin**: manage exams, questions, subjects/topics, sections, quizzes, topic mocks, papers, users; view analytics dashboard with charts.

## Demo credentials

- **Admin**: `admin@examedge.com` / `admin123`
- **Student**: `student@examedge.com` / `student123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing API routes, rebuild the API server (`pnpm --filter @workspace/api-server run build`) and restart the workflow — it runs from the compiled `dist/`.
- After editing the OpenAPI spec, run codegen before typechecking frontend.
- `pnpm --filter @workspace/db run push` must be run whenever the DB schema changes.
- Do not use `pnpm dev` at workspace root — workflows handle this with proper env vars.
- Typecheck with `pnpm --filter @workspace/exam-platform run typecheck`, not `build` (build needs PORT/BASE_PATH).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
