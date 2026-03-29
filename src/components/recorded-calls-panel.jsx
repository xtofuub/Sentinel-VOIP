import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { getRecordedCalls } from "@/services/api"
const MotionDiv = motion.div

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

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
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

export function RecordedCallsPanel({ uid, countryCode = "fi", refreshToken = 0 }) {
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
      let allUids = [...activeAccounts]
      if (uid && !allUids.some((a) => a.uid === uid)) {
        allUids.push({ uid, country: countryCode })
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
        const results = await Promise.all(
          allUids.map((acc) => getRecordedCalls(acc.country || countryCode, acc.uid).catch(() => []))
        )
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
    }, 12000)
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
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PhoneCallIcon className="size-5 text-primary" />
              Recorded Calls
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Shows running, accepted, and declined calls.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 text-sm"
            onClick={() => fetchCalls()}
            disabled={isLoading || !uid}>
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {runningCount > 0 && (
          <Alert>
            <LoaderIcon className="animate-spin" />
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
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        )}

        <ScrollArea className="max-h-[560px]">
          <MotionDiv
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-3 pr-3">
            {calls.map((call) => {
              const status = statusMap[call.status] || statusMap.pending
              const StatusIcon = status.icon
              const showRecordingActions = call.isPlayable && call.status === "accepted"

              return (
                <MotionDiv
                  key={call._id}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{call.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(call)} - Dial {call.dial || "-"}
                      </p>
                    </div>
                    <Badge variant="outline" className={`gap-1 px-2.5 py-1 text-sm ${status.tone}`}>
                      <StatusIcon className={`size-3.5 ${call.status === "running" ? "animate-spin" : ""}`} />
                      {status.label}
                    </Badge>
                  </div>

                  {showRecordingActions ? (
                    <div className="space-y-2.5">
                      <audio controls preload="none" src={call.url} className="w-full" />
                      <div className="flex flex-wrap gap-2">
                        <Button className="h-10 rounded-lg px-4" variant="outline" onClick={() => copyAudioLink(call.url)}>
                          <CopyIcon className="size-3.5" />
                          Copy link
                        </Button>
                        <Button className="h-10 rounded-lg px-4" variant="outline" asChild>
                          <a href={call.url} target="_blank" rel="noopener noreferrer" download>
                            <DownloadIcon className="size-3.5" />
                            Save
                          </a>
                        </Button>
                        <Button className="h-10 rounded-lg px-4" onClick={() => shareAudio(call)}>
                          <Share2Icon className="size-3.5" />
                          Share
                        </Button>
                        <Button 
                          className="h-10 rounded-lg px-4" 
                          variant="destructive" 
                          onClick={() => {
                            const hidden = JSON.parse(localStorage.getItem("hiddenCalls") || "[]");
                            hidden.push(call._id);
                            localStorage.setItem("hiddenCalls", JSON.stringify(hidden));
                            setCalls(prev => prev.filter(c => c._id !== call._id));
                            toast.success("Call deleted from history");
                          }}
                        >
                          <Trash2Icon className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {call.status === "declined"
                          ? "Call declined, no recording available."
                          : "Recording appears here after an accepted call finishes."}
                      </p>
                      <Button 
                        size="sm"
                        variant="ghost" 
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          const hidden = JSON.parse(localStorage.getItem("hiddenCalls") || "[]");
                          hidden.push(call._id);
                          localStorage.setItem("hiddenCalls", JSON.stringify(hidden));
                          setCalls(prev => prev.filter(c => c._id !== call._id));
                          toast.success("Call deleted from history");
                        }}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  )}
                </MotionDiv>
              )
            })}

            {isLoading && calls.length === 0 && (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`loading-${index}`} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/5" />
                        <Skeleton className="h-4 w-2/5" />
                      </div>
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
            )}

            {!uid && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Waiting for UID initialization...
              </div>
            )}

            {!isLoading && uid && calls.length === 0 && !error && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No recorded calls yet.
              </div>
            )}
          </MotionDiv>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
