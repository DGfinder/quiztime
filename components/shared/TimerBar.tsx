"use client";

import { motion } from "framer-motion";

interface TimerBarProps {
  timeRemaining: number;
  timeLimit: number;
}

export default function TimerBar({ timeRemaining, timeLimit }: TimerBarProps) {
  const fraction = timeLimit > 0 ? timeRemaining / timeLimit : 0;
  const isLow = fraction < 0.25;

  return (
    <div className="w-full h-3 bg-cream-dark rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${isLow ? "bg-coral" : "bg-navy"}`}
        initial={false}
        animate={{ width: `${fraction * 100}%` }}
        transition={{ duration: 0.9, ease: "linear" }}
      />
    </div>
  );
}
