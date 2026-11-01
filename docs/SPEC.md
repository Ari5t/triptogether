# TripTogether — MVP Specification and Architecture

> Working name. Last updated: 2026-11-02.

## 1. Overview and key decisions

TripTogether is a web app where a group of friends plans a trip together: a day-by-day itinerary, places on a map, shared expenses, polls and chat. It is a portfolio side project, so the priority is strong real-time engineering at a moderate amount of code.

| Question | Decision |
| --- | --- |
| Frontend | Next.js (App Router) + React + TypeScript |
| Backend | NestJS (TypeScript), separate service |
| Real-time | Yjs (CRDT) for the itinerary; Socket.IO events for chat, polls, budget |
| Authentication | Google OAuth only |
| Access | Invite-only, no guest mode |
| Budget | One currency per trip |
| Languages | Ukrainian and English (uk/en) |
| Devices | Responsive web, no PWA or native app |

## 2. MVP scope and user stories

The MVP has four modules inside a trip: itinerary, map, budget, discussion. Everything else is deferred.

### Trips and members

- As a user, I sign in with Google and see a list of my trips.
- As an organizer, I create a trip: title, destination, dates, cover image.
- As an organizer, I generate an invite link and see who joined.
- As an organizer, I change member roles (editor / viewer) or remove members.

### Day-by-day itinerary (collaborative editing)

- As a member, I see the trip days generated from the trip dates.
- As an editor, I add, drag between days, and delete itinerary stops.
- As an editor, I write notes for a day or a stop at the same time as others.
- As a member, I see who is online and what they are editing (avatars, cursors).

### Map and places

- As an editor, I search for a place by name and add it to a specific day.
- As a member, I see all stops on the map, filterable by day.

### Budget

- As a member, I add an expense: amount, who paid, who it is split between (equally or manually).
- As a member, I see balances and a minimal list of transfers: who owes whom.

### Polls and chat

- As a member, I create a poll with options (city, hotel, date) and vote.
- As a member, I write in the trip chat and comment on a specific itinerary stop.

### Out of scope for the MVP

Multi-currency, bookings, ticket import, offline mode, push notifications, export to PDF/calendar, public trips, AI route suggestions.

## 3. Architecture and stack

Three applications in one monorepo: the Next.js frontend, the NestJS API, and a separate Yjs service for collaborative itinerary editing. All are TypeScript and share types.

```
Browser (apps/web — Next.js, Vercel)
   │  REST + Socket.IO                       │  WebSocket (Yjs)
   ▼                                         ▼
apps/api — NestJS                       apps/collab — Hocuspocus
 auth, roles, budget, chat, polls        Yjs doc: itinerary + notes
 Prisma, zod from packages/shared        awareness (cursors, presence)
   │            │                         snapshot into Day / Item tables
   ▼            ▼                              │
 Redis       PostgreSQL (Neon) ◄───────────────┘
 (Socket.IO adapter, presence)

External: Google OAuth, Geoapify (place search), MapTiler (map tiles)
```

The browser talks to the API (REST + Socket.IO) and to the collab service (Yjs over WebSocket). Both write to the same Postgres database.

### Repository structure

```
triptogether/
├─ apps/
│  ├─ web/        Next.js: app/[locale]/(auth)/, app/[locale]/trips/[id]/...
│  ├─ api/        NestJS: auth, trips, invites, places, expenses, polls, chat
│  └─ collab/     Hocuspocus + Prisma
├─ packages/
│  ├─ shared/     zod schemas, event types, role constants
│  ├─ db/         Prisma schema, migrations, seed
│  └─ config/     eslint, tsconfig, tailwind preset
├─ docker-compose.yml   Postgres + Redis for local development
└─ turbo.json
```

### Key libraries

| Layer | Libraries |
| --- | --- |
| UI | Tailwind CSS, shadcn/ui, lucide-react, dnd-kit |
| Client data | TanStack Query (REST), Zustand (local UI state), socket.io-client |
| Collaborative editing | yjs, @hocuspocus/provider, Tiptap with Collaboration / CollaborationCursor |
| Map | maplibre-gl via react-map-gl |
| Forms | react-hook-form + zod |
| i18n | next-intl |
| Backend | NestJS, Passport (Google), @nestjs/websockets + Socket.IO, Prisma |
| Tests | Vitest, Playwright |

## 4. Data model (Prisma)

The source of truth for the itinerary is the Yjs document (`TripDoc.state`). The `Day` and `ItineraryItem` tables are a snapshot of it, rebuilt by the collab server on every store, so the map, search and API can read plain SQL. All other entities live only in relational tables.

