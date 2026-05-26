---
name: ExamEdge build decisions
description: Key non-obvious decisions and sharp edges for the ExamEdge AI exam platform
---

## Auth
- JWT access tokens (15m) + refresh tokens (7d) stored in `localStorage` (not cookies)
- Token getter wired via `setAuthTokenGetter` in `custom-fetch.ts` — imported from `@workspace/api-client-react` directly, NOT from a relative path
- Admin role is set by manually updating `users.role = 'ADMIN'` in DB (registration always creates STUDENT)

**Why:** Standard web JWT pattern; allows stateless API calls from the Vite frontend.

## API server rebuild requirement
- The API server runs from compiled `dist/`. After editing ANY route file, you MUST run `pnpm --filter @workspace/api-server run build` and restart the workflow before testing.
- The old build ran successfully (health check worked) but missing routes returned 404 until rebuilt.

**Why:** esbuild bundles at build time; the dev workflow runs `build && start`, not `ts-node`.

## Papers — URL-only upload
- No Cloudinary SDK or file upload integrated. Admin pastes a URL (Cloudinary, Google Drive, etc.) into the "File URL" field when creating a paper.

**Why:** Project brief explicitly excluded file uploads — "just URL input for papers."

## Frontend TS type patterns
- Use `active: true` (boolean), `published: true` (boolean) in API params, NOT string `"true"` — the generated Zod schemas type these as `boolean | undefined`
- Use `(obj as unknown as { field?: Type })` pattern when casting API response types that have no index signature

## Demo accounts
- Admin: `admin@examedge.com` / `admin123` (role manually set to ADMIN in DB)
- Student: `student@examedge.com` / `student123`
