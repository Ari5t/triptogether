# TripTogether — CLAUDE.md

Web app where a group of friends plans a trip together: day-by-day itinerary (real-time collaborative), map, shared budget, polls and chat. Portfolio project; priority is solid real-time engineering with a moderate amount of code.

## Source of truth

- `docs/SPEC.md` — product scope, architecture, data model (Prisma), REST/Socket.IO API, Yjs design, auth/roles, phases, risks.
- `docs/design/DESIGN.md` — UI tokens, typography, components (§6), screens (§7), seed data (§7.8), a11y (§9), implementation notes (§10), design gaps (§11).
- `docs/design/*@1x.png` — screen and design-system boards (Landing, My Trips, Trip route/budget/discussion, Invitation, Mobile route/map, DS 01–04).
- `apps/web/app/globals.css` — Tailwind 4 design tokens (CSS-first; no `tailwind.config.ts`; shadcn names alias the design tokens). Fonts: local variable TTFs in `apps/web/app/fonts/`, loaded by `app/fonts.ts` (`next/font/local`).

Read the relevant section before building a feature. If SPEC and DESIGN disagree, or something is not defined (`—` / §11 in DESIGN.md), ask the user instead of guessing.

## Stack

- Monorepo: pnpm + Turborepo. `apps/web` (Next.js App Router, React, TS, Vercel), `apps/api` (NestJS), `apps/collab` (Hocuspocus/Yjs), `packages/shared` (zod schemas, event types, role constants), `packages/db` (Prisma schema, migrations, seed), `packages/config` (eslint, tsconfig, tailwind preset). `docker-compose.yml` = Postgres + Redis for local dev.
- UI: Tailwind CSS 4.3, shadcn/ui, lucide-react, dnd-kit. Client data: TanStack Query, Zustand, socket.io-client. Forms: react-hook-form + zod. i18n: next-intl. Map: maplibre-gl via react-map-gl. Editing: yjs, @hocuspocus/provider, Tiptap (Collaboration / CollaborationCursor).
- Backend: NestJS, Passport Google OAuth, @nestjs/websockets + Socket.IO (Redis adapter), Prisma, PostgreSQL (Neon), Redis (Upstash).
- External: Google OAuth, Geoapify (place search, cached in `Place`), MapTiler (tiles).
- Tests: Vitest, Playwright. Deploy: web on Vercel; api and collab on Railway/Fly.io.

## Key decisions (do not change without asking)

- Google OAuth only. Invite-only trips, no guest mode. One currency per trip. uk/en only (default `uk`). Responsive web, no PWA/native.
- MVP modules: itinerary, map, budget, discussion (polls + chat). Out of scope: multi-currency, bookings, ticket import, offline, push, PDF/calendar export, public trips, AI suggestions.
- Roles: OWNER / EDITOR / VIEWER. Enforce with one `TripRoleGuard` + `@TripRole('editor')`; reuse the same service in the Socket.IO gateway and Hocuspocus `onAuthenticate`.
- Session is owned by NestJS: httpOnly access JWT (15 min) + rotating refresh token (30 d, hash in DB). Web and api share a parent domain (`Domain=.example.com`, `SameSite=Lax`, `Secure`).
- Invite tokens: random 32 bytes, store only SHA-256 hash, 7-day expiry, revocable, optional `maxUses`.

## Architecture rules

- **Itinerary = Yjs.** One doc per trip (`trip:{tripId}`). `TripDoc.state` is the truth; `Day` / `ItineraryItem` tables are a snapshot fully rebuilt on each `onStoreDocument` (debounce ~2 s) in a Prisma transaction. Map may read coordinates straight from Yjs.
- **Everything else = REST + Socket.IO.** Client writes via REST; after success the server emits to room `trip:{tripId}`. Chat, polls, budget are never written through Yjs (need server validation).
- Changing trip dates must update `days` in the Yjs doc (API → collab via `openDirectConnection`). Removing a member must `closeConnections`.
- Money: integer minor units only, never floats. Equal split: remainder goes to the first participants so `sum(ExpenseSplit) == amountMinor`. Settlements via greedy debtor/creditor matching; unit-test rounding.
- API returns error codes (e.g. `TRIP_NOT_FOUND`), never user-facing text; frontend translates.
- Request/event schemas live in `packages/shared` (zod) and are imported by both web and api.
- REST prefix `/api/v1`; Socket.IO namespace `/trips`. Full endpoint/event tables are in SPEC §5.
- i18n: `messages/uk.json` and `messages/en.json` must have identical keys (CI check). Dates/amounts/plurals via `Intl` / ICU.

## Design system rules (from DESIGN.md)

- Field-notebook look: warm canvas `#FAFAF7`, white surfaces, **1 px borders instead of shadows** (shadows only on menus, popovers, toasts, modals, dragged stop). No gradients, no glassmorphism, no emoji as icons, no icon next to headings.
- Green (`primary-600 #2C6248`) only for primary actions, active/selected states, focus ring, logo, links. Never for page backgrounds, headings, body text, or success status (use `success`).
- People = circles (avatars, presence dots, cursors). Days = rounded squares with a number (day markers, map pins).
- Only use tokens from `globals.css` (default Tailwind palette is removed). Spacing on the 4 px scale. Radii: sm 6, md 8, lg 12, xl 16, full.
- Fonts: Manrope 700 for headings, Inter for UI, JetBrains Mono 500 + `tabular-nums` for money/codes/invite links. Currency `₴` after the number; true minus `−`; 24-hour time.
- Icons: lucide-react, `strokeWidth={1.5}` (logo `Route` 1.75), sizes 16/20. Icon-only buttons need `aria-label`; decorative icons `aria-hidden`.
- Size layouts for Ukrainian first (15–25 % longer than English); never truncate mid-word.
- Dark mode: `.dark` class on `<html>` via `next-themes` (`defaultTheme="system"`).
- Breakpoints: `md` 768 (bottom nav below), `lg` 1024 (list + map split), `2xl` 1440. Mobile touch targets ≥ 44 px.
- A11y: real `<button>/<a>/<input>/<table>/<ol>`, focus-visible outline, AA contrast, colour never the only signal (cursors carry name labels, edited stops carry "{Name} редагує" tag).
- shadcn primitives in `components/ui/*`; domain components in `components/trip/*`; marketing in `components/marketing/*`; Intl helpers in `lib/format.ts`.

