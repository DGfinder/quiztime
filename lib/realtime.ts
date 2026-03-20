import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook to subscribe to a Supabase Realtime channel for a room.
 */
export function useRoomChannel(roomCode: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`);
    channelRef.current = channel;
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      channelRef.current?.on("broadcast", { event }, ({ payload }) => {
        callback(payload as Record<string, unknown>);
      });
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
  useEffect(() => {
    if (!questionId) return;

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
          onAnswer(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId, onAnswer]);
}

/**
 * Hook for the countdown timer, broadcasting ticks via Realtime.
 */
export function useTimer(
  durationSeconds: number,
  isRunning: boolean,
  onTick?: (remaining: number) => void,
  onComplete?: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setTimeRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onCompleteRef.current?.();
          return 0;
        }
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const reset = useCallback(
    (newDuration?: number) => {
      setTimeRemaining(newDuration ?? durationSeconds);
    },
    [durationSeconds]
  );

  return { timeRemaining, reset };
}
