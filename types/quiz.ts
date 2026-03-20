export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "image_question"
  | "slider"
  | "type_in"
  | "video_question"
  | "audio_question";

export type RoomStatus = "lobby" | "active" | "finished";

export type GameState =
  | "lobby"
  | "question_start"
  | "question_end"
  | "leaderboard"
  | "finished";

export interface Room {
  id: string;
  room_code: string;
  host_id: string;
  status: RoomStatus;
  created_at: string;
}

export interface Quiz {
  id: string;
  room_id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  type: QuestionType;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  points_base: number;
  order_index: number;
  image_url: string | null;
  is_joker: boolean;
  slider_min?: number;
  slider_max?: number;
  slider_tolerance?: number;
  video_url?: string;
  video_start_seconds?: number;
  video_end_seconds?: number;
  audio_url?: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  horse_name: string;
  score: number;
  joined_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  player_id: string;
  answer_value: string;
  is_correct: boolean;
  points_earned: number;
  answered_at: string;
  time_taken_ms: number;
}

// Realtime event payloads
export interface GameStatePayload {
  state: GameState;
  current_question_index?: number;
}

export interface QuestionRevealPayload {
  question: Question;
  question_number: number;
  total_questions: number;
}

export interface AnswerSubmittedPayload {
  player_id: string;
  player_name: string;
  question_id: string;
}

export interface TimerTickPayload {
  time_remaining: number;
  time_limit: number;
}

export interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  horse_name: string;
  score: number;
  rank: number;
}

export interface LeaderboardUpdatePayload {
  leaderboard: LeaderboardEntry[];
}

export interface PlayerResult {
  isCorrect: boolean;
  pointsEarned: number;
}

export interface AnswerRevealPayload {
  questionId: string;
  correctAnswer: string;
  playerResults: Record<string, PlayerResult>;
}

// Form types for creating quizzes
export interface QuestionFormData {
  type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  time_limit: number;
  image_url: string;
  is_joker: boolean;
  slider_min: number;
  slider_max: number;
  slider_tolerance?: number;
  video_url: string;
  video_start_seconds: number;
  video_end_seconds: number | null;
  audio_url: string;
}

export interface QuizFormData {
  title: string;
  questions: QuestionFormData[];
}