## Open points

1. DESIGN.md §7.0 screenshot names do not match actual files in `docs/design/` (e.g. `Landing@1x.png`).
2. `Message.itemId` has no relation to `ItineraryItem`; items are rebuilt from Yjs snapshots, so comment-to-stop links must tolerate rebuilt/removed items.
3. Dark mode: no screens designed, many dark values are derived (marked "export" in DESIGN.md).
4. SPEC says "organizer"; data model uses `OWNER`.
5. Resolved: Tailwind config dropped, token names reconciled, local fonts, MapTiler chosen for tiles.

## Conventions for working here

- TypeScript everywhere, strict. Share types through `packages/shared`; no duplicated DTOs.
- Validate at every trust boundary (zod on REST bodies and socket events; role check on every route/event/Yjs connection).
- Build in the phase order from SPEC §9: Foundation → Yjs itinerary (no Tiptap notes until drag-and-drop is stable) → Map/places → Chat/polls → Budget → Polish. Each phase ends with a working deploy.
- Seed data: demo trip "Карпати + Львів" with the participants, stops, expenses, poll and chat from DESIGN.md §7.8.
- Language: the user may write in Ukrainian; **always answer in English** unless the user explicitly asks otherwise. UI copy default is Ukrainian (copy is in DESIGN.md §7).
- Ask before: adding dependencies not listed above, changing a key decision, or filling a gap listed in DESIGN.md §11.
- Tests: Vitest for unit (money/rounding, settlements, guards), Playwright e2e for "create trip → invite → add stop".

## Commands

Node 24, pnpm 12 (`corepack enable pnpm`). Postgres + Redis via `docker compose up -d` (Docker not installed on the dev machine yet). Copy `.env.example` to `.env`.

```bash
pnpm install
pnpm build        # turbo: shared, db (prisma generate), api, web
pnpm typecheck
pnpm test         # vitest: shared, api (swc plugin for decorator metadata)
pnpm --filter @triptogether/e2e e2e   # Playwright; needs `playwright install chromium` and DB triptogether_e2e (create once); starts its own API :4100 and web :3100
pnpm db:migrate   # prisma migrate dev (no migration committed yet)
pnpm db:seed      # demo trip "Карпати + Львів"
pnpm --filter @triptogether/api dev   # API on :4000, prefix /api/v1
pnpm --filter @triptogether/collab dev # Hocuspocus on :4200 (WebSocket + internal HTTP for the API)
pnpm --filter @triptogether/web dev   # web on :3000, /api/v1 rewritten to the API
```

## Layout notes

- `packages/doc` holds all Yjs document logic (`syncDays`, `addItem`, `moveItem`, `readDays`); web and collab both import it. Never mutate the doc elsewhere.
- Collab: token from `POST /collab/token` proves identity only; role is re-read from the DB on connect. API calls `POST /internal/trips/:id/sync-days|close` on collab (header `x-internal-secret`), best effort, because collab re-syncs days from trip dates on every doc load.
- Map: `trip-map.tsx` (react-map-gl + maplibre-gl 6) reads coordinates straight from the Yjs doc. maplibre's worker is served statically from `apps/web/public/maplibre` (copied by `scripts/copy-maplibre.mjs` before dev/build, gitignored) because the bundler breaks its worker URL. Without `NEXT_PUBLIC_MAPTILER_KEY` the map is a plain land-coloured canvas; pins and routes still work. Place search: browser → `GET /api/v1/places/search` → Geoapify (needs `GEOAPIFY_API_KEY`, results upserted into `Place`).
- `apps/api` and the `packages/*` are ESM (`NodeNext`, `.js` import suffixes). `apps/api` needs `isolatedModules: false` for decorator metadata.
- Prisma 7: generated client in `packages/db/src/generated` (gitignored), driver adapter `@prisma/adapter-pg`, config in `packages/db/prisma.config.ts`. `createPrisma()` is the only client factory.
- Web: `proxy.ts` (Next 16 middleware) handles next-intl and redirects unauthenticated users from `/trips` and `/invite` to the sign-in page with `?next=`.
- Phase 1 status: auth (Google, cookies, refresh rotation), trips CRUD, members/roles, invites, TripRoleGuard, landing, trips list, invite accept page. Also done: create-trip form, invite dialog, init migration, e2e (create trip → invite → join) using a test-only `POST /auth/e2e-login` that exists only when `E2E=true` and NODE_ENV is not production. Phase 2 so far: itinerary on Yjs (days from dates, add/edit/delete/drag stops incl. keyboard drag, live sync, presence avatars, "X is editing" tag, SQL snapshot). Phase 3: map with numbered day-coloured pins, dashed routes, day legend filter, zoom, place search in the add-stop field, list<->map selection. Phase 5: budget (expenses CRUD, equal/exact split, balances, settlements; money logic in `packages/shared/src/money.ts`, all integer minor units, tested against the design's seed numbers). Not built: "mark as paid" for settlements, live Socket.IO updates of expenses (page refreshes after your own changes only), category-per-trip customisation. Not yet: Tiptap notes and live cursors, shadcn components, deploy, Yjs day sync on date change, closing connections on member removal.