```prisma
enum TripRole { OWNER EDITOR VIEWER }
enum SplitType { EQUAL EXACT }

model User {
  id        String   @id @default(cuid())
  googleId  String   @unique
  email     String   @unique
  name      String
  avatarUrl String?
  locale    String   @default("uk")
  createdAt DateTime @default(now())
  members   TripMember[]
}

model Trip {
  id          String   @id @default(cuid())
  title       String
  destination String?
  startDate   DateTime @db.Date
  endDate     DateTime @db.Date
  currency    String   @default("UAH") // ISO 4217, one per trip
  coverUrl    String?
  createdById String
  createdAt   DateTime @default(now())
  members     TripMember[]
  invites     Invite[]
  doc         TripDoc?
  days        Day[]
  expenses    Expense[]
  polls       Poll[]
  messages    Message[]
}

model TripMember {
  tripId   String
  userId   String
  role     TripRole @default(EDITOR)
  joinedAt DateTime @default(now())
  trip     Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user     User @relation(fields: [userId], references: [id])
  @@id([tripId, userId])
}

model Invite {
  id        String    @id @default(cuid())
  tripId    String
  tokenHash String    @unique   // store a hash, never the raw token
  role      TripRole  @default(EDITOR)
  expiresAt DateTime
  maxUses   Int?
  uses      Int       @default(0)
  revokedAt DateTime?
  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

model TripDoc {
  tripId    String   @id
  state     Bytes    // Yjs update (Y.encodeStateAsUpdate)
  updatedAt DateTime @updatedAt
  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

model Day {                      // snapshot from Yjs
  id     String @id             // id taken from the Yjs document
  tripId String
  date   DateTime @db.Date
  order  Int
  items  ItineraryItem[]
  trip   Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

model ItineraryItem {            // snapshot from Yjs
  id        String  @id
  dayId     String
  placeId   String?
  title     String
  startTime String?             // "09:30"
  order     Int
  day       Day    @relation(fields: [dayId], references: [id], onDelete: Cascade)
  place     Place? @relation(fields: [placeId], references: [id])
}

model Place {
  id         String @id @default(cuid())
  provider   String             // "geoapify"
  externalId String
  name       String
  address    String?
  lat        Float
  lng        Float
  category   String?
  items      ItineraryItem[]
  @@unique([provider, externalId])
}

model Expense {
  id          String    @id @default(cuid())
  tripId      String
  paidById    String
  title       String
  amountMinor Int                // minor units (cents), no floats
  splitType   SplitType
  spentAt     DateTime
  createdById String
  splits      ExpenseSplit[]
  trip        Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

model ExpenseSplit {
  expenseId   String
  userId      String
  amountMinor Int
  expense     Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  @@id([expenseId, userId])
}

model Poll {
  id          String    @id @default(cuid())
  tripId      String
  question    String
  multiChoice Boolean   @default(false)
  closesAt    DateTime?
  createdById String
  options     PollOption[]
  trip        Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

model PollOption {
  id     String @id @default(cuid())
  pollId String
  label  String
  votes  Vote[]
  poll   Poll @relation(fields: [pollId], references: [id], onDelete: Cascade)
}

model Vote {
  optionId String
  userId   String
  option   PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  @@id([optionId, userId])
}

model Message {
  id        String   @id @default(cuid())
  tripId    String
  authorId  String
  itemId    String?            // comment attached to an itinerary stop
  body      String
  createdAt DateTime @default(now())
  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  @@index([tripId, createdAt])
}
```

Amounts are stored in minor units (`Int`) to avoid rounding errors. For an equal split, the remainder of the minor units goes to the first participants, so the sum of `ExpenseSplit` always equals `amountMinor`.

## 5. REST API and WebSocket events

REST handles writes and initial loading; WebSocket only broadcasts changes to other members. The client writes via REST, and after a successful write the server emits an event to the room `trip:{tripId}`. This avoids duplicating validation logic.

### REST (prefix `/api/v1`, all requests authenticated with a JWT cookie)

