import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "./Icon";

const AudioPlayer = ({ id, duration = 180, compact = false, autoSeed = 0, color = "var(--accent)" }) => {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    const tick = (now) => {
      const dt = (now - prev) / 1000; prev = now;
      setT((cur) => {
        const next = cur + dt;
        if (next >= duration) { setPlaying(false); return 0; }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, duration]);

  const bars = useMemo(() => {
    const seed = (id || "x").split("").reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, autoSeed || 7);
    let s = seed;
    const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s & 0xffff) / 0xffff; };
    const n = compact ? 36 : 64;
    return Array.from({ length: n }, (_, i) => {
      const env = Math.sin((i / n) * Math.PI) * 0.85 + 0.15;
      return Math.max(0.08, env * (0.4 + next() * 0.6));
    });
  }, [id, compact, autoSeed]);

  const pct = t / duration;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const wrapRef = useRef(null);
  const handleSeek = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setT(p * duration);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} style={{
        width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: 99,
        background: playing ? color : "var(--bg-3)", color: playing ? "var(--on-accent)" : "var(--ink)",
        border: `1px solid ${playing ? color : "var(--line-2)"}`,
        display: "grid", placeItems: "center", flexShrink: 0, transition: "background 150ms ease, color 150ms ease",
      }}>
        <Icon name={playing ? "pause" : "play"} size={compact ? 12 : 14} stroke={2} />
      </button>
      <div ref={wrapRef} onClick={handleSeek} className={playing ? "wave-active" : ""} style={{ flex: 1, height: compact ? 28 : 36, display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}>
        {bars.map((b, i) => (
          <span key={i} style={{
            flex: 1, height: `${b * 100}%`, minHeight: 2, borderRadius: 1.5,
            background: i / bars.length < pct ? color : "oklch(0.34 0.012 30)",
            transition: "background 180ms ease",
            animationDelay: playing ? `${(i % 9) * 70}ms` : undefined,
          }} />
        ))}
      </div>
      <span className="numeric" style={{ fontSize: 11.5, color: "var(--ink-4)", minWidth: 78, textAlign: "right" }}>
        {fmt(t)} <span style={{ color: "var(--ink-5)" }}>/ {fmt(duration)}</span>
      </span>
    </div>
  );
};

export default AudioPlayer;
