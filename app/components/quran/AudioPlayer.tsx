"use client";
import { Loader2, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AudioStatus } from "../../services/quran/audioService";

type Props = {
  status: AudioStatus;
  currentAyah: number | null;
  ayahCount: number;
  reciterName: string;
  error: string | null;
  /** Start (or restart) a specific ayah. */
  onPlayAyah: (ayah: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** Ayah used by the main button when nothing is playing. */
  startAyah: number;
};

/** Docked recitation controls. Every state shown here comes from the real audio element. */
export function AudioPlayer({ status, currentAyah, ayahCount, reciterName, error, onPlayAyah, onPause, onResume, onStop, startAyah }: Props) {
  const { t } = useTranslation();
  const busy = status === "playing" || status === "loading";
  const label =
    status === "loading" ? t("Loading audio…") : status === "playing" ? t("Playing verse {{n}}", { n: currentAyah }) : status === "paused" ? t("Paused at verse {{n}}", { n: currentAyah }) : status === "error" ? t("Audio problem") : t("Ready to play from verse {{n}}", { n: startAyah });

  const main = () => {
    if (busy) onPause();
    else if (status === "paused") onResume();
    else onPlayAyah(currentAyah ?? startAyah);
  };

  return (
    <section className="audio-player" aria-label={t("Recitation player")} data-status={status}>
      <div className="audio-buttons">
        <button type="button" className="icon-button" aria-label={t("Previous verse")} disabled={currentAyah === null || currentAyah <= 1} onClick={() => currentAyah && onPlayAyah(currentAyah - 1)}>
          <SkipBack size={18} aria-hidden="true" />
        </button>
        <button type="button" className="audio-main" aria-label={busy ? t("Pause recitation") : status === "paused" ? t("Resume recitation") : t("Play recitation")} onClick={main}>
          {status === "loading" ? <Loader2 size={22} className="spin" aria-hidden="true" /> : busy ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
        </button>
        <button type="button" className="icon-button" aria-label={t("Next verse")} disabled={currentAyah === null || currentAyah >= ayahCount} onClick={() => currentAyah && onPlayAyah(currentAyah + 1)}>
          <SkipForward size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" aria-label={t("Stop recitation")} disabled={status === "idle"} onClick={onStop}>
          <Square size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="audio-info">
        <strong aria-live="polite">{label}</strong>
        <small>
          {t("Reciter")}: {t(reciterName)}
        </small>
        {error && (
          <p className="audio-error" role="alert">
            {t(error)}
          </p>
        )}
      </div>
    </section>
  );
}
