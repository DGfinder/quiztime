"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Question } from "@/types/quiz";

interface AnswerButtonsProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  lockedAnswer?: string | null;
}

const buttonStyles = [
  { bg: "bg-[#1b2b5e]", text: "text-white", label: "A" },
  { bg: "bg-[#FF6B6B]", text: "text-white", label: "B" },
  { bg: "bg-[#FFB95F]", text: "text-[#653e00]", label: "C" },
  { bg: "bg-[#8594CD]", text: "text-white", label: "D" },
];

export default function AnswerButtons({
  question,
  onAnswer,
  disabled,
  lockedAnswer,
}: AnswerButtonsProps) {
  const [sliderValue, setSliderValue] = useState(
    question.slider_min ?? 0
  );
  const [typeInValue, setTypeInValue] = useState("");

  const isLockedIn = lockedAnswer != null;

  if (
    question.type === "multiple_choice" ||
    question.type === "image_question" ||
    question.type === "video_question" ||
    question.type === "audio_question"
  ) {
    const options = question.options ?? [];
    return (
      <div className="w-full space-y-3">
        <div
          className={`grid grid-cols-2 gap-3 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          {options.map((option, index) => {
            const style = buttonStyles[index] ?? buttonStyles[0];
            const isSelected = isLockedIn && lockedAnswer === option;
            const isFaded = isLockedIn && lockedAnswer !== option;
            return (
              <motion.button
                key={index}
                whileTap={isLockedIn ? undefined : { scale: 0.9 }}
                className={`${style.bg} ${style.text} relative rounded-xl p-6 min-h-[80px] font-bold text-lg shadow-md transition-all ${
                  isSelected
                    ? "ring-4 ring-[#1b2b5e] ring-offset-2 ring-offset-cream scale-95"
                    : isFaded
                    ? "opacity-50 scale-95"
                    : "scale-95 active:scale-90"
                }`}
                onClick={() => onAnswer(option)}
                disabled={disabled || isLockedIn}
              >
                <span className="absolute top-2 left-3 text-xs font-bold opacity-60">
                  {style.label}
                </span>
                <span className="flex items-center justify-center w-full h-full text-center">
                  {option}
                </span>
              </motion.button>
            );
          })}
        </div>
        {isLockedIn && <LockedInLabel />}
      </div>
    );
  }

  if (question.type === "true_false") {
    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col gap-4 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          {["True", "False"].map((val) => {
            const isSelected = isLockedIn && lockedAnswer === val;
            const isFaded = isLockedIn && lockedAnswer !== val;
            const bgColor = val === "True" ? "bg-emerald-500" : "bg-red-500";
            return (
              <motion.button
                key={val}
                whileTap={isLockedIn ? undefined : { scale: 0.9 }}
                className={`rounded-xl p-6 min-h-[80px] ${bgColor} text-white font-bold text-2xl shadow-md transition-all ${
                  isSelected
                    ? "ring-4 ring-[#1b2b5e] ring-offset-2 ring-offset-cream scale-95"
                    : isFaded
                    ? "opacity-50 scale-95"
                    : "scale-95 active:scale-90"
                }`}
                onClick={() => onAnswer(val)}
                disabled={disabled || isLockedIn}
              >
                {val}
              </motion.button>
            );
          })}
        </div>
        {isLockedIn && <LockedInLabel />}
      </div>
    );
  }

  if (question.type === "slider") {
    const min = question.slider_min ?? 0;
    const max = question.slider_max ?? 100;

    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col items-center gap-6 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          <div className="text-5xl font-bold text-navy">
            {isLockedIn ? lockedAnswer : sliderValue}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={isLockedIn ? Number(lockedAnswer) : sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            disabled={disabled || isLockedIn}
            className="w-full h-3 rounded-full appearance-none bg-cream-dark accent-coral cursor-pointer"
          />
          <div className="flex justify-between w-full text-sm text-ink/50 font-medium">
            <span>{min}</span>
            <span>{max}</span>
          </div>
          {!isLockedIn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-full rounded-xl p-6 min-h-[80px] bg-coral text-white font-bold text-xl shadow-md active:shadow-sm transition-all"
              onClick={() => onAnswer(String(sliderValue))}
              disabled={disabled}
            >
              Submit
            </motion.button>
          )}
        </div>
        {isLockedIn && <LockedInLabel />}
      </div>
    );
  }

  if (question.type === "type_in") {
    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col gap-4 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          <input
            type="text"
            value={isLockedIn ? lockedAnswer ?? "" : typeInValue}
            onChange={(e) => setTypeInValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled || isLockedIn}
            className={`w-full min-h-[3.5rem] rounded-2xl border-2 bg-white px-5 py-3 text-lg text-ink placeholder:text-ink/40 focus:outline-none transition-colors ${
              isLockedIn
                ? "border-[#1b2b5e] ring-2 ring-[#1b2b5e]/30"
                : "border-navy/20 focus:border-coral"
            }`}
          />
          {!isLockedIn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-full rounded-xl p-6 min-h-[80px] bg-coral text-white font-bold text-xl shadow-md active:shadow-sm transition-all disabled:opacity-40"
              onClick={() => {
                if (typeInValue.trim()) {
                  onAnswer(typeInValue.trim());
                }
              }}
              disabled={disabled || !typeInValue.trim()}
            >
              Submit
            </motion.button>
          )}
        </div>
        {isLockedIn && <LockedInLabel />}
      </div>
    );
  }

  return null;
}

function LockedInLabel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-3"
    >
      <p className="text-navy/70 font-semibold text-sm">
        Answer locked in. Waiting for reveal
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ...
        </motion.span>
      </p>
    </motion.div>
  );
}
