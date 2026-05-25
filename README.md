# 🎉 QuizTime

Real-time pub quiz app for team meetings. Host creates a quiz, players join on their phones, answer questions live, and compete on a horse race leaderboard.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Realtime + DB) · Framer Motion

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new [Supabase](https://supabase.com) project
2. Run the migration in `supabase/migrations/001_initial.sql` against your database (SQL Editor in the Supabase dashboard)
3. Enable Realtime on the `rooms`, `players`, and `answers` tables (the migration does this, but verify in Dashboard → Database → Replication)

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-key-here          # Optional: enables AI question generation
```

> **Optional:** Add `ANTHROPIC_API_KEY` to enable AI question generation in the quiz builder.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

```bash
npx vercel
```

Set the three environment variables in your Vercel project settings.

## How it works

### Architecture

QuizTime has two experiences — **Host** (laptop/TV) and **Player** (phone) — connected via Supabase Realtime broadcast channels.

```
┌─────────────┐     Supabase Realtime      ┌──────────────┐
│  Host View   │◄──── room:{code} channel ──►│ Player Views │
│  /host/CODE  │     (broadcast events)      │ /play/CODE   │
└──────┬───────┘                             └──────┬───────┘
       │                                            │
       └────────── Supabase Postgres DB ────────────┘
                   (rooms, quizzes, questions,
                    players, answers)
```

### Game flow

1. **Host creates a quiz** at `/host/new` — adds questions of various types, saves to DB
2. **Room created** with a 6-character code. Host sees a lobby at `/host/CODE` with a QR code
3. **Players join** by scanning QR or entering the code at `/play/CODE`. They enter their name and get assigned a random horse name
4. **Host starts the game** — broadcasts `game_state_change` to all players
5. **For each question:**
   - Host broadcasts `question_reveal` (without the correct answer)
   - Timer counts down (host broadcasts `timer_tick` each second)
   - Players tap their answer on their phone → saved to DB
   - Timer ends → host scores all answers, updates DB
   - Host can show the leaderboard (horse race animation)
6. **Game ends** — final leaderboard, winner announced with trumpet 🎺

### Realtime events

All events flow through a Supabase Realtime broadcast channel named `room:{roomCode}`:

| Event | Direction | Payload |
|---|---|---|
| `game_state_change` | Host → Players | `{ state, current_question_index }` |
| `question_reveal` | Host → Players | `{ question (no answer), question_number, total }` |
| `timer_tick` | Host → Players | `{ time_remaining, time_limit }` |
| `answer_revealed` | Host → Players | `{ questionId, correctAnswer, playerResults, nextImageUrl? }` |
| `leaderboard_update` | Host → Players | `{ leaderboard: [{player_id, name, horse_name, score, rank}] }` |
| `suspense_mode` | Host → Players | enables late-game suspense UI |
| `final_reveal_start` | Host → Players | triggers the final winner reveal |

Player answers are written directly to the `qt_answers` table. The host subscribes to Postgres changes on `qt_answers` to track submissions in real-time.

> Full contract (channels, payload types, late-join): [`docs/contracts/realtime-events.md`](docs/contracts/realtime-events.md).

### Question types

| Type | How it works |
|---|---|
| `multiple_choice` | 4 options, one correct |
| `true_false` | True or False |
| `image_question` | Image + 4 options |
| `slider` | Numeric range — closest answer wins proportionally |
| `type_in` | Text answer — exact match or host marks correct |

Any question can be flagged as a **Joker Round** (2x point multiplier).

### Scoring

- **Base:** 1000 points per question
- **Time decay:** `points = round(1000 × (adjustedRemaining / timeLimit))`, where the first 1s is a free reading grace (`adjustedRemaining = min(timeRemaining + 1000, timeLimit)`)
- **Wrong:** 0 points
- **Joker:** 2× multiplier applied after time decay
- **Slider:** Proportional to proximity to correct answer
- **Type-in:** Exact string match (case-insensitive), or host manual mark

### Horse Race Leaderboard

Each player gets a fun random horse name (e.g. "Galloping Gary", "Turbo Nugget"). After each question, the host can reveal a horse race where horses animate across the screen based on cumulative score. The final reveal includes a trophy for the winner.

## Project structure

The codebase is organised **domain/feature-first**. `app/` is routing only;
each product domain lives under `features/<name>/` behind an `index.ts`
public API.

```
app/                    # Next.js routing — thin wrappers that render a feature route
features/               # one folder per domain (each with an index.ts public API)
  ai-question-generation/  host-dashboard/  leaderboard/  live-room/
  media/  player-experience/  quiz-authoring/  realtime/  scoring/  session-results/
integrations/supabase/  # external clients (no domain logic)
shared/                 # domain kernel types, ui primitives, hooks, utils
supabase/migrations/    # SQL schema
docs/                   # architecture, contracts, ADRs
scripts/check-boundaries.mjs  # enforces import boundaries (npm run lint:boundaries)
```

See [`docs/architecture/project-structure.md`](docs/architecture/project-structure.md)
for the full layout and [`docs/architecture/boundaries.md`](docs/architecture/boundaries.md)
for the import rules. Tests are colocated with the code they cover
(e.g. `features/scoring/__tests__/`).

## Development

### Running tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

### Type checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
npm run lint:boundaries   # enforces feature/import boundaries (docs/architecture/boundaries.md)
```

## CI

GitHub Actions runs on every push/PR to `main`:
1. Typecheck + lint + boundary check + tests
2. Production build

Configure these repository secrets for CI builds:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (optional)

## Production Notes

- **No auth required** — host identity is a UUID stored in `localStorage`. Keep this in mind for shared/public deployments.
- **RLS policies** are permissive (anon access) — suitable for internal/trusted team use.
- **AI question generation** is optional; set `ANTHROPIC_API_KEY` to enable it.
- **Realtime** uses Supabase broadcast channels — each room gets its own channel `room:{code}`.
- **Scoring** is server-authoritative: the host scores all answers after each question.
