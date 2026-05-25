# Data model & persistence contract

All persistence runs through Supabase. Table, bucket, and storage-key names
below are runtime contracts; the schema lives in `supabase/migrations/`.

## Tables (`qt_` prefix)

| Table | Owned by (data layer) | Notes |
|---|---|---|
| `qt_rooms` | live-room | `current_question_index`, `current_quiz_id` drive late-join |
| `qt_quizzes` | live-room | quiz instance attached to a room |
| `qt_questions` | live-room | questions for a running room |
| `qt_players` | live-room / player | realtime `INSERT` watched for joins |
| `qt_answers` | live-room / player | realtime `INSERT` watched for submissions |
| `qt_question_bank` | quiz-authoring | reusable authored questions |
| `qt_quiz_templates` | quiz-authoring | saved quizzes; `times_run`, `last_run_at`, `is_draft` |
| `qt_session_results` | session-results | final leaderboard + per-question stats |

Repositories: `features/quiz-authoring/data/quizTemplateRepository.ts`,
`features/session-results/data/sessionResultsRepository.ts`. Live-room and
player still issue Supabase calls from their route components (a known
follow-up — see below).

## Storage buckets

| Bucket | Used by | Helper |
|---|---|---|
| `quiz-images` | image questions | `integrations/supabase/storage.ts#uploadQuizImage` |
| `quiz-audio` | audio questions | `integrations/supabase/storage.ts#uploadQuizAudio` |

## Browser storage

| Key | Where | Notes |
|---|---|---|
| `qt_host_id` | `shared/hostIdentity.ts` | persistent host identity |
| `quiztime_host_id` | `shared/hostIdentity.ts` | **legacy** key, migrated to `qt_host_id` — do not drop the migration |

## Clients

- Browser (anon) client: lazy singleton in
  `integrations/supabase/client.ts` (throws only when first used without
  `NEXT_PUBLIC_SUPABASE_*`).
- Service-role client: `createServiceClient()` for server routes.

## Known follow-up

The live-room and player route components still call Supabase inline rather
than through a repository. Extracting `liveRoomRepository` /
`playerRepository` is the next data-layer step; it was deferred because the
realtime gameplay it wraps cannot be runtime-verified without a live
Supabase project + browser.
