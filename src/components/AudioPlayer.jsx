import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "./Icon";

const AudioPlayer = ({
  id,
  src = "",
  duration = 180,
  compact = false,
  autoSeed = 0,
  color = "var(--accent)",
  emptyLabel = "Audio unavailable",
}) => {
  const audioRef = useRef(null);
  const raf = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playingSrc, setPlayingSrc] = useState("");
  const [t, setT] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(duration);
  const [loadError, setLoadError] = useState({ src: "", message: "" });

  const activeError = loadError.src === src ? loadError.message : "";
  const canPlay = Boolean(src) && !activeError;
  const isPlaying = canPlay && playing && playingSrc === src;
  const activeDuration = Math.max(1, mediaDuration || duration || 1);
  const displayTime = playingSrc === src ? t : 0;

  useEffect(() => {
    if (!isPlaying || !audioRef.current) return undefined;

    const tick = () => {
      setT(audioRef.current?.currentTime || 0);
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [isPlaying]);

  const bars = useMemo(() => {
    const seedInput = src || id || "x";
    const seed = seedInput.split("").reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, autoSeed || 7);
    const next = (index) => {
      const x = Math.sin((seed + index * 37) * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const n = compact ? 36 : 64;
    return Array.from({ length: n }, (_, i) => {
      const env = Math.sin((i / n) * Math.PI) * 0.85 + 0.15;
      return Math.max(0.08, env * (0.4 + next(i) * 0.6));
    });
  }, [id, src, compact, autoSeed]);

  const pct = Math.max(0, Math.min(1, displayTime / activeDuration));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const togglePlayback = async () => {
    if (!canPlay || !audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
      setPlayingSrc(src);
    } catch {
      setPlaying(false);
      setLoadError({ src, message: "Browser could not play this audio source." });
    }
  };

  const handleSeek = (e) => {
    if (!canPlay || !audioRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = p * activeDuration;
    audioRef.current.currentTime = nextTime;
    setPlayingSrc(src);
    setT(nextTime);
  };

  return (
    <div className={`audio-player${canPlay ? "" : " audio-player-disabled"}`}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (Number.isFinite(nextDuration) && nextDuration > 0) setMediaDuration(nextDuration);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPlayingSrc(""); setT(0); }}
          onError={() => {
            setPlaying(false);
            setPlayingSrc("");
            setLoadError({ src, message: "Audio source could not be loaded." });
          }}
        />
      )}

      <button
        type="button"
        onClick={togglePlayback}
        disabled={!canPlay}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        title={activeError || (!src ? emptyLabel : undefined)}
        className="audio-player-button"
        style={{
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          background: isPlaying ? color : "var(--bg-3)",
          color: isPlaying ? "var(--on-accent)" : "var(--ink)",
          borderColor: isPlaying ? color : "var(--line-2)",
        }}
      >
        <Icon name={isPlaying ? "pause" : "play"} size={compact ? 12 : 14} stroke={2} />
      </button>

      <div
        ref={wrapRef}
        onClick={handleSeek}
        className={isPlaying ? "audio-wave wave-active" : "audio-wave"}
        style={{ height: compact ? 28 : 36, cursor: canPlay ? "pointer" : "default" }}
        aria-hidden="true"
      >
        {bars.map((bar, i) => (
          <span
            key={i}
            style={{
              height: `${bar * 100}%`,
              background: canPlay && i / bars.length < pct ? color : "oklch(0.34 0.012 30)",
              opacity: canPlay ? 1 : 0.28,
              animationDelay: isPlaying ? `${(i % 9) * 70}ms` : undefined,
            }}
          />
        ))}
      </div>

      <span className="numeric audio-player-time">
        {canPlay ? (
          <>
            {fmt(displayTime)} <span style={{ color: "var(--ink-5)" }}>/ {fmt(activeDuration)}</span>
          </>
        ) : (
          <span style={{ color: activeError ? "var(--bad)" : "var(--ink-5)" }}>{activeError || emptyLabel}</span>
        )}
      </span>
    </div>
  );
};

export default AudioPlayer;
