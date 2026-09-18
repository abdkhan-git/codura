# Codura

**A collaborative technical-interview preparation platform.**
*Where preparation meets execution.*

[codura.dev](https://codura.dev) · [github.com/abdkhan-git/codura](https://github.com/abdkhan-git/codura)

Codura combines a multi-language code judge, AI-assisted feedback, and real-time collaborative study sessions into a single platform built for university CS students. Users solve problems against a hidden test suite, get Big-O complexity analysis on every accepted submission, form study pods with live shared-editor sessions and video, and track progress against curated plans like Blind 75 and Grind 75.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Codebase at a Glance](#codebase-at-a-glance)
4. [Core Subsystems](#core-subsystems)
5. [API Surface](#api-surface)
6. [Local Development](#local-development)
7. [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5 (`strict`) |
| **Backend** | Next.js Route Handlers (154 endpoints), Server Actions |
| **Database** | Supabase Postgres — RLS, plpgsql functions/RPCs, triggers |
| **Auth** | Supabase Auth via `@supabase/ssr` (cookie-bound), GitHub + Google OAuth |
| **Code Execution** | Judge0 (RapidAPI) for judged submissions; Piston for scratch/session runs |
| **AI** | OpenAI `gpt-4o-mini` — complexity analysis, tutoring, code review |
| **Real-Time** | Supabase Realtime (broadcast + presence), LiveKit SFU, native WebRTC |
| **Editor** | Monaco (`@monaco-editor/react`) |
| **UI** | Tailwind CSS v4, Radix UI primitives (shadcn/ui `new-york`), Framer Motion, Recharts, Lucide |
| **Forms/Validation** | React Hook Form, Zod |
| **Deployment** | Vercel + Vercel Analytics |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js 16 Client (React 19)                │
│   Monaco · Whiteboard · Video Tiles · Recharts · Radix/Tailwind  │
└───────────────┬──────────────────────────────────┬───────────────┘
                │ HTTP (fetch / apiClient)         │ WebSocket
                │ dedup + 30s TTL cache            │
                ▼                                  ▼
┌───────────────────────────────┐   ┌──────────────────────────────┐
│  middleware.ts                │   │   Real-Time Transports       │
│  session refresh · route gate │   │                              │
└───────────────┬───────────────┘   │  Supabase Realtime           │
                ▼                   │   └ code_sync, chat, typing, │
┌───────────────────────────────┐   │     presence, whiteboard     │
│  154 Route Handlers           │   │                              │
│  /app/api/** — 28 domains     │   │  LiveKit SFU                 │
│  auth · RBAC · orchestration  │   │   └ pod session A/V + screen │
└──┬────────┬────────┬──────────┘   │                              │
   │        │        │              │  WebRTC (RTCPeerConnection)  │
   ▼        ▼        ▼              │   └ mock interviews, streams │
┌────────┐┌───────┐┌────────┐       └──────────────┬───────────────┘
│Supabase││Judge0 ││ OpenAI │                      │
│Postgres││RapidAPI│gpt-4o- │        signaling ────┘
│  RLS   ││ 7 lang││  mini  │        over Supabase broadcast
│  RPCs  │└───────┘└────────┘
└────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────────┐
│  53 tables · 230 RLS policies · 65 plpgsql functions             │
│  212 indexes · 42 triggers (denormalized counters)               │
└──────────────────────────────────────────────────────────────────┘
```

**Design note.** Business logic lives in route handlers, not a separate server. Read-heavy aggregations (feeds, streaks, leaderboards, connection graphs) are pushed into plpgsql RPCs so they execute as one round trip inside Postgres instead of N+1 queries from Node.

---

## Codebase at a Glance

| Directory | Files | Lines |
|---|---:|---:|
| `app/` (pages + 154 API routes) | 195 | 47,636 |
| `components/` | 175 | 53,595 |
| `lib/` | 12 | 5,227 |
| `hooks/` | 8 | 1,721 |
| `types/` | 4 | 682 |
| `utils/` | 10 | 687 |
| `contexts/` | 2 | 222 |
| **Total (TypeScript)** | **406** | **109,770** |

**SQL layer:** 72 files — 53 tables, 65 plpgsql functions, 230 RLS policies, 212 indexes, 42 triggers.

Largest modules: the collaborative session room (`app/study-pods/[id]/session/[sessionId]/page.tsx`, 4,037 lines), the problem workspace (`app/problems/[id]/page.tsx`, 2,154), and the judge pipeline (`lib/judge/judge-utils.ts`, 2,120).

---

## Core Subsystems

### Code Execution & Judging

`lib/judge/judge-utils.ts` · `app/api/problems/{run,submit}`

The most involved subsystem. Users write only a bare function body — everything needed to actually execute it against test cases is generated server-side at submission time.

**Test-harness code generation.** Seven per-language generators (Python, Java, JavaScript, TypeScript, C++, C#, Go) read a problem's row in `problems_metadata` — `function_name`, `parameters`, `return_type`, `comparison_type`, `input_transformers`, `output_transformer` — and emit a complete runnable program:

- Data-structure definitions (`ListNode`, `TreeNode`) injected only when the signature requires them
- Converters between JSON test fixtures and native structures, including BFS level-order tree construction and trailing-null trimming
- A comparison function derived from the problem's `comparison_type` (exact, set-equality, float tolerance, or a custom predicate)
- Per-language literal conversion so `[[1,2],[3,4]]` becomes a valid `vector<vector<int>>`, `int[][]`, Go slice, etc.
- A driver loop emitting a strict `Test {i}: PASS | FAIL - Expected X, got Y | ERROR - {msg}` protocol

The harness is concatenated with the user's code and submitted to **Judge0** as a single file (language IDs: Python 71, Java 62, JS 63, TS 74, C++ 54, C# 51, Go 60).

**Result collection.** `pollSubmissionStatus` polls up to 20 times starting at 100 ms with 1.5× exponential backoff capped at 1 s, terminating on any recognized terminal status. `parseTestResults` parses the harness protocol out of stdout, then derives an overall verdict from Judge0's status ID (compile error, TLE, runtime error) or from pass/fail counts.

**Visible vs. hidden tests.** `/run` fetches only non-hidden cases for fast iteration; `/submit` runs the full suite including hidden cases before persisting.

### AI Assistance

Four distinct `gpt-4o-mini` surfaces, each with purpose-built prompting.

**Big-O complexity analysis** (`analyzeComplexityWithAI`, `judge-utils.ts:219`) runs on submission with `temperature: 0.3` and `response_format: json_object`. It returns time and space complexity, independent confidence scores, prose explanations, and exactly two contributing code snippets per dimension. The prompt encodes language-specific cost rules (Python dict/set lookup O(1), list append amortized O(1); JS Map/Set O(1)) to prevent common misreadings. Output notation is normalized (`O(n^2)` → `O(n²)`) before being persisted to `submissions`.

**Hint-only tutoring** (`app/api/ai/submission-analysis`) is the most carefully constrained surface. Two mechanisms protect it:

- `judgeReliabilitySignal()` scores how much to trust the judge output — clamped to ≤0.25 when stderr indicates an internal error or timeout, ≤0.4 when a majority of tests fail with no stderr — so the model doesn't confidently explain a failure that was infrastructural.
- `sanitizeToHintsOnly()` post-processes every response, stripping fenced code blocks, long inline spans, whole function/class bodies, and any run of four or more consecutive code-like lines. Even if the model ignores its instructions, a complete solution cannot reach the user.

Access is gated on the caller actually owning a submission for that problem. Conversation history is truncated to the last 6 messages; every interaction is logged to `ai_interactions`.

**Pod code review** produces structured markdown feedback on a discussion comment's snippet — complexity, edge cases, style, alternatives — persisted into `thread_comments.metadata.ai_review`.

### Real-Time Collaboration

Three transports, each chosen for a different traffic shape.

**Supabase Realtime** (broadcast + presence, 12 modules) carries application state: `code_sync`, `language_change`, `chat_message`, `typing`, `execution_result`, `whiteboard_elements`, `whiteboard_cursor`, `user_joined_call`. Presence tracks roster and in-call status. Channels open with `ack: false` to avoid a REST fallback, guarded by a `safeBroadcast` helper that verifies connection state; editor changes are debounced before emission.

**LiveKit SFU** powers multi-party audio/video and screen sharing in pod sessions, configured with `adaptiveStream`, `dynacast`, and a 1.2 Mbps encoding cap. Tokens are minted server-side (`app/api/livekit/token/route.ts`): the route resolves the session's pod, requires an **active `study_pod_members` row** for the caller, and only then issues a JWT scoped to that room. Clients never see API credentials and cannot join a pod they aren't in.

**Native WebRTC** handles mock interviews and one-to-many live streams. `lib/simple-signaling.ts` exchanges offers, answers, and ICE candidates over a Supabase broadcast channel, with candidate queueing for races before remote description is set. Streaming maintains a `Map` of per-viewer peer connections for fan-out.

### Study Pods

The largest domain — **60 routes**, spanning membership, sessions, problems, challenges, discussions, analytics, and reputation.

**Role-based access control.** Every route validates an active `study_pod_members` row; mutating routes additionally require `owner` or `moderator`. Finer rules are enforced on member management: only owners may promote or demote moderators, the owner can never be removed or modified, moderators cannot remove peers, and the owner cannot leave without transferring ownership. Live-session control (`start`, `complete`, `stream`) also admits the session host.

**Challenge scoring** combines a difficulty base with a speed bonus scaled by remaining time and an efficiency bonus scored against a per-difficulty target code length.

**Pod health** is a weighted composite of engagement (0.30), completion (0.30), consistency (0.25), and collaboration (0.15), served from a precomputed `study_pod_analytics` snapshot when available and recomputed live otherwise.

**Threaded discussions** support voting, reactions, bookmarks, and complexity-annotated solution posts.

### Social Graph & Messaging

Bidirectional connections stored in a single table with directional queries; requests, accepts, declines, and cancellations each emit notifications. Suggestions are scored by shared university, mutual connections, and comparable solve counts and ratings. Messaging supports direct and group conversations with reactions, replies, edit/delete, read receipts, typing indicators, pinning, and archiving — backed by `SECURITY DEFINER` helper functions that break the circular RLS dependency between conversations and participants.

### Data Layer & Security

Row-level security is enforced on every table — **230 policies** across 58 tables. All API access runs through a cookie-bound client under the caller's own RLS context rather than a service role, so Postgres is the last line of defense rather than the application.

Heavy read paths are implemented as plpgsql RPCs (`get_social_feed`, `calculate_user_streak`, `search_users`, `get_user_pod_statistics`, `get_next_recommended_problem`, `calculate_optimal_meeting_times`), and **42 triggers** maintain denormalized counters — vote totals, comment counts, thread stats, template ratings — so feeds never aggregate at read time.

### Auth & Onboarding

Supabase Auth with GitHub and Google OAuth. `middleware.ts` refreshes the session on every non-asset request and enforces a progressive gate: anonymous users reach only public paths plus public profiles and problem browsing; authenticated users who haven't finished the questionnaire are funneled to `/dashboard`, where onboarding and questionnaire modals render; completed users get the full allowlist.

### Performance

- **Request consolidation** — `/api/dashboard` replaced six sequential client calls with one handler running seven queries in a single `Promise.all`, plus a `calculate_user_streak` RPC that moved streak computation from JavaScript into Postgres.
- **Client-side dedup** — `lib/api-client.ts` collapses concurrent identical in-flight requests into one promise and caches responses with a 30 s TTL.
- **N+1 elimination** — list endpoints call purpose-built RPCs (e.g. `get_user_study_plans_with_counts`) rather than fetching counts per row.
- **Asset caching** — immutable long-lived cache headers on static assets; `optimizePackageImports` for Recharts and Lucide; AVIF/WebP image pipeline.

---

## API Surface

154 route handlers across 28 domains.

| Domain | Routes | Responsibility |
|---|---:|---|
| `study-pods` | 60 | Pods, members, sessions, challenges, discussions, analytics, streaming |
| `study-plans` | 9 | Plans, templates, curation, problem population |
| `feed` | 9 | Posts, comments, likes, reposts, bookmarks, preferences |
| `connections` | 9 | Requests, accept/decline, unfriend, status, mutuals |
| `users` | 8 | Search, suggestions, profiles, activity, connection counts |
| `mock-interview` | 8 | Private + public sessions, admission, attendance, messaging |
| `problems` | 6 | Listing, filtering, run, submit, stats, topics |
| `profile` | 5 | Profile CRUD, avatar upload, privacy settings |
| `live-streams` | 5 | Start, stop, list, detail, viewer count |
| `dashboard` | 5 | Consolidated dashboard, activity chart, daily challenge |
| `activity` | 4 | Activity feed, auto-post, reactions, comments |
| `notifications` | 3 | Delivery, preferences, settings |
| `ai` | 2 | Initial analysis, submission tutoring |
| `health` | 2 | Migration + feed health probes |
| Others | 19 | `auth`, `calendar`, `code`, `companies`, `leaderboard`, `livekit`, `locations`, `onboarding`, `questionnaire`, `schools`, `suggestions`, `admin`, plus debug/test routes |

---

## Local Development

**Prerequisites:** Node.js 20+, a Supabase project, and API keys for OpenAI, Judge0 (RapidAPI), and LiveKit.

```bash
git clone https://github.com/abdkhan-git/codura.git
cd codura
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # or: npm run dev:turbo
```

Open [http://localhost:3000](http://localhost:3000).

**Environment variables** (names only — never commit values):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — seeding scripts only |
| `SUPABASE_AUTH_GITHUB_CLIENT_ID` / `SUPABASE_AUTH_GITHUB_SECRET` | GitHub OAuth |
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Google OAuth |
| `OPENAI_API_KEY` / `OPENAI_CHAT_MODEL` | AI analysis and tutoring |
| `RAPIDAPI_HOST` / `RAPIDAPI_KEY` | Judge0 code execution |
| `LIVEKIT_WS_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Video sessions |
| `COLLEGE_SCORECARD_API_KEY` / `COLLEGE_SCORECARD_BASE_URL` | University lookup |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL for socket + callbacks |

**Scripts**

```bash
npm run dev          # dev server
npm run dev:turbo    # dev server with Turbopack
npm run build        # production build
npm run start        # serve production build
npm run type-check   # tsc --noEmit
```

Database setup: apply the SQL in `supabase/migrations/`, then seed with `database/seeds/01_problems_seed_fixed.sql` followed by the study-plan seeds in `database/seeds/study_plans/`.

---

## Known Limitations & Roadmap

Honest accounting of what's unfinished.

**Collaborative editing is last-write-wins.** Code sync broadcasts full editor state over Supabase Realtime rather than merging operations. Concurrent edits to the same region can clobber. CRDT dependencies (`yjs`, `y-monaco`, `y-websocket`) are installed but not wired up — integration was deferred over Monaco ESM bundling issues, and `lib/hooks/use-collaborative-editor.ts` is currently a documented no-op stub. Proper CRDT merge is the top priority.

**Auth hardening needed on execution endpoints.** `/api/problems/submit`, `/api/problems/run`, and `/api/code/execute` do not verify the session, and `/submit` trusts a body-supplied `user_id`. These need the same `auth.getUser()` gate the other 137 routes use.

**Unused dependencies to prune.** `zustand` and `simple-peer` are declared but never imported, alongside the CRDT packages above. Client state is `useState`/`useRef` plus two React contexts.

**Migration layout.** Three directories (`supabase/migrations/`, `migrations/`, `scripts/`) hold schema changes, and no file carries a timestamp prefix, leaving apply order undefined. These should be consolidated into one ordered, timestamped set with a baseline migration — several core tables currently exist only in the live project and aren't reproducible from the repo.

**Build strictness.** `next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` to work around a lucide-react typing issue; both should be re-enabled once the shim in `types/lucide-react.d.ts` is resolved.

**Test coverage.** One test file (`utils/streak-calculator.test.ts`) and no configured runner. Vitest plus coverage on the judge harness generators and scoring logic is the highest-value next step.

**Cross-cutting cleanup.** Auth checks are copy-pasted per route and belong in a shared wrapper; Zod is installed but validation is hand-rolled; `utils/cache.ts` is written but unused; several `debug/*` and `test-*` routes should be stripped from production builds.
