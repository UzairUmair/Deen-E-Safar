"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { quranAudio, type AudioTrack, type ReciterId } from "../services/quran/audioService";
import type { Verse } from "../services/quran/types";

/**
 * Recitation controls for one surah. State mirrors the real <audio> element; playback
 * stops when the reader unmounts or the surah changes.
 */
export function useQuranAudio(verses: Verse[] | undefined, options: { reciter: ReciterId; autoAdvance: boolean; onAdvance?: (verse: Verse) => void }) {
  const state = useSyncExternalStore(quranAudio.subscribe, quranAudio.getState, quranAudio.getServerState);
  const { reciter, autoAdvance, onAdvance } = options;
  const surah = verses?.[0]?.surah;

  const play = useCallback(
    (verse: Verse) => {
      quranAudio.play({ surah: verse.surah, ayah: verse.ayah, globalNumber: verse.globalNumber }, reciter);
    },
    [reciter],
  );

  useEffect(() => {
    quranAudio.setOnEnded((finished: AudioTrack) => {
      if (!autoAdvance || !verses) return;
      const next = verses.find((v) => v.surah === finished.surah && v.ayah === finished.ayah + 1);
      if (next) {
        play(next);
        onAdvance?.(next);
      }
    });
    return () => quranAudio.setOnEnded(null);
  }, [verses, autoAdvance, onAdvance, play]);

  // Leaving the reader, or moving to another surah, ends playback.
  useEffect(() => () => quranAudio.stop(), [surah]);

  const current = state.track && state.track.surah === surah ? state.track : null;
  return {
    status: current ? state.status : "idle",
    currentAyah: current?.ayah ?? null,
    error: current ? state.error : null,
    play,
    pause: quranAudio.pause,
    resume: quranAudio.resume,
    stop: quranAudio.stop,
  } as const;
}
