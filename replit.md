# StudyLoop

StudyLoop is a student learning and productivity app that turns a busy semester into clear next steps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/studyloop/src/App.tsx` — landing page, dashboard, planner, assistant, notes, and focus room
- `artifacts/studyloop/src/index.css` — StudyLoop visual theme, typography, texture, and motion
- `artifacts/api-server/src/routes/studyloop.ts` — dashboard, task, notes, AI, and focus-session routes
- `lib/api-spec/openapi.yaml` — source of truth for the generated API client and validation schemas
- `lib/db/src/schema/` — Drizzle tables for tasks, notes, and study sessions

## Architecture decisions

- The first release is a polished single-student experience without authentication so the hackathon flow stays immediate.
- AI routes use the server-side `OPENAI_API_KEY` and do not ship hardcoded study-answer fallbacks. If AI is unavailable or returns incomplete data, the API reports an actionable error instead of fabricating content.
- Calendar-like deadlines are intentionally represented as display strings in this demo; real calendar syncing is deferred.

## Product

Students can review their day, complete tasks, generate an AI study plan, ask for simple explanations and practice questions, save notes with AI summaries, and record focus sessions with a Pomodoro timer.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
