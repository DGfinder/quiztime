"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/shared/ui/Button";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";
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
    <main className="flex-1 flex flex-col bg-cream">
      {/* ── Hero ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy px-4 py-16 md:py-24 text-center">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-coral/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-amber/10 blur-3xl" />
        </div>

        <AnimatedContainer className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
              Turn Any Meeting Into{" "}
              <span className="text-coral">a Game Show</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 font-medium max-w-xl mx-auto mb-8">
              Real-time pub quizzes your team will actually look forward to.
              Live scoring, horse race leaderboards, AI questions — no setup needed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="coral"
                size="lg"
                onClick={() => router.push("/host/new")}
                className="w-full sm:w-auto text-lg px-8"
              >
                🎤 Host a Quiz Night
              </Button>
              <button
                onClick={() => {
                  const el = document.getElementById("join-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto text-lg px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-bold hover:bg-white/10 transition-colors"
              >
                🎟️ Join the Game
              </button>
            </div>

            <button
                onClick={() => router.push("/host/dashboard")}
                className="mt-6 text-sm font-bold text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1"
              >
                Host Dashboard →
              </button>
          </motion.div>
        </AnimatedContainer>

        {/* Social proof */}
        <AnimatedContainer delay={0.3} className="relative z-10 mt-10">
          <p className="text-white/40 text-sm font-medium inline-flex items-center gap-2">
            <span className="text-base">🏢</span>
            Built for GSFS Tuesday meetings — and any team that deserves better than boring
          </p>
        </AnimatedContainer>
      </section>

      {/* ── How It Works ─────────────────────── */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <AnimatedContainer className="text-center mb-12">
            <span className="text-coral font-extrabold text-sm uppercase tracking-widest">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy mt-2">
              Three steps to game-show glory
            </h2>
          </AnimatedContainer>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                emoji: "🎤",
                title: "Host creates the quiz",
                desc: "Pick question types, set timers, add images or video. Or let AI generate questions in one click.",
                color: "bg-coral/10 border-coral/20",
                textColor: "text-coral",
              },
              {
                step: "02",
                emoji: "📱",
                title: "Team joins the room",
                desc: "Scan the QR code or type the 4-letter room code on any phone. No app download, no account.",
                color: "bg-navy/5 border-navy/20",
                textColor: "text-navy",
              },
              {
                step: "03",
                emoji: "🏆",
                title: "Compete live",
                desc: "Real-time scoring, a horse race leaderboard everyone can see, and a winner crowned at the end.",
                color: "bg-amber/10 border-amber/20",
                textColor: "text-amber-600",
              },
            ].map((item, i) => (
              <AnimatedContainer key={item.step} delay={i * 0.15}>
                <div className={`rounded-3xl border-2 p-8 h-full ${item.color}`}>
                  <div className="text-4xl mb-4">{item.emoji}</div>
                  <div className={`text-xs font-extrabold uppercase tracking-widest mb-2 ${item.textColor}`}>
                    Step {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">{item.title}</h3>
                  <p className="text-ink/60 leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ────────────────── */}
      <section className="px-4 py-16 bg-cream">
        <div className="max-w-4xl mx-auto">
          <AnimatedContainer className="text-center mb-12">
            <span className="text-coral font-extrabold text-sm uppercase tracking-widest">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy mt-2">
              Everything a great quiz night needs
            </h2>
          </AnimatedContainer>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                emoji: "⚡",
                title: "Real-Time Sync",
                desc: "Questions appear on every phone the instant you advance. Zero lag, zero waiting.",
              },
              {
                emoji: "🏇",
                title: "Horse Race Leaderboard",
                desc: "Watch your team's horses gallop across the screen between rounds. Chaos guaranteed.",
              },
              {
                emoji: "🤖",
                title: "AI-Generated Questions",
                desc: "Out of ideas? Hit the AI button and get quality trivia in seconds on any topic.",
              },
              {
                emoji: "📷",
                title: "QR Code Joining",
                desc: "One scan and players are in. Show the QR code on your screen — done.",
              },
              {
                emoji: "🃏",
                title: "Joker Rounds",
                desc: "Double-point wildcard questions keep the leaderboard shaken up right until the end.",
              },
              {
                emoji: "🎯",
                title: "Six Question Types",
                desc: "Multiple choice, true/false, slider, type-in, image, video, and audio rounds.",
              },
            ].map((feat, i) => (
              <AnimatedContainer key={feat.title} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-6 flex gap-4 items-start shadow-sm border border-navy/5 h-full">
                  <div className="text-3xl flex-shrink-0">{feat.emoji}</div>
                  <div>
                    <h3 className="font-bold text-navy mb-1">{feat.title}</h3>
                    <p className="text-ink/60 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      {/* ── Join / Host CTAs ─────────────────── */}
      <section
        id="join-section"
        className="px-4 py-16 bg-white"
      >
        <div className="max-w-md mx-auto space-y-6">
          <AnimatedContainer className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-navy">Ready to play?</h2>
            <p className="text-ink/50 mt-2">Jump in as a host or grab a seat as a player.</p>
          </AnimatedContainer>

          {/* Host Card */}
          <AnimatedContainer delay={0.1}>
            <div className="bg-navy rounded-3xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-3">🎤</div>
              <h2 className="text-2xl font-bold text-white mb-2">Host a Quiz Night</h2>
              <p className="text-white/50 mb-6 text-sm">
                Create questions, run the show, crown a winner
              </p>
              <Button
                variant="coral"
                size="lg"
                className="w-full"
                onClick={() => router.push("/host/new")}
              >
                Host a Quiz Night
              </Button>
              <button
                  onClick={() => router.push("/host/dashboard")}
                  className="w-full mt-3 text-sm font-bold text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                  Host Dashboard
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </button>
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

          {/* Join Card */}
          <AnimatedContainer delay={0.2}>
            <div className="bg-white rounded-3xl shadow-lg border border-navy/5 p-8 text-center">
              <div className="text-4xl mb-3">🎟️</div>
              <h2 className="text-2xl font-bold text-navy mb-2">Join the Game</h2>
              <p className="text-ink/60 mb-6 text-sm">
                Got a room code? Enter it below and get in the action
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
                  Join the Game
                </Button>
              </form>
            </div>
          </AnimatedContainer>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="py-8 text-center bg-cream border-t border-navy/5">
        <p className="text-ink/30 text-sm">
          No account needed — just create or join 🐎
        </p>
      </footer>
    </main>
  );
}
