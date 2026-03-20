"use client";

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
        <span className="flex items-center gap-1.5 font-bold text-[#021549]">
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
      <div className="w-full h-2.5 rounded-full bg-[#e2e3e0] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FFB95F]"
          style={{
            width: `${fraction * 100}%`,
            transition: "width 0.9s linear",
          }}
        />
      </div>
    </div>
  );
}
