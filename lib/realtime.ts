import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook to subscribe to a Supabase Realtime channel for a room.
 * Uses a handler registry so onBroadcast works even before channel is subscribed.
 */
export function useRoomChannel(roomCode: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, Set<(p: Record<string, unknown>) => void>>>(new Map());

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`);
    channelRef.current = channel;

    // Re-attach any listeners that were registered before channel was created
    listenersRef.current.forEach((_handlers, event) => {
      channel.on('broadcast', { event }, ({ payload }) => {
        listenersRef.current.get(event)?.forEach(h => h(payload as Record<string, unknown>));
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode]);

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      channelRef.current?.send({
        type: "broadcast",
        event,
        payload,
      });
    },
    []
  );

  const onBroadcast = useCallback(
    (event: string, callback: (payload: Record<string, unknown>) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
        // Attach to channel if it already exists
        channelRef.current?.on('broadcast', { event }, ({ payload }) => {
          listenersRef.current.get(event)?.forEach(h => h(payload as Record<string, unknown>));
        });
      }
      listenersRef.current.get(event)!.add(callback);
    },
    []
  );

  return { channel: channelRef, broadcast, onBroadcast };
}

/**
 * Hook to listen for new players joining a room via Postgres changes.
 */
export function usePlayersSubscription(
  roomId: string,
  onPlayerJoin: (player: Record<string, unknown>) => void
) {
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`players:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          onPlayerJoin(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, onPlayerJoin]);
}

/**
 * Hook to listen for answers being submitted.
 */
export function useAnswersSubscription(
  questionId: string,
  onAnswer: (answer: Record<string, unknown>) => void
) {
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  useEffect(() => {
    if (!questionId) return;

    // Fetch any answers already submitted before subscription was set up
    supabase
      .from("qt_answers")
      .select("*")
      .eq("question_id", questionId)
      .then(({ data }) => {
        if (data) data.forEach((row) => onAnswerRef.current(row));
      });

    const channel = supabase
      .channel(`answers:${questionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_answers",
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          onAnswerRef.current(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId]);
}

/**
 * Estimate the server↔client clock offset using a Postgres `server_now()` RPC,
 * so all devices in a room can compute the same remaining time against a shared
 * deadline. We average the offset over a few samples to mute single-ping jitter.
 */
const offsetCache = { value: 0, ready: false };

export function useServerClock() {
  const [offset, setOffset] = useState(offsetCache.value);
  const [ready, setReady] = useState(offsetCache.ready);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const sentAt = Date.now();
        const { data, error } = await supabase.rpc("server_now");
        const receivedAt = Date.now();
        if (error || typeof data !== "number") continue;
        // Assume symmetric latency: server time at midpoint of the round-trip.
        const rttMid = sentAt + (receivedAt - sentAt) / 2;
        samples.push(data - rttMid);
      }
      if (cancelled || samples.length === 0) return;
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)];
      offsetCache.value = median;
      offsetCache.ready = true;
      setOffset(median);
      setReady(true);
    }
    sync();
    const id = setInterval(sync, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const serverNow = useCallback(() => Date.now() + offset, [offset]);
  return { serverNow, ready };
}

/**
 * Animate a countdown that ends at a fixed wall-clock instant (server time).
 * Driven by requestAnimationFrame so it stays smooth and self-corrects against
 * any prior tab throttling or clock drift. Returns whole seconds remaining.
 */
export function useDeadlineCountdown(
  endsAt: number | null,
  serverNow: () => number,
  onComplete?: () => void
) {
  const [remaining, setRemaining] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (endsAt == null) {
      setRemaining(0);
      return;
    }

    let raf = 0;
    const tick = () => {
      const ms = Math.max(0, endsAt - serverNow());
      setRemaining(Math.ceil(ms / 1000));
      if (ms <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [endsAt, serverNow]);

  return remaining;
}
