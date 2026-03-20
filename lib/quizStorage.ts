import { supabase } from "@/lib/supabase";
import type { QuestionFormData, LeaderboardEntry } from "@/types/quiz";

// ── Types ──────────────────────────────────────────────────────

export interface QuizTemplate {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  question_ids: string[];
  question_order: Record<string, number> | null;
  is_draft: boolean;
  times_run: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankItem {
  id: string;
  host_id: string;
  type: string;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  points_base: number;
  image_url: string | null;
  is_joker: boolean;
  slider_min: number | null;
  slider_max: number | null;
  slider_tolerance: number | null;
  video_url: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  audio_url: string | null;
  category: string | null;
  tags: string[] | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export interface SessionResult {
  id: string;
  room_id: string | null;
  quiz_template_id: string | null;
  host_id: string;
  title: string;
  player_count: number;
  question_count: number;
  final_leaderboard: LeaderboardEntry[] | null;
  question_stats: QuestionStat[] | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface QuestionStat {
  questionId: string;
  text: string;
  totalAnswers: number;
  correctCount: number;
  avgTimeMs: number;
}

// ── Helpers ────────────────────────────────────────────────────

function questionFormToRow(hostId: string, q: QuestionFormData) {
  return {
    host_id: hostId,
    type: q.type,
    question_text: q.question_text.trim(),
    options:
      q.type === "multiple_choice" ||
      q.type === "image_question" ||
      q.type === "true_false" ||
      q.type === "video_question" ||
      q.type === "audio_question"
        ? q.options
        : null,
    correct_answer: q.correct_answer.trim(),
    time_limit: q.time_limit,
    points_base: 1000,
    image_url: q.type === "image_question" ? q.image_url || null : null,
    is_joker: q.is_joker,
    slider_min: q.type === "slider" ? q.slider_min : null,
    slider_max: q.type === "slider" ? q.slider_max : null,
    slider_tolerance: q.type === "slider" ? (q.slider_tolerance ?? null) : null,
    video_url: q.type === "video_question" ? q.video_url || null : null,
    video_start_seconds:
      q.type === "video_question" ? q.video_start_seconds : null,
    video_end_seconds:
      q.type === "video_question" ? q.video_end_seconds : null,
    audio_url: q.type === "audio_question" ? q.audio_url || null : null,
  };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Save questions to the question bank and create/update a quiz template.
 * Returns the template id.
 */
export async function saveQuizTemplate(
  hostId: string,
  title: string,
  questions: QuestionFormData[],
  existingTemplateId?: string
): Promise<string> {
  const validQuestions = questions.filter(
    (q) => q.question_text.trim().length > 0
  );

  // Insert questions into the bank
  const rows = validQuestions.map((q) => questionFormToRow(hostId, q));
  const { data: inserted, error: qErr } = await supabase
    .from("qt_question_bank")
    .insert(rows)
    .select("id");

  if (qErr || !inserted) throw new Error(qErr?.message || "Failed to save questions.");

  const questionIds = inserted.map((r: { id: string }) => r.id);
  const questionOrder: Record<string, number> = {};
  questionIds.forEach((id: string, idx: number) => {
    questionOrder[id] = idx;
  });

  if (existingTemplateId) {
    const { error } = await supabase
      .from("qt_quiz_templates")
      .update({
        title: title.trim(),
        question_ids: questionIds,
        question_order: questionOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTemplateId);

    if (error) throw new Error(error.message);
    return existingTemplateId;
  }

  const { data: template, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .insert({
      host_id: hostId,
      title: title.trim(),
      question_ids: questionIds,
      question_order: questionOrder,
      is_draft: true,
    })
    .select("id")
    .single();

  if (tErr || !template) throw new Error(tErr?.message || "Failed to save template.");
  return template.id;
}

/** Load a quiz template with its full question data. */
export async function loadQuizTemplate(
  quizId: string
): Promise<{ template: QuizTemplate; questions: QuestionBankItem[] }> {
  const { data: template, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .select("*")
    .eq("id", quizId)
    .single();

  if (tErr || !template) throw new Error(tErr?.message || "Template not found.");

  const questionIds: string[] = template.question_ids || [];
  let questions: QuestionBankItem[] = [];

  if (questionIds.length > 0) {
    const { data, error } = await supabase
      .from("qt_question_bank")
      .select("*")
      .in("id", questionIds);

    if (error) throw new Error(error.message);
    // Sort by the order stored in the template
    const order = template.question_order as Record<string, number> | null;
    questions = (data || []).sort((a: QuestionBankItem, b: QuestionBankItem) => {
      if (!order) return 0;
      return (order[a.id] ?? 0) - (order[b.id] ?? 0);
    });
  }

  return { template: template as QuizTemplate, questions };
}

/** Duplicate a quiz template. */
export async function duplicateQuizTemplate(
  quizId: string,
  hostId: string
): Promise<string> {
  const { template, questions } = await loadQuizTemplate(quizId);

  // Re-insert questions as new bank items
  const rows = questions.map((q) => ({
    host_id: hostId,
    type: q.type,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    time_limit: q.time_limit,
    points_base: q.points_base,
    image_url: q.image_url,
    is_joker: q.is_joker,
    slider_min: q.slider_min,
    slider_max: q.slider_max,
    slider_tolerance: q.slider_tolerance,
    video_url: q.video_url,
    video_start_seconds: q.video_start_seconds,
    video_end_seconds: q.video_end_seconds,
    audio_url: q.audio_url,
  }));

  const { data: newQuestions, error: qErr } = await supabase
    .from("qt_question_bank")
    .insert(rows)
    .select("id");

  if (qErr || !newQuestions) throw new Error(qErr?.message || "Failed to duplicate questions.");

  const newIds = newQuestions.map((r: { id: string }) => r.id);
  const newOrder: Record<string, number> = {};
  newIds.forEach((id: string, idx: number) => {
    newOrder[id] = idx;
  });

  const { data: newTemplate, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .insert({
      host_id: hostId,
      title: `${template.title} (Copy)`,
      description: template.description,
      question_ids: newIds,
      question_order: newOrder,
      is_draft: true,
    })
    .select("id")
    .single();

  if (tErr || !newTemplate) throw new Error(tErr?.message || "Failed to duplicate template.");
  return newTemplate.id;
}

/** Delete a quiz template (does not delete bank questions). */
export async function deleteQuizTemplate(quizId: string): Promise<void> {
  const { error } = await supabase
    .from("qt_quiz_templates")
    .delete()
    .eq("id", quizId);

  if (error) throw new Error(error.message);
}

/** Save a game session result. */
export async function saveSessionResult(
  roomId: string,
  templateId: string | null,
  hostId: string,
  title: string,
  playerCount: number,
  questionCount: number,
  leaderboard: LeaderboardEntry[],
  questionStats: QuestionStat[],
  startedAt: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .insert({
      room_id: roomId,
      quiz_template_id: templateId,
      host_id: hostId,
      title,
      player_count: playerCount,
      question_count: questionCount,
      final_leaderboard: leaderboard,
      question_stats: questionStats,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to save session result.");
  return data.id;
}

/** Get session results for a host. */
export async function getSessionResults(
  hostId: string,
  limit = 20
): Promise<SessionResult[]> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as SessionResult[];
}

/** Get templates for a host. */
export async function getQuizTemplates(
  hostId: string
): Promise<QuizTemplate[]> {
  const { data, error } = await supabase
    .from("qt_quiz_templates")
    .select("*")
    .eq("host_id", hostId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as QuizTemplate[];
}

/** Mark a template as run (increment times_run, set last_run_at, mark not draft). */
export async function markTemplateAsRun(templateId: string): Promise<void> {
  // Fetch current times_run
  const { data } = await supabase
    .from("qt_quiz_templates")
    .select("times_run")
    .eq("id", templateId)
    .single();

  const currentRuns = data?.times_run ?? 0;

  await supabase
    .from("qt_quiz_templates")
    .update({
      times_run: currentRuns + 1,
      last_run_at: new Date().toISOString(),
      is_draft: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);
}

/** Get a single session result by ID. */
export async function getSessionResult(
  sessionId: string
): Promise<SessionResult> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) throw new Error(error?.message || "Session not found.");
  return data as SessionResult;
}
