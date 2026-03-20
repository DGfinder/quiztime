"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LeaderboardEntry } from "@/types/quiz";

interface FinalRevealProps {
  players: LeaderboardEntry[];
  onComplete?: () => void;
}

const rankColors: Record<number, string> = {
  1: "#FF6B6B",
  2: "#FFB95F",
  3: "#60a5fa",
};

function ConfettiBurst() {
  const emojis = ["🎉", "🏆", "⭐", "🎊", "✨", "🥇", "💥", "🔥"];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 800,
    y: -(Math.random() * 500 + 150),
    rotate: Math.random() * 720 - 360,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    delay: Math.random() * 0.5,
    size: Math.random() * 16 + 16,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            fontSize: p.size,
            left: "50%",
            top: "50%",
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            rotate: p.rotate,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: 2.5,
            delay: p.delay,
            ease: "easeOut",
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export default function FinalReveal({
  players,
  onComplete,
}: FinalRevealProps) {
  // Sorted by score descending — index 0 is 1st place
  const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 6);
  // Reveal order: 6th → 1st (reverse)
  const revealOrder = [...sorted].reverse();

  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [scoreVisible, setScoreVisible] = useState<Set<string>>(new Set());

  const revealedPlayerIds = new Set(
    revealOrder.slice(0, revealedCount).map((p) => p.player_id)
  );

  const isAllRevealed = revealedCount >= revealOrder.length;

  useEffect(() => {
    if (revealedCount >= revealOrder.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);

      const justRevealed = revealOrder[nextCount - 1];

      // Show score with 0.5s delay after lane appears
      setTimeout(() => {
        if (justRevealed) {
          setScoreVisible((prev) => new Set(prev).add(justRevealed.player_id));
        }
      }, 500);

      // Check if this reveal is the winner (1st place = last to be revealed)
      if (justRevealed && sorted[0] && justRevealed.player_id === sorted[0].player_id) {
        setShowConfetti(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [revealedCount, revealOrder.length, sorted, revealOrder, onComplete]);

  return (
    <div className="w-full h-screen bg-[#021549] flex flex-col overflow-hidden relative">
      {showConfetti && <ConfettiBurst />}

      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between flex-shrink-0">
        <h2 className="text-[#FAFAF7] font-black italic uppercase text-5xl tracking-wide">
          The Final Stretch
        </h2>
        <span className="text-[#FAFAF7]/60 text-lg font-semibold">
          {isAllRevealed
            ? "Final Results"
            : `${revealedCount} of ${revealOrder.length} revealed...`}
        </span>
      </div>

      {/* Lanes */}
      <div className="flex-1 flex flex-col px-8 gap-2 justify-center">
        <AnimatePresence>
          {sorted.map((entry, index) => {
            const rank = index + 1;
            const color = rankColors[rank] ?? "rgba(255,255,255,0.2)";
            const isRevealed = revealedPlayerIds.has(entry.player_id);
            const isWinner = rank === 1 && isRevealed;
            const isScoreShown = scoreVisible.has(entry.player_id);
            const isTop3 = rank <= 3;

            return (
              <motion.div
                key={entry.player_id}
                initial={isRevealed ? { x: -100, opacity: 0 } : { opacity: 0.3 }}
                animate={
                  isRevealed
                    ? { x: 0, opacity: 1 }
                    : { opacity: 0.3 }
                }
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 20,
                }}
                className="flex items-center rounded-xl px-4 py-3"
                style={{
                  backgroundColor: isRevealed
                    ? `${typeof color === "string" && color.startsWith("#") ? color : "rgba(255,255,255,0.03)"}15`
                    : "rgba(255,255,255,0.03)",
                  boxShadow: isRevealed && isTop3
                    ? `0 0 20px ${color}33`
                    : "none",
                }}
              >
                {/* Rank */}
                <div className="w-16 flex-shrink-0 flex items-center justify-center">
                  <span
                    className="font-extrabold text-2xl"
                    style={{ color: isRevealed ? color : "rgba(255,255,255,0.2)" }}
                  >
                    {rank}
                  </span>
                </div>

                {/* Player name */}
                <div className="w-56 flex-shrink-0">
                  {isRevealed ? (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-[#FAFAF7] font-extrabold uppercase text-lg">
                        {entry.player_name}
                      </span>
                      <p className="text-[#FAFAF7]/40 text-xs truncate">
                        {entry.horse_name}
                      </p>
                    </motion.div>
                  ) : (
                    <span className="text-white/20 font-bold text-lg font-mono">
                      ???
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Winner badge + Quiz Champion */}
                {isWinner && (
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="flex items-center gap-3 mr-4"
                  >
                    <span className="bg-[#FF6B6B] text-white font-extrabold px-4 py-1.5 rounded-xl text-sm uppercase tracking-wider">
                      Winner!
                    </span>
                    <span className="text-[#FFB95F] font-black italic uppercase text-sm tracking-wider">
                      Quiz Champion
                    </span>
                  </motion.div>
                )}

                {/* Score */}
                <div className="w-36 flex-shrink-0 text-right">
                  {isRevealed && isScoreShown ? (
                    <motion.span
                      className="text-[#FAFAF7] font-mono font-bold text-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {entry.score} pts
                    </motion.span>
                  ) : (
                    <span className="text-white/20 font-mono font-bold text-xl">
                      ???
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