| Method | Path | Purpose | Min. role |
| --- | --- | --- | --- |
| GET | `/auth/google` | Start OAuth | — |
| GET | `/auth/google/callback` | Issue session | — |
| POST | `/auth/refresh` | Refresh access token | — |
| POST | `/auth/logout` | Sign out | — |
| GET | `/me` | Profile, locale | user |
| GET | `/trips` | My trips | user |
| POST | `/trips` | Create a trip | user |
| GET | `/trips/:id` | Details + members | viewer |
| PATCH | `/trips/:id` | Change title, dates | owner |
| DELETE | `/trips/:id` | Delete | owner |
| POST | `/trips/:id/invites` | Create invite link | owner |
| DELETE | `/trips/:id/invites/:inviteId` | Revoke | owner |
| GET | `/invites/:token` | Invite preview | user |
| POST | `/invites/:token/accept` | Join the trip | user |
| PATCH | `/trips/:id/members/:userId` | Change role | owner |
| DELETE | `/trips/:id/members/:userId` | Remove member | owner |
| GET | `/places/search?q=&lat=&lng=` | Place search (proxy) | viewer |
| GET | `/trips/:id/expenses` | List expenses | viewer |
| POST | `/trips/:id/expenses` | Add expense | editor |
| PATCH / DELETE | `/trips/:id/expenses/:expId` | Update / delete | editor |
| GET | `/trips/:id/balances` | Balances and settlements | viewer |
| GET / POST | `/trips/:id/polls` | List / create | viewer / editor |
| POST | `/polls/:pollId/vote` | Vote | viewer |
| GET | `/trips/:id/messages?cursor=` | Chat history | viewer |
| POST | `/trips/:id/messages` | New message | viewer |
| POST | `/collab/token` | Short-lived token for Hocuspocus | viewer |

### Socket.IO (namespace `/trips`)

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `trip:join` | `{ tripId }` (membership check) |
| client → server | `trip:leave` | `{ tripId }` |
| client → server | `chat:typing` | `{ tripId }` |
| server → client | `member:joined` / `member:left` | `{ member }` |
| server → client | `presence:update` | `{ online: userId[] }` |
| server → client | `chat:message` | `{ message }` |
| server → client | `chat:typing` | `{ userId }` |
| server → client | `poll:created` / `poll:updated` | `{ poll }` with vote counts |
| server → client | `expense:changed` | `{ expense, op }` + updated balances |
| server → client | `trip:updated` | `{ trip }` |

Shared zod schemas for request bodies and events live in `packages/shared`, so frontend and backend never drift apart in types.

## 6. Real-time collaboration with Yjs

One Yjs document per trip, named `trip:{tripId}`, served by a separate `apps/collab` service built on Hocuspocus. The CRDT resolves conflicts automatically, so two members can drag stops and edit the same note at the same time.

### Document structure

```ts
// Y.Doc
days:  Y.Array<Y.Map>          // day order
  day: { id, date, note: Y.XmlFragment, items: Y.Array<Y.Map> }
    item: { id, title, placeId?, lat?, lng?, startTime?, note: Y.XmlFragment }
```

- Stop order = position in the `Y.Array`; moving a stop between days = delete + insert in one transaction.
- Notes are a `Y.XmlFragment` edited with Tiptap (`Collaboration` and `CollaborationCursor` extensions).
- Presence (who is online, color, selection) uses the Awareness API and is not persisted.

### Server lifecycle (Hocuspocus hooks)

1. `onAuthenticate`: verify the short-lived JWT from `/collab/token`, look up the role; viewers get `readOnly`.
2. `onLoadDocument`: read `TripDoc.state`; if empty, create days from the trip dates.
3. `onStoreDocument` (debounce ~2 s): persist the binary state and rebuild the `Day` / `ItineraryItem` snapshot in a Prisma transaction.
4. Scaling: `@hocuspocus/extension-redis` allows multiple instances; one instance is enough for the MVP.

### What does NOT go through Yjs

Chat, polls and budget need strict server-side validation (who voted, amounts must add up), so NestJS writes them and Socket.IO only broadcasts the result.

### Known gotchas

- Changing trip dates on the server must update `days` in the Yjs doc: the API calls the collab service through Hocuspocus `openDirectConnection`.
- Removing a member must close their active connections (`closeConnections`).

## 7. Authentication, invites, roles

Sign-in is Google only. The session is owned by NestJS, not Next.js, so a single token works for REST, Socket.IO and Hocuspocus.

### Sign-in flow

1. The "Sign in with Google" button goes to `api/auth/google` (Passport `passport-google-oauth20`).
2. The callback finds or creates a `User` by `googleId`.
3. The API sets two httpOnly cookies: an access JWT (15 min) and a refresh token (30 days, rotated, hash stored in the DB).
4. Next.js middleware checks for the cookie on protected pages; user data comes from `/me`.

