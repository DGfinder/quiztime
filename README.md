# 🎉 QuizTime

Real-time pub quiz app for team meetings. Host creates a quiz, players join on their phones, answer questions live, and compete on a horse race leaderboard.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Realtime + DB) · Framer Motion

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
| `leaderboard_update` | Host → Players | `{ leaderboard: [{player_id, name, horse_name, score, rank}] }` |

Player answers are written directly to the `answers` table. The host subscribes to Postgres changes on `answers` to track submissions in real-time.

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
- **Time decay:** `points = round(1000 × (timeRemaining / timeLimit))`
- **Wrong:** 0 points
- **Joker:** 2× multiplier applied after time decay
- **Slider:** Proportional to proximity to correct answer
- **Type-in:** Exact string match (case-insensitive), or host manual mark

### Horse Race Leaderboard

Each player gets a fun random horse name (e.g. "Galloping Gary", "Turbo Nugget"). After each question, the host can reveal a horse race where horses animate across the screen based on cumulative score. The final reveal includes a trophy for the winner.

## Project structure

```
app/
  page.tsx                          # Landing page
  layout.tsx                        # Root layout with Plus Jakarta Sans
  host/
    new/page.tsx                    # Quiz creation
    [roomCode]/
      page.tsx                      # Host control panel (game loop)
      leaderboard/page.tsx          # Standalone leaderboard projection
  play/
    [roomCode]/page.tsx             # Player join + play

components/
  host/
    QuestionDisplay.tsx             # Big screen question display
    AnswerDistribution.tsx          # Post-question answer chart
    Lobby.tsx                       # Waiting room with QR code
    QuestionEditor.tsx              # Question creation form
  player/
    AnswerButtons.tsx               # Mobile answer buttons
    WaitingScreen.tsx               # Lobby/waiting states
    PointsFlash.tsx                 # Points earned animation
  shared/
    Button.tsx                      # Reusable button with variants
    TimerBar.tsx                    # Animated countdown bar
    QRCodeDisplay.tsx               # QR code renderer
    AnimatedContainer.tsx           # Fade-in wrapper
  leaderboard/
    HorseRace.tsx                   # Horse race visualization
    RankedList.tsx                  # Classic ranked list

lib/
  supabase.ts                       # Supabase client + helpers
  realtime.ts                       # Realtime hooks (channel, timer, subscriptions)
  scoring.ts                        # Scoring calculations
  horses.ts                         # Horse name generator

types/
  quiz.ts                           # All TypeScript types

supabase/
  migrations/
    001_initial.sql                 # Database schema
```
