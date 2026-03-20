"use client";

import { useReducedMotion } from "@/lib/useReducedMotion";

interface TimerBarProps {
  timeRemaining: number;
  timeLimit: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export default function TimerBar({
  timeRemaining,
  timeLimit,
  questionNumber,
  totalQuestions,
}: TimerBarProps) {
  const fraction = timeLimit > 0 ? timeRemaining / timeLimit : 0;
  const reduced = useReducedMotion();

  const isUrgent = timeRemaining <= 5;
  const isCritical = timeRemaining <= 2;

  const barColor = isUrgent ? "#FF6B6B" : "#FFB95F";
  const pulseClass = reduced
    ? ""
    : isCritical
    ? "animate-[timer-pulse_0.5s_ease-in-out_infinite]"
    : isUrgent
    ? "animate-[timer-pulse_1s_ease-in-out_infinite]"
    : "";

  return (
    <div className="w-full">
      {/* Labels above bar */}
      <div className="flex justify-between items-center mb-2">
        {questionNumber && totalQuestions ? (
          <span className="label-sm uppercase tracking-widest text-[#45464f] text-xs font-semibold">
            Question {questionNumber} of {totalQuestions}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`flex items-center gap-1.5 font-bold transition-colors duration-300 ${
            isUrgent ? "text-[#FF6B6B] font-extrabold" : "text-[#021549]"
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {timeRemaining}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-2.5 rounded-full bg-[#e2e3e0] overflow-hidden ${pulseClass}`}>
        <div
          className="h-full rounded-full transition-[width,background-color] duration-[900ms,300ms] ease-linear"
          style={{
            width: `${fraction * 100}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Urgency pulse keyframes */}
      <style jsx>{`
        @keyframes timer-pulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.02) scaleX(1.005); }
        }
      `}</style>
    </div>
  );
}
