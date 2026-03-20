"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface PointsFlashProps {
  points: number;
  isCorrect: boolean;
  isJoker: boolean;
}

export default function PointsFlash({
  points,
  isCorrect,
  isJoker,
}: PointsFlashProps) {
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    if (!isCorrect || points === 0) {
      setDisplayPoints(0);
      return;
    }

    const duration = 600;
    const steps = 20;
    const increment = points / steps;
    const stepTime = duration / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.round(increment * step);
      if (step >= steps) {
        current = points;
        clearInterval(timer);
      }
      setDisplayPoints(current);
    }, stepTime);

    return () => clearInterval(timer);
  }, [points, isCorrect]);

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center"
    >
      {isCorrect ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 12,
              delay: 0.1,
            }}
            className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-10 h-10 text-white"
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

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold text-navy"
          >
            +{displayPoints}
          </motion.div>

          <span className="text-lg text-ink/60 font-medium">points</span>

          {isJoker && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.4,
              }}
              className="mt-1 px-5 py-2 rounded-2xl bg-amber text-white font-extrabold text-lg shadow-md"
            >
              JOKER x2!
            </motion.div>
          )}
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 12,
              delay: 0.1,
            }}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-ink/40"
          >
            0 points
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
