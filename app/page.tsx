"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/shared/Button";
import AnimatedContainer from "@/components/shared/AnimatedContainer";
import { hasHostId } from "@/lib/host";

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isReturningHost, setIsReturningHost] = useState(false);

  useEffect(() => {
    setIsReturningHost(hasHostId());
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length >= 4) {
      router.push(`/play/${code}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <AnimatedContainer className="text-center mb-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-navy mb-2">
            🎉 QuizTime
          </h1>
          <p className="text-xl md:text-2xl text-ink/70 font-medium">
            Real-time pub quizzes for your team
          </p>
        </motion.div>
      </AnimatedContainer>

      <div className="w-full max-w-md space-y-6">
        {/* Host CTA */}
        <AnimatedContainer delay={0.2}>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-navy mb-2">Host a Quiz</h2>
            <p className="text-ink/60 mb-6">
              Create questions, run the show, crown a winner
            </p>
            <Button
              variant="coral"
              size="lg"
              className="w-full"
              onClick={() => router.push("/host/new")}
            >
              Start a Quiz
            </Button>
            {isReturningHost && (
              <button
                onClick={() => router.push("/host/dashboard")}
                className="w-full mt-3 text-sm font-bold text-primary hover:text-primary-container transition-colors flex items-center justify-center gap-1"
              >
                Host Dashboard
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            )}
          </div>
        </AnimatedContainer>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="text-ink/40 font-medium text-sm uppercase tracking-wide">
            or
          </span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        {/* Join */}
        <AnimatedContainer delay={0.4}>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-navy mb-2">Join a Quiz</h2>
            <p className="text-ink/60 mb-6">
              Enter the room code from your host
            </p>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="w-full text-center text-2xl font-bold tracking-[0.3em] px-6 py-4 rounded-2xl border-2 border-ink/10 focus:border-navy focus:outline-none bg-cream placeholder:text-ink/20"
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                type="submit"
                disabled={roomCode.trim().length < 4}
              >
                Join Game
              </Button>
            </form>
          </div>
        </AnimatedContainer>
      </div>

      <AnimatedContainer delay={0.6} className="mt-12 text-center">
        <p className="text-ink/30 text-sm">
          No account needed — just create or join 🐎
        </p>
      </AnimatedContainer>
    </main>
  );
}
