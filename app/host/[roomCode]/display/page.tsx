"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRoomChannel, usePlayersSubscription } from "@/lib/realtime";
import { isInSuspensePhase, scramblePositions } from "@/lib/suspense";
import HorseRace from "@/components/leaderboard/HorseRace";
import QRCodeDisplay from "@/components/shared/QRCodeDisplay";
import TimerBar from "@/components/player/TimerBar";
import EndGame from "@/components/EndGame";
import type {
  Room,
  Player,
  Question,
  GameState,
  LeaderboardEntry,
} from "@/types/quiz";

export default function DisplayScreen() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeLimit, setTimeLimit] = useState(15);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [showCorrectOverlay, setShowCorrectOverlay] = useState(false);
  const [suspenseMode, setSuspenseMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Realtime
  const { onBroadcast } = useRoomChannel(roomCode);

  // Fetch room + players on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: roomData } = await supabase
        .from("qt_rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (!roomData) {
        setLoading(false);
        return;
      }
      setRoom(roomData as Room);

      const { data: playersData } = await supabase
        .from("qt_players")
        .select("*")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      if (playersData) setPlayers(playersData as Player[]);

      if (roomData.status === "finished") setGameState("finished");

      // Get quiz info for total questions
      const { data: quizData } = await supabase
        .from("qt_quizzes")
        .select("id")
        .eq("room_id", roomData.id)
        .single();

      if (quizData) {
        const { count } = await supabase
          .from("qt_questions")
          .select("id", { count: "exact", head: true })
          .eq("quiz_id", quizData.id);
        if (count) setTotalQuestions(count);
      }

      setLoading(false);
    }
    fetchData();
  }, [roomCode]);

  // Player join subscription
  const handlePlayerJoin = useCallback((payload: Record<string, unknown>) => {
    const newPlayer = payload as unknown as Player;
    setPlayers((prev) => {
      if (prev.some((p) => p.id === newPlayer.id)) return prev;
      return [...prev, newPlayer];
    });
  }, []);

  usePlayersSubscription(room?.id ?? "", handlePlayerJoin);

  // Listen to broadcast events
  useEffect(() => {
    onBroadcast("game_state_change", (payload) => {
      const state = payload.state as GameState;
      setGameState(state);
      if (state === "question_start") {
        setCorrectAnswer(null);
        setShowCorrectOverlay(false);
      }
    });

    onBroadcast("question_reveal", (payload) => {
      const q = payload.question as Question;
      setCurrentQuestion(q);
      setQuestionNumber(payload.question_number as number);
      setTotalQuestions(payload.total_questions as number);
      setTimeRemaining(q.time_limit);
      setTimeLimit(q.time_limit);
    });

    onBroadcast("timer_tick", (payload) => {
      setTimeRemaining(payload.time_remaining as number);
      setTimeLimit(payload.time_limit as number);
    });

    onBroadcast("answer_revealed", (payload) => {
      const answer = payload.correctAnswer as string;
      setCorrectAnswer(answer);
      setShowCorrectOverlay(true);
      // Flash overlay for 2s then hide
      setTimeout(() => setShowCorrectOverlay(false), 2000);
    });

    onBroadcast("leaderboard_update", (payload) => {
      const entries = payload.leaderboard as LeaderboardEntry[];
      setLeaderboard(entries);
      // Also refresh player scores
      if (room) {
        supabase
          .from("qt_players")
          .select("*")
          .eq("room_id", room.id)
          .order("score", { ascending: false })
          .then(({ data }) => {
            if (data) setPlayers(data as Player[]);
          });
      }
    });

    onBroadcast("suspense_mode", (payload) => {
      setSuspenseMode(payload.enabled as boolean);
    });
  }, [onBroadcast, room]);

  // Build live leaderboard from players
  const liveLeaderboard = useMemo((): LeaderboardEntry[] => {
    if (leaderboard.length > 0) return leaderboard;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return sorted.map((p, idx) => ({
      player_id: p.id,
      player_name: p.name,
      horse_name: p.horse_name,
      score: p.score,
      rank: idx + 1,
    }));
  }, [players, leaderboard]);

  const maxScore = useMemo(
    () => Math.max(...liveLeaderboard.map((e) => e.score), 1),
    [liveLeaderboard]
  );

  // Scrambled positions for suspense mode
  const scrambledPositions = useMemo(() => {
    if (!suspenseMode) return undefined;
    const scrambled = scramblePositions(
      liveLeaderboard,
      questionNumber,
      totalQuestions
    );
    const map = new Map<string, number>();
    scrambled.forEach((s) => map.set(s.player_id, s.trackPosition));
    return map;
  }, [suspenseMode, liveLeaderboard, questionNumber, totalQuestions]);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${roomCode}`
      : "";

  // Resolve correct answer display text
  const correctAnswerDisplay = useMemo(() => {
    if (!correctAnswer || !currentQuestion) return correctAnswer;
    const opt = currentQuestion.options;
    if (
      opt &&
      (currentQuestion.type === "multiple_choice" ||
        currentQuestion.type === "image_question" ||
        currentQuestion.type === "video_question" ||
        currentQuestion.type === "audio_question")
    ) {
      const idx = parseInt(correctAnswer);
      if (!isNaN(idx) && opt[idx]) return opt[idx];
    }
    return correctAnswer;
  }, [correctAnswer, currentQuestion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021549] flex items-center justify-center">
        <motion.div
          className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // ---------- LOBBY ----------
  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tight mb-2"
        >
          QuizTime
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl text-[#FAFAF7]/50 font-medium mb-12"
        >
          Waiting for players...
        </motion.p>

        <div className="flex gap-16 items-start">
          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-2xl"
          >
            <QRCodeDisplay url={joinUrl} size={280} />
            <p className="text-center mt-4 text-[#1B2B5E] font-bold text-lg">
              Scan to join
            </p>
          </motion.div>

          {/* Room code + player list */}
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-[#FAFAF7]/40 font-bold mb-2">
                Room Code
              </p>
              <p className="text-8xl font-black tracking-tighter text-[#FF6B6B]">
                {roomCode}
              </p>
            </div>

            {/* Players */}
            <div className="w-[400px]">
              <p className="text-sm uppercase tracking-widest text-[#FAFAF7]/40 font-bold mb-4 text-center">
                {players.length} player{players.length !== 1 ? "s" : ""} joined
              </p>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                <AnimatePresence>
                  {players.map((player, idx) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white/10 backdrop-blur px-4 py-3 rounded-xl flex items-center gap-3"
                    >
                      <span className="text-2xl">
                        {["🦊","🍕","🚀","🥑","🎮","🐘","🦋","🌮","🎯","🦄","🐙","🎸","🌊","🔥","🎪","🐬"][idx % 16]}
                      </span>
                      <span className="font-bold truncate">{player.name}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Pulsing dot */}
        <motion.div
          className="absolute bottom-8 flex items-center gap-2 text-[#FAFAF7]/30"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
          <span className="text-sm font-medium">Waiting for host to start...</span>
        </motion.div>
      </div>
    );
  }

  // ---------- FINISHED ----------
  if (gameState === "finished") {
    return (
      <EndGame
        players={liveLeaderboard}
        quizTitle=""
        totalQuestions={totalQuestions}
        isHost={false}
      />
    );
  }

  // ---------- QUESTION / LEADERBOARD (main display) ----------
  return (
    <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col overflow-hidden relative">
      {/* Top section: question text + timer */}
      {(gameState === "question_start" || gameState === "question_end") &&
        currentQuestion && (
          <motion.div
            key={`q-${questionNumber}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 px-12 pt-8 pb-4"
          >
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#FF6B6B] text-white text-xs font-bold uppercase tracking-widest">
                    Q{questionNumber}/{totalQuestions}
                  </span>
                  {currentQuestion.is_joker && (
                    <span className="inline-block px-3 py-1 rounded-full bg-[#FFB95F] text-[#1B2B5E] text-xs font-bold uppercase">
                      Joker 2x
                    </span>
                  )}
                  <span className="text-[#FAFAF7]/40 text-sm font-medium uppercase tracking-widest">
                    {currentQuestion.type.replace("_", " ")}
                  </span>
                </div>
                <h1 className="text-4xl font-bold leading-tight max-w-4xl">
                  {currentQuestion.question_text}
                </h1>
              </div>

              {/* Timer */}
              {gameState === "question_start" && (
                <div className="flex-shrink-0 flex flex-col items-center">
                  <span className="text-7xl font-black tabular-nums text-[#FF6B6B]">
                    {timeRemaining}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#FAFAF7]/40 font-bold">
                    seconds
                  </span>
                </div>
              )}
            </div>

            {/* Timer bar */}
            {gameState === "question_start" && (
              <div className="mt-4">
                <TimerBar timeRemaining={timeRemaining} timeLimit={timeLimit} />
              </div>
            )}
          </motion.div>
        )}

      {/* Correct answer overlay */}
      <AnimatePresence>
        {showCorrectOverlay && correctAnswerDisplay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#021549]/90 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6"
              >
                <svg
                  className="w-14 h-14 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <p className="text-lg text-[#FAFAF7]/60 font-bold uppercase tracking-widest mb-2">
                Correct Answer
              </p>
              <p className="text-5xl font-black text-emerald-400">
                {correctAnswerDisplay}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horse race / leaderboard - bottom section */}
      <div className="flex-1 min-h-0">
        {liveLeaderboard.length > 0 ? (
          <HorseRace
            entries={liveLeaderboard}
            maxScore={maxScore}
            isFinal={false}
            scrambledPositions={scrambledPositions}
            questionProgress={
              questionNumber > 0
                ? `Q${questionNumber}/${totalQuestions}`
                : undefined
            }
            suspenseMode={
              suspenseMode ||
              isInSuspensePhase(questionNumber, totalQuestions)
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#FAFAF7]/30 text-xl">
            Waiting for the race to begin...
          </div>
        )}
      </div>
    </div>
  );
}
