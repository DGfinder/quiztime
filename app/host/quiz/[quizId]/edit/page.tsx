"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase, generateRoomCode } from "@/lib/supabase";
import { getHostId } from "@/lib/host";
import {
  loadQuizTemplate,
  markTemplateAsRun,
  type QuestionBankItem,
} from "@/lib/quizStorage";
import type { QuestionFormData, QuestionType } from "@/types/quiz";
import QuestionEditor from "@/components/host/QuestionEditor";

const questionTypeIcons: Record<QuestionType, string> = {
  multiple_choice: "quiz",
  true_false: "check_circle",
  image_question: "image",
  slider: "linear_scale",
  type_in: "keyboard",
  video_question: "videocam",
  audio_question: "music_note",
};

function createEmptyQuestion(): QuestionFormData {
  return {
    type: "multiple_choice",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    time_limit: 15,
    image_url: "",
    is_joker: false,
    slider_min: 0,
    slider_max: 100,
    video_url: "",
    video_start_seconds: 0,
    video_end_seconds: null,
    audio_url: "",
  };
}

function bankItemToFormData(item: QuestionBankItem): QuestionFormData {
  return {
    type: item.type as QuestionType,
    question_text: item.question_text,
    options: (item.options as string[]) || ["", "", "", ""],
    correct_answer: item.correct_answer,
    time_limit: item.time_limit,
    image_url: item.image_url || "",
    is_joker: item.is_joker,
    slider_min: item.slider_min ?? 0,
    slider_max: item.slider_max ?? 100,
    slider_tolerance: item.slider_tolerance ?? undefined,
    video_url: item.video_url || "",
    video_start_seconds: item.video_start_seconds ?? 0,
    video_end_seconds: item.video_end_seconds ?? null,
    audio_url: item.audio_url || "",
  };
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [title, setTitle] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    createEmptyQuestion(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  // Debounce save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load template
  useEffect(() => {
    async function load() {
      try {
        const { template, questions: bankQuestions } =
          await loadQuizTemplate(quizId);
        setTitle(template.title);
        if (bankQuestions.length > 0) {
          setQuestions(bankQuestions.map(bankItemToFormData));
        }
      } catch {
        setError("Failed to load quiz template.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId]);

  // Debounced auto-save
  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const hostId = getHostId();
        const validQuestions = questions.filter(
          (q) => q.question_text.trim().length > 0
        );

        if (validQuestions.length === 0) {
          setSaving(false);
          return;
        }

        // Delete old bank questions for this template, insert new ones
        const { template } = await loadQuizTemplate(quizId);
        const oldIds = template.question_ids || [];
        if (oldIds.length > 0) {
          await supabase
            .from("qt_question_bank")
            .delete()
            .in("id", oldIds);
        }

        const rows = validQuestions.map((q) => ({
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
          slider_tolerance:
            q.type === "slider" ? (q.slider_tolerance ?? null) : null,
          video_url:
            q.type === "video_question" ? q.video_url || null : null,
          video_start_seconds:
            q.type === "video_question" ? q.video_start_seconds : null,
          video_end_seconds:
            q.type === "video_question" ? q.video_end_seconds : null,
          audio_url:
            q.type === "audio_question" ? q.audio_url || null : null,
        }));

        const { data: inserted, error: qErr } = await supabase
          .from("qt_question_bank")
          .insert(rows)
          .select("id");

        if (qErr || !inserted) throw new Error(qErr?.message || "Save failed");

        const newIds = inserted.map((r: { id: string }) => r.id);
        const order: Record<string, number> = {};
        newIds.forEach((id: string, idx: number) => {
          order[id] = idx;
        });

        await supabase
          .from("qt_quiz_templates")
          .update({
            title: title.trim(),
            question_ids: newIds,
            question_order: order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", quizId);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch {
        // Silent fail for auto-save
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [questions, title, quizId]);

  const handleQuestionChange = useCallback(
    (index: number, updated: QuestionFormData) => {
      setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
      triggerSave();
    },
    [triggerSave]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      triggerSave();
    },
    [triggerSave]
  );

  const handleRemoveQuestion = useCallback(
    (index: number) => {
      setQuestions((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((_, i) => i !== index);
      });
      if (selectedIndex >= index && selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      }
      triggerSave();
    },
    [selectedIndex, triggerSave]
  );

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
    setSelectedIndex(questions.length);
  };

  const handleRunNow = async () => {
    setRunLoading(true);
    try {
      // Save first
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const hostId = getHostId();
      const { questions: bankQuestions } = await loadQuizTemplate(quizId);

      if (bankQuestions.length === 0) {
        setError("Add at least one question before running.");
        setRunLoading(false);
        return;
      }

      const roomCode = generateRoomCode();

      const { data: room, error: roomErr } = await supabase
        .from("qt_rooms")
        .insert({ room_code: roomCode, host_id: hostId, status: "lobby" })
        .select()
        .single();
      if (roomErr || !room) throw new Error(roomErr?.message || "Failed.");

      const { data: quiz, error: quizErr } = await supabase
        .from("qt_quizzes")
        .insert({ room_id: room.id, title: title.trim() })
        .select()
        .single();
      if (quizErr || !quiz) throw new Error(quizErr?.message || "Failed.");

      const questionRows = bankQuestions.map((q, idx) => ({
        quiz_id: quiz.id,
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        time_limit: q.time_limit,
        points_base: q.points_base,
        order_index: idx,
        image_url: q.image_url,
        is_joker: q.is_joker,
        slider_min: q.slider_min,
        slider_max: q.slider_max,
        video_url: q.video_url,
        video_start_seconds: q.video_start_seconds,
        video_end_seconds: q.video_end_seconds,
        audio_url: q.audio_url,
      }));

      await supabase.from("qt_questions").insert(questionRows);
      await markTemplateAsRun(quizId);

      router.push(`/host/${roomCode}?templateId=${quizId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run quiz.");
      setRunLoading(false);
    }
  };

  const selected = questions[selectedIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">{error}</h1>
          <button
            onClick={() => router.push("/host/dashboard")}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Top Nav Bar */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-6 py-3 border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="flex items-center gap-1 text-sm font-bold text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Dashboard
          </button>
          <div className="h-8 w-px bg-outline-variant/30" />
          <input
            className="bg-transparent border-none font-bold text-primary-container p-0 focus:ring-0 focus:outline-none text-sm tracking-tight w-64"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Quiz title..."
          />
          {saving && (
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest">
              Saving...
            </span>
          )}
          {saveSuccess && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest"
            >
              Saved
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleRunNow}
            disabled={runLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] disabled:opacity-50"
          >
            {runLoading ? "Starting..." : "Run Now"}
          </motion.button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error-container text-error px-6 py-3 text-center text-sm font-medium"
        >
          {error}
        </motion.div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Question List */}
        <aside className="w-80 bg-surface-container-low flex flex-col h-[calc(100vh-57px)] border-r border-outline-variant/10">
          <div className="p-6 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-outline">
              Questions ({questions.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-24">
            {questions.map((q, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    y: -2,
                    boxShadow: "0 4px 12px rgba(27,43,94,0.08)",
                  }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex gap-3 group cursor-pointer transition-all ${
                    isSelected
                      ? "bg-surface-container-lowest shadow-sm border-l-4 border-primary"
                      : q.is_joker
                      ? "hover:bg-surface-container relative overflow-hidden"
                      : "hover:bg-surface-container"
                  }`}
                >
                  {q.is_joker && !isSelected && (
                    <div className="absolute right-0 top-0 bg-tertiary-fixed-dim/20 w-12 h-12 -mr-6 -mt-6 rotate-45" />
                  )}
                  <div
                    className={`text-[10px] font-bold mt-1 ${
                      isSelected ? "text-primary/40" : "text-outline"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm line-clamp-1 ${
                        isSelected
                          ? "font-bold text-primary-container"
                          : "font-semibold text-on-surface-variant"
                      }`}
                    >
                      {q.question_text || "Untitled question..."}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {q.is_joker ? (
                        <>
                          <span
                            className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="text-[10px] font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-full text-on-tertiary-fixed-variant tracking-tighter">
                            JOKER
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px] text-outline">
                            {questionTypeIcons[q.type]}
                          </span>
                          <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant tracking-tighter">
                            {q.time_limit}s
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
            <motion.button
              onClick={addQuestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-[0px_10px_20px_rgba(2,21,73,0.1)]"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add Question
            </motion.button>
          </div>
        </aside>

        {/* Main: Question Editor */}
        <main className="flex-1 bg-surface p-8 overflow-y-auto">
          {selected && (
            <QuestionEditor
              question={selected}
              onChange={(updated) =>
                handleQuestionChange(selectedIndex, updated)
              }
              onRemove={() => handleRemoveQuestion(selectedIndex)}
              index={selectedIndex}
            />
          )}
        </main>
      </div>
    </div>
  );
}
