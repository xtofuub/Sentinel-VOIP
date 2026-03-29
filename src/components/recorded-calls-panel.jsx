import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircleIcon,
  CircleCheckIcon,
  Clock3Icon,
  CopyIcon,
  LoaderIcon,
  PhoneCallIcon,
  RefreshCwIcon,
  Share2Icon,
  XCircleIcon,
  DownloadIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RecordingAudioPlayer } from "@/components/recording-audio-player"
import { cn } from "@/lib/utils"
import { enrichRecordedCallsWithLocalInput, getRecordedCalls } from "@/services/api"

const statusMap = {
  accepted: {
    label: "Accepted",
    icon: CircleCheckIcon,
    tone: "border border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
  },
  declined: {
    label: "Declined",
    icon: XCircleIcon,
    tone: "border border-red-500/35 bg-red-500/15 text-red-300",
  },
  running: {
    label: "Running",
    icon: LoaderIcon,
    tone: "border border-amber-500/35 bg-amber-500/15 text-amber-300",
  },
  queued: {
    label: "Queued",
    icon: Clock3Icon,
    tone: "border border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  },
  pending: {
    label: "Pending",
    icon: Clock3Icon,
    tone: "border border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  },
}

const formatTime = (call) => {
  if (call.timeLabel) {
    return call.timeLabel
  }
  if (call.timestamp) {
    return new Date(call.timestamp * 1000).toLocaleString()
  }
  return "Unknown time"
}

export function RecordedCallsPanel({ uid, countryCode = "fi", refreshToken = 0, panelClassName }) {
  const [calls, setCalls] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState("")

  const runningCount = useMemo(
    () => calls.filter((call) => call.status === "running" || call.status === "queued").length,
    [calls]
  )

  const fetchCalls = useCallback(
    async ({ silent = false } = {}) => {
      const activeAccounts = JSON.parse(localStorage.getItem("activeAccounts") || "[]")
      const uidSeen = new Set()
      const allUids = []
      for (const a of activeAccounts) {
        const taskId = a?.did || a?.uid
        if (!taskId || uidSeen.has(taskId)) continue
        uidSeen.add(taskId)
        allUids.push(a)
      }
      if (uid && !uidSeen.has(uid)) {
        allUids.push({ uid, did: uid, country: countryCode })
      }

      if (allUids.length === 0) {
        setCalls([])
        setError("")
        return
      }

      if (!silent) {
        setIsLoading(true)
      }

      setError("")
      try {
        const results = []
        for (const acc of allUids) {
          const taskUid = acc.did || acc.uid
          const row = await getRecordedCalls(acc.country || countryCode, taskUid).catch(() => [])
          results.push(row)
        }
        let combined = results.flat()
        const seen = new Set()
        combined = combined.filter((c) => {
          if (seen.has(c._id)) return false
          seen.add(c._id)
          return true
        })

        const hiddenCalls = JSON.parse(localStorage.getItem("hiddenCalls") || "[]")
        combined = combined.filter((c) => !hiddenCalls.includes(c._id))
        combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        combined = combined.map((c) => ({ ...c, targetName: "", targetPhone: "" }))
        combined = enrichRecordedCallsWithLocalInput(combined)

        setCalls(combined)
        setLastUpdated(new Date().toLocaleTimeString())
      } catch (fetchError) {
        setError(fetchError?.message || "Could not load recorded calls.")
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [countryCode, uid]
  )

  useEffect(() => {
    void fetchCalls()
  }, [fetchCalls, refreshToken])

  useEffect(() => {
    if (runningCount === 0) {
      return
    }
    const intervalId = setInterval(() => {
      void fetchCalls({ silent: true })
    }, 20000)
    return () => clearInterval(intervalId)
  }, [fetchCalls, runningCount])

  const copyAudioLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Audio link copied")
    } catch {
      toast.error("Could not copy audio link")
    }
  }

  const shareAudio = async (call) => {
    if (!call.url) {
      toast.error("This call has no recording yet.")
      return
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: call.titulo,
          text: "Recorded prank call",
          url: call.url,
        })
      } else {
        await copyAudioLink(call.url)
      }
    } catch {
      toast.error("Share was cancelled or unavailable.")
    }
  }

  return (
    <Card
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-visible shadow-sm",
        panelClassName
      )}>
      <CardHeader className="shrink-0 border-b border-white/5 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-3 text-ms-pure">
              <PhoneCallIcon className="size-4 text-ms-white" />
              Recordings
            </CardTitle>
            <CardDescription className="typography-muted mt-1">
              Running, queued, and finished calls.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 border-white/10 hover:bg-white/5"
            onClick={() => fetchCalls()}
            disabled={isLoading || !uid}>
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-6">
        {runningCount > 0 && (
          <Alert variant="default" className="bg-muted/50">
            <LoaderIcon className="animate-spin text-muted-foreground" />
            <AlertTitle>Call in progress</AlertTitle>
            <AlertDescription>
              {runningCount} call{runningCount > 1 ? "s are" : " is"} running or queued.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Could not load calls</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lastUpdated && (
          <p className="typography-muted">Last updated: {lastUpdated}</p>
        )}

        <div
          className={cn(
            "min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain",
            "max-h-[min(560px,calc(100svh-11rem))] sm:max-h-[min(72vh,calc(100svh-10rem))]"
          )}>
          <div className="space-y-3 pr-1">
            {calls.map((call) => {
              const status = statusMap[call.status] || statusMap.pending
              const StatusIcon = status.icon
              const showRecordingActions = call.isPlayable && call.status === "accepted"

              return (
                <div
                  key={call._id}
                  className="space-y-3 rounded-md border bg-card p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{call.titulo}</p>
                      <p className="typography-muted">
                        {formatTime(call)}
                      </p>
                      {(call.targetName || call.targetPhone) && (
                        <p className="mt-1.5 text-sm leading-snug">
                          {call.targetName ? (
                            <span className="font-medium text-foreground">{call.targetName}</span>
                          ) : null}
                          {call.targetName && call.targetPhone ? (
                            <span className="text-muted-foreground"> · </span>
                          ) : null}
                          {call.targetPhone ? (
                            <span className="tabular-nums text-muted-foreground">{call.targetPhone}</span>
                          ) : null}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`gap-1 px-2 py-0.5 text-xs ${status.tone}`}>
                      <StatusIcon className={`size-3 ${call.status === "running" ? "animate-spin" : ""}`} />
                      {status.label}
                    </Badge>
                  </div>

                  {showRecordingActions ? (
                    <div className="space-y-2.5">
                      <RecordingAudioPlayer src={call.url} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyAudioLink(call.url)}>
                          <CopyIcon className="size-3.5" />
                          Copy link
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={call.url} target="_blank" rel="noopener noreferrer" download>
                            <DownloadIcon className="size-3.5" />
                            Save
                          </a>
                        </Button>
                        <Button size="sm" onClick={() => shareAudio(call)}>
                          <Share2Icon className="size-3.5" />
                          Share
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const hidden = JSON.parse(localStorage.getItem("hiddenCalls") || "[]")
                            hidden.push(call._id)
                            localStorage.setItem("hiddenCalls", JSON.stringify(hidden))
                            setCalls((prev) => prev.filter((c) => c._id !== call._id))
                            toast.success("Call deleted from history")
                          }}>
                          <Trash2Icon className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="typography-muted">
                        {call.status === "declined"
                          ? "Call declined, no recording."
                          : "Recording appears after an accepted call finishes."}
                      </p>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const hidden = JSON.parse(localStorage.getItem("hiddenCalls") || "[]")
                          hidden.push(call._id)
                          localStorage.setItem("hiddenCalls", JSON.stringify(hidden))
                          setCalls((prev) => prev.filter((c) => c._id !== call._id))
                          toast.success("Call deleted from history")
                        }}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && calls.length === 0 && (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`loading-${index}`} className="space-y-3 rounded-md border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            )}

            {!uid && (
              <div className="rounded-md border border-dashed p-6 text-center typography-muted">
                Waiting for UID initialization…
              </div>
            )}

            {!isLoading && uid && calls.length === 0 && !error && (
              <div className="rounded-md border border-dashed p-6 text-center typography-muted">
                No recorded calls yet.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