To share cookies, web and api must be on the same parent domain: `app.example.com` and `api.example.com` with `Domain=.example.com`, `SameSite=Lax`, `Secure`.

### Invites

1. The owner creates a link: a random 32-byte token; only its SHA-256 hash is stored; expires in 7 days.
2. The recipient opens `/invite/{token}`; if not signed in, they go through Google first and return to this page.
3. `accept` adds a `TripMember` with the role from the invite and emits `member:joined`.
4. The owner can revoke the link or limit the number of uses.

### Roles

| Action | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| View everything | yes | yes | yes |
| Edit itinerary | yes | yes | no |
| Add expenses | yes | yes | no |
| Vote and chat | yes | yes | yes |
| Create polls | yes | yes | no |
| Invites and roles | yes | no | no |
| Delete the trip | yes | no | no |

Authorization is a single `TripRoleGuard` with a `@TripRole('editor')` decorator; the same service is used by the Socket.IO gateway and Hocuspocus.

## 8. i18n, responsiveness, deployment

### i18n (uk/en)

- `next-intl` with routes `/uk/...` and `/en/...`; default locale is `uk`; the choice is stored in `User.locale`.
- Messages in `messages/uk.json` and `messages/en.json` with identical keys; CI fails on missing keys.
- Dates, amounts and plurals via `Intl` (`DateTimeFormat`, `NumberFormat` with the trip currency, ICU plurals).
- The backend returns error codes (`TRIP_NOT_FOUND`), not texts; the frontend translates them.

### Responsive web

- Mobile-first with Tailwind; breakpoints `md` (768 px) and `lg` (1024 px).
- Desktop: itinerary on the left, map on the right, chat in a side panel.
- Mobile: bottom navigation with tabs Itinerary / Map / Budget / Chat; the map takes the full screen.
- Drag and drop via `dnd-kit` with touch sensors enabled.

### Deployment (free or cheap tiers)

| Component | Where | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Preview deploy for every PR |
| `apps/api` | Railway or Fly.io | Docker image, WebSockets supported |
| `apps/collab` | Railway or Fly.io | Separate service, long-lived connections |
| PostgreSQL | Neon | DB branches for previews |
| Redis | Upstash | Socket.IO adapter, presence |
| Map tiles | MapTiler | Free tier |
| Place search | Geoapify | Free tier, cached in `Place` |

CI on GitHub Actions: lint, typecheck, unit tests, Prisma migrate check, and an e2e (Playwright) run of the key flow "create a trip → invite → add a stop".

## 9. Development phases and risks

Roughly 8 weeks at an evening pace. Each phase ends with a working deploy, so the project can be demoed from week 2.

1. **Foundation (weeks 1–2).** pnpm + Turborepo monorepo, Docker Compose for Postgres and Redis, Prisma schema, Google OAuth, trip CRUD, invites and roles, next-intl, CI, first deploy.
2. **Itinerary on Yjs (weeks 3–4).** Hocuspocus service, document structure, days from dates, adding and dragging stops, Tiptap notes, avatars and cursors, SQL snapshot.
3. **Map and places (week 5).** MapLibre, search through the `/places/search` proxy, adding a place to a day, pins with a day filter, map ↔ list selection sync.
4. **Chat and polls (week 6).** Socket.IO gateway with the Redis adapter, cursor-paginated history, comments on stops, polls with live counts.
5. **Budget (week 7).** Expenses, equal and manual split, balances, a settlement-minimizing algorithm (greedy matching of debtors and creditors), unit tests for rounding.
6. **Polish (week 8).** Mobile navigation, empty states, e2e tests, a seed with a demo trip, README with GIFs and the architecture diagram.

### Risks

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| Yjs + Tiptap + dnd-kit together is the hardest part | Phase 2 slips | Ship the itinerary without notes first; add Tiptap after drag and drop is stable |
| SQL snapshot drifts from the Yjs state | Map shows stale stops | Rebuild the snapshot fully on every store; the client map reads coordinates straight from Yjs |
| Cookies across web and api domains | Login breaks in production | One parent domain from the first deploy; on previews, proxy through Next.js rewrites |
| Free map API limits | Search stops working | Cache in `Place`, 300 ms debounce, minimum 3 characters |
| Cold starts on free hosting | WebSocket connects slowly | Fly.io with `min_machines_running = 1` or paid Railway ($5) |

### Open questions

- Product name and domain.
- Whether Yjs snapshot history (version history of the itinerary) belongs in the MVP or after it.
- Whether to send email invitations, or whether copying the link manually is enough.
