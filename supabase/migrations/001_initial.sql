-- QuizTime Initial Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Rooms table
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  room_code text unique not null,
  host_id text not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  created_at timestamptz default now()
);

-- Quizzes table
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now()
);

-- Questions table
create table questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  type text not null check (type in ('multiple_choice', 'true_false', 'image_question', 'slider', 'type_in', 'video_question', 'audio_question')),
  question_text text not null,
  options jsonb,
  correct_answer text not null,
  time_limit integer not null default 15,
  points_base integer not null default 1000,
  order_index integer not null default 0,
  image_url text,
  is_joker boolean not null default false,
  slider_min numeric,
  slider_max numeric,
  video_url text,
  video_start_seconds integer default 0,
  video_end_seconds integer,
  audio_url text
);

-- Players table
create table players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  name text not null,
  horse_name text not null,
  score integer not null default 0,
  joined_at timestamptz default now()
);

-- Answers table
create table answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references questions(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  answer_value text not null,
  is_correct boolean not null default false,
  points_earned integer not null default 0,
  answered_at timestamptz default now(),
  time_taken_ms integer not null default 0
);

-- Indexes
create index idx_rooms_room_code on rooms(room_code);
create index idx_players_room_id on players(room_id);
create index idx_questions_quiz_id on questions(quiz_id);
create index idx_answers_question_id on answers(question_id);
create index idx_answers_player_id on answers(player_id);
create index idx_quizzes_room_id on quizzes(room_id);

-- Enable Row Level Security
alter table rooms enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- RLS Policies (permissive for anon access — no login required)
create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can create rooms" on rooms for insert with check (true);
create policy "Host can update rooms" on rooms for update using (true);

create policy "Anyone can read quizzes" on quizzes for select using (true);
create policy "Anyone can create quizzes" on quizzes for insert with check (true);

create policy "Anyone can read questions" on questions for select using (true);
create policy "Anyone can create questions" on questions for insert with check (true);

create policy "Anyone can read players" on players for select using (true);
create policy "Anyone can create players" on players for insert with check (true);
create policy "Anyone can update players" on players for update using (true);

create policy "Anyone can read answers" on answers for select using (true);
create policy "Anyone can create answers" on answers for insert with check (true);
create policy "Anyone can update answers" on answers for update using (true);

-- Enable Realtime on relevant tables
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;

-- Storage bucket for quiz images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true)
ON CONFLICT DO NOTHING;

-- Allow public uploads and reads
CREATE POLICY "Public quiz image upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quiz-images');

CREATE POLICY "Public quiz image read" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-images');

-- Storage bucket for quiz audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-audio', 'quiz-audio', true)
ON CONFLICT DO NOTHING;

-- Allow public uploads and reads for audio
CREATE POLICY "Public quiz audio upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quiz-audio');

CREATE POLICY "Public quiz audio read" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-audio');
