"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, generateRoomCode } from "@/lib/supabase";
import { getHostId } from "@/lib/host";
import {
  getQuizTemplates,
  getSessionResults,
  deleteQuizTemplate,
  duplicateQuizTemplate,
  loadQuizTemplate,
  markTemplateAsRun,
  type QuizTemplate,
  type SessionResult,
} from "@/lib/quizStorage";

export default function DashboardPage() {
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats
  const totalQuizzes = templates.length;
  const totalGames = sessions.length;
  const totalPlayers = sessions.reduce((sum, s) => sum + s.player_count, 0);

  useEffect(() => {
    const id = getHostId();
    setHostId(id);

    async function load() {
      try {
        const [t, s] = await Promise.all([
          getQuizTemplates(), // shows all quizzes — internal tool
          getSessionResults(id),
        ]);
        setTemplates(t);
        setSessions(s);
      } catch {
        // Silently handle - empty state will show
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleRunQuiz = useCallback(
    async (template: QuizTemplate) => {
      setActionLoading(template.id);
      try {
        const { questions } = await loadQuizTemplate(template.id);
        if (questions.length === 0) {
          alert("This quiz has no questions. Edit it first.");
          setActionLoading(null);
          return;
        }

        const roomCode = generateRoomCode();

        const { data: room, error: roomErr } = await supabase
          .from("qt_rooms")
          .insert({ room_code: roomCode, host_id: hostId, status: "lobby" })
          .select()
          .single();
        if (roomErr || !room) throw new Error(roomErr?.message || "Failed to create room.");

        const { data: quiz, error: quizErr } = await supabase
          .from("qt_quizzes")
          .insert({ room_id: room.id, title: template.title })
          .select()
          .single();
        if (quizErr || !quiz) throw new Error(quizErr?.message || "Failed to create quiz.");

        const questionRows = questions.map((q, idx) => ({
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

        const { error: qErr } = await supabase.from("qt_questions").insert(questionRows);
        if (qErr) throw new Error(qErr.message);

        // Increment question bank usage
        for (const q of questions) {
          await supabase
            .from("qt_question_bank")
            .update({ times_used: (q.times_used || 0) + 1 })
            .eq("id", q.id);
        }

        await markTemplateAsRun(template.id);
        router.push(`/host/${roomCode}?templateId=${template.id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to run quiz.");
        setActionLoading(null);
      }
    },
    [hostId, router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this quiz? This cannot be undone.")) return;
      setActionLoading(id);
      try {
        await deleteQuizTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } catch {
        alert("Failed to delete quiz.");
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const newId = await duplicateQuizTemplate(id, hostId);
        const refreshed = await getQuizTemplates(hostId);
        setTemplates(refreshed);
        // Navigate to edit the duplicate
        router.push(`/host/quiz/${newId}/edit`);
      } catch {
        alert("Failed to duplicate quiz.");
      } finally {
        setActionLoading(null);
      }
    },
    [hostId, router]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

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

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="bg-surface-bright border-b border-primary/10 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span
            className="text-xl font-bold text-primary-container tracking-tighter cursor-pointer"
            onClick={() => router.push("/")}
          >
            QuizTime
          </span>
          <div className="h-8 w-px bg-outline-variant/30" />
          <span className="text-sm font-bold text-primary">Dashboard</span>
        </div>
        <motion.button
          onClick={() => router.push("/host/new")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="bg-secondary-container text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)]"
        >
          New Quiz
        </motion.button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Quizzes Created", value: totalQuizzes, icon: "quiz" },
            { label: "Games Played", value: totalGames, icon: "sports_esports" },
            { label: "Total Players", value: totalPlayers, icon: "group" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-outline text-[20px]">
                  {stat.icon}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  {stat.label}
                </span>
              </div>
              <p className="text-3xl font-black text-primary">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: My Quizzes */}
          <section className="lg:col-span-2">
            <h2 className="text-lg font-bold text-primary mb-4">My Quizzes</h2>
            {templates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/30 p-12 text-center"
              >
                <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4 block">
                  lightbulb
                </span>
                <h3 className="text-xl font-bold text-primary mb-2">
                  Create your first quiz
                </h3>
                <p className="text-outline mb-6 max-w-sm mx-auto">
                  Build a quiz with multiple question types, then run it live
                  with your team.
                </p>
                <motion.button
                  onClick={() => router.push("/host/new")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-secondary-container text-white px-8 py-3 rounded-xl font-extrabold shadow-[0px_10px_20px_rgba(255,107,107,0.2)]"
                >
                  New Quiz
                </motion.button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {templates.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 flex items-center gap-4 group hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-primary truncate">
                            {t.title}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.is_draft
                                ? "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {t.is_draft ? "Draft" : "Ready"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-outline">
                          <span>
                            {(t.question_ids || []).length} question
                            {(t.question_ids || []).length !== 1 ? "s" : ""}
                          </span>
                          <span>Run {t.times_run}x</span>
                          <span>Last run: {formatDate(t.last_run_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRunQuiz(t)}
                          disabled={actionLoading === t.id}
                          className="px-4 py-2 bg-secondary-container text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {actionLoading === t.id ? "..." : "Run"}
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/host/quiz/${t.id}/edit`)
                          }
                          className="px-3 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(t.id)}
                          disabled={actionLoading === t.id}
                          className="px-3 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={actionLoading === t.id}
                          className="px-3 py-2 bg-error/10 rounded-lg text-xs font-bold text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Right: Recent Sessions */}
          <section>
            <h2 className="text-lg font-bold text-primary mb-4">
              Recent Sessions
            </h2>
            {sessions.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline/30 block mb-2">
                  history
                </span>
                <p className="text-sm text-outline">
                  No games played yet. Run a quiz to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((s, i) => {
                  const winner =
                    s.final_leaderboard && s.final_leaderboard.length > 0
                      ? s.final_leaderboard[0].player_name
                      : null;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() =>
                        router.push(`/host/results/${s.id}`)
                      }
                      className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-bold text-primary text-sm truncate">
                        {s.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-outline">
                        <span>{formatDate(s.finished_at || s.created_at)}</span>
                        <span>{s.player_count} players</span>
                      </div>
                      {winner && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                            emoji_events
                          </span>
                          <span className="text-xs font-bold text-tertiary-fixed-dim">
                            {winner}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
