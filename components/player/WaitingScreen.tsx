"use client";

import { motion } from "framer-motion";

interface WaitingScreenProps {
  message: string;
  playerName: string;
  horseName: string;
}

export default function WaitingScreen({
  message,
  playerName,
  horseName,
}: WaitingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-6xl"
      >
        🐎
      </motion.div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold text-navy">{horseName}</span>
        <span className="text-sm text-ink/50">ridden by</span>
        <span className="text-base font-semibold text-ink">{playerName}</span>
      </div>

      <div className="flex items-center gap-1 text-lg text-ink/70 font-medium">
        <span>{message}</span>
        <span className="inline-flex w-6">
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          >
            .
          </motion.span>
        </span>
      </div>
    </div>
  );
}
