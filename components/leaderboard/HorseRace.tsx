"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/types/quiz";
import { getTrackPosition } from "@/lib/suspense";

interface HorseRaceProps {
  entries: LeaderboardEntry[];
  maxScore: number;
  isFinal: boolean;
  scrambledPositions?: Map<string, number>;
  questionProgress?: string;
  suspenseMode?: boolean;
}

const rankColors: Record<number, string> = {
  1: "#FF6B6B",
  2: "#FFB95F",
  3: "#60a5fa",
};

const horseEmojis = ["🏆", "🥈", "🥉", "🐎", "🐎", "🐎"];

export default function HorseRace({
  entries,
  maxScore,
  isFinal,
  scrambledPositions,
  questionProgress,
  suspenseMode,
}: HorseRaceProps) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.score - a.score).slice(0, 6),
    [entries]
  );

  return (
    <div className="w-full h-screen bg-[#021549] text-[#FAFAF7] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between flex-shrink-0">
        <h2 className="font-black italic uppercase text-5xl tracking-wide">
          The Final Stretch
        </h2>
        <div className="text-right">
          {questionProgress && (
            <span className="text-[#FAFAF7]/60 text-lg font-semibold">
              {questionProgress}
            </span>
          )}
        </div>
      </div>

      {/* Lanes */}
      <div className="flex-1 flex flex-col px-4 relative">
        {/* Finish line */}
        <div className="absolute right-16 top-0 bottom-0 flex flex-col items-center z-10">
          <span className="text-2xl">🏁</span>
          <div className="flex-1 border-r-2 border-dashed border-white/30" />
          <span className="text-2xl">🏁</span>
        </div>

        {sorted.map((entry, index) => {
          const rank = index + 1;
          const color = rankColors[rank] ?? "rgba(255,255,255,0.2)";
          const emoji = horseEmojis[index] ?? "🐎";
          const isTop3 = rank <= 3;

          // Use scrambled position if provided, otherwise calculate from score
          const trackLeft = scrambledPositions?.get(entry.player_id)
            ?? getTrackPosition(entry.score, maxScore);

          return (
            <div
              key={entry.player_id}
              className="flex items-center bg-white/5 rounded-r-full"
              style={{ height: "calc((100vh - 80px) / 6)" }}
            >
              {/* Rank + Player name */}
              <div className="w-64 flex-shrink-0 flex items-center gap-3 pl-4">
                <span
                  className="font-extrabold text-3xl"
                  style={{ color }}
                >
                  {rank}
                </span>
                <span className="font-extrabold uppercase text-lg truncate">
                  {entry.player_name}
                </span>
              </div>

              {/* Track */}
              <div className="flex-grow relative mx-2 h-full">
                {/* Character bubble */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  initial={{ left: "0%" }}
                  animate={{ left: `${trackLeft}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                  }}
                >
                  <div className="relative flex items-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-[3px]"
                      style={{
                        borderColor: color,
                        backgroundColor: `${typeof color === "string" && color.startsWith("#") ? color : "rgba(255,255,255,0.1)"}20`,
                        boxShadow: isTop3
                          ? `0 0 20px ${color}33`
                          : "none",
                      }}
                    >
                      {emoji}
                    </div>
                    {/* LEADER badge for 1st place */}
                    {rank === 1 && (
                      <span className="ml-2 bg-[#FF6B6B] text-white text-xs font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">
                        Leader
                      </span>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Score */}
              <div className="w-40 flex-shrink-0 text-right pr-20">
                <span className="font-mono font-bold text-xl">
                  {suspenseMode ? "???" : `${entry.score} pts`}
                </span>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/30 text-lg">
            No racers yet...
          </div>
        )}
      </div>

      {/* ESPN glow styles */}
      <style jsx>{`
        .espn-glow-coral { box-shadow: 0 0 20px rgba(255, 107, 107, 0.2); }
        .espn-glow-amber { box-shadow: 0 0 20px rgba(255, 185, 95, 0.2); }
        .espn-glow-blue { box-shadow: 0 0 20px rgba(96, 165, 250, 0.2); }
      `}</style>
    </div>
  );
}
