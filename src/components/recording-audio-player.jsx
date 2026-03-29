import { useCallback, useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

function formatPlaybackTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function RecordingAudioPlayer({ src, className }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const draggingRef = useRef(false)

  useEffect(() => {
    setCurrent(0)
    setPlaying(false)
    setDuration(0)
    draggingRef.current = false
  }, [src])

  useEffect(() => {
    const el = audioRef.current
    if (!el) {
      return
    }

    const onTime = () => {
      if (!draggingRef.current) {
        setCurrent(el.currentTime)
      }
    }
    const onMeta = () => {
      const d = el.duration
      setDuration(Number.isFinite(d) && d > 0 ? d : 0)
    }
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
      el.currentTime = 0
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    el.addEventListener("timeupdate", onTime)
    el.addEventListener("loadedmetadata", onMeta)
    el.addEventListener("durationchange", onMeta)
    el.addEventListener("ended", onEnded)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)

    return () => {
      el.removeEventListener("timeupdate", onTime)
      el.removeEventListener("loadedmetadata", onMeta)
      el.removeEventListener("durationchange", onMeta)
      el.removeEventListener("ended", onEnded)
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
    }
  }, [src])

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) {
      return
    }
    if (playing) {
      el.pause()
    } else {
      void el.play().catch(() => {})
    }
  }, [playing])

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/35 px-3 py-2.5 ring-1 ring-foreground/[0.06]",
        className
      )}>
      <audio ref={audioRef} src={src} preload="metadata" className="sr-only" />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="default"
          className="size-9 shrink-0 rounded-full shadow-sm"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4 translate-x-px" />}
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            className="w-full touch-none"
            onPointerDown={() => {
              draggingRef.current = true
            }}
            onPointerUp={() => {
              draggingRef.current = false
            }}
            onPointerCancel={() => {
              draggingRef.current = false
            }}>
            <Slider
              value={[current]}
              min={0}
              max={duration > 0 ? duration : 1}
              step={duration > 60 ? 0.5 : 0.05}
              disabled={duration <= 0}
              className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-card [&_[data-slot=slider-thumb]]:shadow-md"
              onValueChange={(value) => {
                const next = value[0] ?? 0
                setCurrent(next)
                if (audioRef.current) {
                  audioRef.current.currentTime = next
                }
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[0.7rem] tabular-nums text-muted-foreground sm:text-xs">
            <span>{formatPlaybackTime(current)}</span>
            <span className="text-border">/</span>
            <span className="text-muted-foreground/80">{formatPlaybackTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
