import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Pause, Play, Volume2 } from "@/components/icons"
import "./AudioPlayer.css"

const VIEWBOX_WIDTH = 1000
const VIEWBOX_MIDDLE = 50
const VIEWBOX_AMPLITUDE = 43

const formatDuration = (value) => {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

const buildWaveformPath = (peaks) => {
  if (!peaks?.length) return ""

  const step = VIEWBOX_WIDTH / Math.max(1, peaks.length - 1)
  const top = peaks.map((peak, index) => {
    const x = index * step
    const y = VIEWBOX_MIDDLE - peak * VIEWBOX_AMPLITUDE
    return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
  })
  const bottom = [...peaks].reverse().map((peak, reversedIndex) => {
    const index = peaks.length - 1 - reversedIndex
    const x = index * step
    const y = VIEWBOX_MIDDLE + peak * VIEWBOX_AMPLITUDE
    return `L${x.toFixed(2)} ${y.toFixed(2)}`
  })

  return `${top.join(" ")} ${bottom.join(" ")} Z`
}

const readAudioPeaks = async (src, count, signal) => {
  const response = await fetch(src, { signal })
  if (!response.ok) throw new Error(`Audio request failed with ${response.status}`)

  const data = await response.arrayBuffer()
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) throw new Error("Audio analysis is not supported")

  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(data.slice(0))
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index))
    const blockSize = Math.max(1, Math.floor(buffer.length / count))
    const peaks = []

    for (let block = 0; block < count; block += 1) {
      const start = block * blockSize
      const end = Math.min(buffer.length, start + blockSize)
      const sampleStep = Math.max(1, Math.floor((end - start) / 180))
      let peak = 0

      for (let sample = start; sample < end; sample += sampleStep) {
        for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample] || 0))
      }
      peaks.push(peak)
    }

    const strongestPeak = Math.max(...peaks, 0.001)
    return peaks.map((peak, index) => {
      const previous = peaks[Math.max(0, index - 1)]
      const next = peaks[Math.min(peaks.length - 1, index + 1)]
      const smoothed = peak * 0.62 + previous * 0.19 + next * 0.19
      return Math.max(0.035, Math.min(1, smoothed / strongestPeak))
    })
  } finally {
    void context.close()
  }
}

export function AudioPlayer({ label, src, variant = "compact" }) {
  const audioRef = useRef(null)
  const clipId = `audio-progress-${useId().replace(/:/g, "")}`
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [peaks, setPeaks] = useState([])
  const [waveformState, setWaveformState] = useState("loading")

  useEffect(() => {
    const audio = audioRef.current
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setFailed(false)
    setPeaks([])
    setWaveformState("loading")
    audio?.pause()

    const controller = new AbortController()
    if (variant !== "detail") {
      setWaveformState("unavailable")
      return () => audio?.pause()
    }

    readAudioPeaks(src, 128, controller.signal)
      .then((nextPeaks) => {
        setPeaks(nextPeaks)
        setWaveformState("ready")
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setWaveformState("unavailable")
      })

    return () => {
      controller.abort()
      audio?.pause()
    }
  }, [src, variant])

  const waveformPath = useMemo(() => buildWaveformPath(peaks), [peaks])
  const progress = duration ? Math.min(1, currentTime / duration) : 0

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio || failed) return

    if (playing) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch {
      setFailed(true)
      setPlaying(false)
    }
  }

  const seek = (event) => {
    const nextTime = Number(event.target.value)
    if (!audioRef.current || !Number.isFinite(nextTime)) return
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const stateLabel = failed
    ? "Audio unavailable"
    : playing
      ? "Playing recording"
      : waveformState === "loading"
        ? "Reading audio"
        : "Recording ready"

  return (
    <div className={`audio-player audio-player--${variant}${failed ? " is-failed" : ""}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onCanPlay={() => setFailed(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        onError={() => { setFailed(true); setPlaying(false) }}
      />

      <button className="audio-player__toggle" type="button" onClick={togglePlayback} disabled={failed} aria-label={`${playing ? "Pause" : "Play"} ${label}`}>
        {playing ? <Pause size={variant === "detail" ? 18 : 14} fill="currentColor" aria-hidden="true" /> : <Play size={variant === "detail" ? 18 : 14} fill="currentColor" aria-hidden="true" />}
      </button>

      <div className="audio-player__body">
        <div className={`audio-player__timeline is-${waveformState}`}>
          <svg viewBox={`0 0 ${VIEWBOX_WIDTH} 100`} preserveAspectRatio="none" aria-hidden="true">
            {waveformPath ? (
              <>
                <path className="audio-player__wave audio-player__wave--base" d={waveformPath} />
                <clipPath id={clipId}>
                  <rect width={VIEWBOX_WIDTH * progress} height="100" />
                </clipPath>
                <path className="audio-player__wave audio-player__wave--played" d={waveformPath} clipPath={`url(#${clipId})`} />
              </>
            ) : (
              <>
                <line className="audio-player__fallback audio-player__fallback--base" x1="0" x2={VIEWBOX_WIDTH} y1={VIEWBOX_MIDDLE} y2={VIEWBOX_MIDDLE} />
                <line className="audio-player__fallback audio-player__fallback--played" x1="0" x2={VIEWBOX_WIDTH * progress} y1={VIEWBOX_MIDDLE} y2={VIEWBOX_MIDDLE} />
              </>
            )}
          </svg>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            disabled={failed || !duration}
            aria-label={`Playback position for ${label}`}
          />
        </div>

        <div className="audio-player__meta">
          <span><Volume2 size={13} aria-hidden="true" />{stateLabel}</span>
          <time>{formatDuration(currentTime)} / {formatDuration(duration)}</time>
        </div>
      </div>
    </div>
  )
}
