"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase, generateRoomCode } from "@/lib/supabase";
import { getHostId } from "@/lib/host";
import { saveQuizTemplate, markTemplateAsRun } from "@/lib/quizStorage";
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

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    createEmptyQuestion(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleQuestionChange = useCallback(
    (index: number, updated: QuestionFormData) => {
      setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
    },
    []
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
    },
    [selectedIndex]
  );

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
    setSelectedIndex(questions.length);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Please enter a quiz title.";
    const hasValidQuestion = questions.some(
      (q) => q.question_text.trim().length > 0
    );
    if (!hasValidQuestion)
      return "At least one question must have question text.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) continue;
      if (
        (q.type === "multiple_choice" ||
          q.type === "image_question" ||
          q.type === "video_question" ||
          q.type === "audio_question") &&
        !q.correct_answer.trim()
      ) {
        return `Question ${i + 1}: Please select a correct answer.`;
      }
      if (q.type === "true_false" && !q.correct_answer.trim()) {
        return `Question ${i + 1}: Please select True or False.`;
      }
      if (
        (q.type === "slider" || q.type === "type_in") &&
        !q.correct_answer.trim()
      ) {
        return `Question ${i + 1}: Please provide a correct answer.`;
      }
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsCreating(true);
    setSaveSuccess(false);

    try {
      const hostId = getHostId();
      const roomCode = generateRoomCode();

      const validQuestions = questions.filter(
        (q) => q.question_text.trim().length > 0
      );

      // Save to quiz template + question bank
      const templateId = await saveQuizTemplate(hostId, title, validQuestions);
      await markTemplateAsRun(templateId);

      // Create room + quiz for live game
      const { data: room, error: roomError } = await supabase
        .from("qt_rooms")
        .insert({
          room_code: roomCode,
          host_id: hostId,
          status: "lobby",
        })
        .select()
        .single();

      if (roomError || !room) {
        throw new Error(roomError?.message || "Failed to create room.");
      }

      const { data: quiz, error: quizError } = await supabase
        .from("qt_quizzes")
        .insert({
          room_id: room.id,
          title: title.trim(),
        })
        .select()
        .single();

      if (quizError || !quiz) {
        throw new Error(quizError?.message || "Failed to create quiz.");
      }

      const questionRows = validQuestions.map((q, idx) => ({
        quiz_id: quiz.id,
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
        order_index: idx,
        image_url: q.type === "image_question" ? q.image_url || null : null,
        is_joker: q.is_joker,
        slider_min: q.type === "slider" ? q.slider_min : null,
        slider_max: q.type === "slider" ? q.slider_max : null,
        video_url: q.type === "video_question" ? q.video_url || null : null,
        video_start_seconds:
          q.type === "video_question" ? q.video_start_seconds : null,
        video_end_seconds:
          q.type === "video_question" ? q.video_end_seconds : null,
        audio_url: q.type === "audio_question" ? q.audio_url || null : null,
      }));

      const { error: questionsError } = await supabase
        .from("qt_questions")
        .insert(questionRows);

      if (questionsError) {
        throw new Error(
          questionsError.message || "Failed to create questions."
        );
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/host/${roomCode}?templateId=${templateId}`);
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError("Please enter a quiz title.");
      return;
    }
    const validQuestions = questions.filter(
      (q) => q.question_text.trim().length > 0
    );
    if (validQuestions.length === 0) {
      setError("Add at least one question with text.");
      return;
    }

    setError(null);
    setIsSavingDraft(true);
    try {
      const hostId = getHostId();
      await saveQuizTemplate(hostId, title, validQuestions);
      setSaveSuccess(true);
      setTimeout(() => {
        router.push("/host/dashboard");
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save draft."
      );
      setIsSavingDraft(false);
    }
  };

  const selected = questions[selectedIndex];

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Top Nav Bar */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-6 py-3 border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-primary-container tracking-tighter">
            QuizTime
          </span>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2 group">
            <input
              className="bg-transparent border-none font-bold text-primary-container p-0 focus:ring-0 focus:outline-none text-sm tracking-tight w-64"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isCreating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-primary border border-primary/10 hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </motion.button>
          <motion.button
            onClick={handleCreate}
            disabled={isCreating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] transition-shadow disabled:opacity-50 min-w-[120px]"
          >
            {saveSuccess ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </motion.span>
            ) : isCreating ? (
              "Creating..."
            ) : (
              "Start Quiz"
            )}
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
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(27,43,94,0.08)" }}
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
                          <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
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
          {/* Add Question Button */}
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
            <motion.button
              onClick={addQuestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-[0px_10px_20px_rgba(2,21,73,0.1)] transition-shadow"
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
