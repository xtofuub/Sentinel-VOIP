import { useEffect, useRef, useState } from "react"
import { Pause, Play, Volume2 } from "lucide-react"

const formatDuration = (value) => {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export function ActivityAudioPlayer({ label, src }) {
  const audioRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => () => audioRef.current?.pause(), [])

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

  return (
    <div className={`activity-audio${failed ? " is-failed" : ""}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        onError={() => { setFailed(true); setPlaying(false) }}
      />
      <button type="button" onClick={togglePlayback} disabled={failed} aria-label={`${playing ? "Pause" : "Play"} ${label}`}>
        {playing ? <Pause size={14} fill="currentColor" aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
      </button>
      <div className="activity-audio__body">
        <span><Volume2 size={13} aria-hidden="true" />{failed ? "Preview unavailable" : "Recording"}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          disabled={failed || !duration}
          aria-label={`Playback position for ${label}`}
          style={{ "--audio-progress": `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>
      <time>{formatDuration(currentTime)} / {formatDuration(duration)}</time>
    </div>
  )
}
