import { useEffect, useMemo, useState } from "react"
import { FileTextIcon, LoaderIcon, PhoneCallIcon, PlayIcon, PauseIcon, Volume2Icon } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

import { RecordedCallsPanel } from "@/components/recorded-calls-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ShaderBackground from "@/components/ui/shader-background"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import * as api from "@/services/api"

const MotionDiv = motion.div

const toTaskTimestamp = () => {
  return new Date().toISOString().replace(/\.\d+Z$/, "").replace("T", " ")
}

const formatLogValue = (value) => {
  if (value === null || value === undefined) {
    return "null"
  }
  if (typeof value === "string") {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const maskPhoneInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 15)
  if (!digits) {
    return ""
  }

  const country = digits.slice(0, 3)
  const rest = digits.slice(3).match(/.{1,3}/g) || []
  return `+${country}${rest.length ? ` ${rest.join(" ")}` : ""}`
}

const normalizePhoneForApi = (value) => {
  const digits = value.replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

const buildCurlFromLog = (log) => {
  const endpoint = `https://master.appha.es/lua/bromapp/user/${log.path}`
  const payload = JSON.stringify(log.request ?? {})
  const escapedPayload = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `curl.exe -X POST "${endpoint}" -H "Content-Type: application/json" -d "${escapedPayload}"`
}

function App() {
  const [did, setDid] = useState("")
  const [uid, setUid] = useState("")
  const [baseCountry, setBaseCountry] = useState("fi")
  const [languages, setLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [pranks, setPranks] = useState([])
  const [selectedPrankId, setSelectedPrankId] = useState("")
  const [targetName, setTargetName] = useState("")
  const [targetPhone, setTargetPhone] = useState("")
  const [statusText, setStatusText] = useState("Initializing")
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoadingPranks, setIsLoadingPranks] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [recordingsRefreshToken, setRecordingsRefreshToken] = useState(0)

  const [isLogsOpen, setIsLogsOpen] = useState(false)
  const [apiLogs, setApiLogs] = useState([])
  const [logFilter, setLogFilter] = useState("all")
  const [playingId, setPlayingId] = useState(null)
  const [currentAudio, setCurrentAudio] = useState(null)

  const selectedPrank = useMemo(
    () => pranks.find((prank) => prank._id === selectedPrankId) ?? null,
    [pranks, selectedPrankId]
  )

  const phoneDigits = useMemo(() => targetPhone.replace(/\D/g, ""), [targetPhone])
  const phoneError = useMemo(() => {
    if (!targetPhone.trim()) {
      return ""
    }
    if (phoneDigits.length < 8) {
      return "Phone number is too short."
    }
    if (phoneDigits.length > 15) {
      return "Phone number is too long."
    }
    return ""
  }, [phoneDigits])

  const handlePlayToggle = (e, prank) => {
    e.preventDefault()
    e.stopPropagation()

    if (playingId === prank._id) {
      if (currentAudio) {
        currentAudio.pause()
      }
      setPlayingId(null)
    } else {
      if (currentAudio) {
        currentAudio.pause()
      }

      const audio = new Audio(prank.example)
      audio.play()
      audio.onended = () => setPlayingId(null)

      setCurrentAudio(audio)
      setPlayingId(prank._id)
    }
  }

  const filteredApiLogs = useMemo(() => {
    if (logFilter === "errors") {
      return apiLogs.filter((log) => !log.ok)
    }
    if (logFilter === "launch") {
      return apiLogs.filter((log) => String(log.path).includes("create_task"))
    }
    if (logFilter === "recordings") {
      return apiLogs.filter((log) => String(log.path).includes("mis_bromas"))
    }
    return apiLogs
  }, [apiLogs, logFilter])

  useEffect(() => {
    document.documentElement.classList.add("dark")
    document.body.classList.add("bg-background")
    return () => {
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("bg-background")
    }
  }, [])

  useEffect(() => {
    setApiLogs(api.getApiLogs())
    const unsubscribe = api.subscribeApiLogs(setApiLogs)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true)
      try {
        let currentDid = localStorage.getItem("did")
        let currentUid = localStorage.getItem("uid")
        const storedCountry = (localStorage.getItem("baseCountry") ?? "fi").toLowerCase()
        setBaseCountry(storedCountry)

        let resolvedUid = currentUid
        let needsNewAccount = true

        if (currentDid && currentUid) {
          setStatusText("Checking account status")
          try {
            const identityResponse = await api.syncIdentity(currentDid, currentUid)
            const resolved = api.resolveUid(identityResponse, currentUid)
            
            // Try to extract credits
            const userObj = identityResponse?.user_info || identityResponse?.userInfo || identityResponse?.user || identityResponse || {}
            const credits = parseInt(userObj.tcreditos ?? userObj.creditos ?? userObj.credits ?? 0, 10)
            
            if (credits >= 1) {
              needsNewAccount = false
              resolvedUid = resolved
              setDid(currentDid)
              setUid(resolvedUid)
              localStorage.setItem("uid", resolvedUid)
              localStorage.setItem("baseCountry", storedCountry)
            }
          } catch (e) {
            // Error connecting or syncing, will create new account as fallback
          }
        }

        if (needsNewAccount) {
          currentDid = api.generateId()
          localStorage.setItem("did", currentDid)
          setDid(currentDid)

          setStatusText("Creating account")
          const createResponse = await api.createAccount(currentDid, storedCountry)
          const createdUid = currentDid // Force UID to match DID

          setStatusText("Syncing identity")
          const identityResponse = await api.syncIdentity(currentDid, createdUid)
          const syncedUid = currentDid

          resolvedUid = syncedUid
          setUid(syncedUid)
          localStorage.setItem("uid", syncedUid)
          localStorage.setItem("baseCountry", storedCountry)
        }

        setStatusText("Loading languages")
        const languageList = await api.getDialplanList(currentDid)
        setLanguages(languageList)

        const savedLanguage = (localStorage.getItem("selectedLanguage") ?? "").toLowerCase()
        const fallbackLanguage = languageList.find((item) => item._id === "fi")?._id ?? languageList[0]?._id ?? ""
        const initialLanguage = languageList.some((item) => item._id === savedLanguage)
          ? savedLanguage
          : fallbackLanguage

        if (!initialLanguage) {
          throw new Error("No languages available.")
        }

        setSelectedLanguage(initialLanguage)
        localStorage.setItem("selectedLanguage", initialLanguage)

        setStatusText("Loading pranks")
        const prankList = await api.getPranks(storedCountry, resolvedUid, initialLanguage)
        setPranks(prankList)
        if (prankList.length > 0) {
          setSelectedPrankId(prankList[0]._id)
        }

        setStatusText("Ready")
      } catch (error) {
        const message = error?.message || "Initialization failed"
        setStatusText(message)
        toast.error(message)
      } finally {
        setIsInitializing(false)
      }
    }

    void initialize()
  }, [])

  const refreshPranksByLanguage = async (languageCode) => {
    if (!uid || !languageCode) {
      return
    }
    setIsLoadingPranks(true)
    try {
      setStatusText(`Loading ${languageCode.toUpperCase()} pranks`)
      const prankList = await api.getPranks(baseCountry, uid, languageCode)
      setPranks(prankList)
      setSelectedPrankId(prankList[0]?._id ?? "")
      setStatusText("Ready")
    } catch (error) {
      const message = error?.message || "Could not load prank list"
      setStatusText(message)
      toast.error(message)
    } finally {
      setIsLoadingPranks(false)
    }
  }

  const handleLanguageChange = async (languageCode) => {
    setSelectedLanguage(languageCode)
    localStorage.setItem("selectedLanguage", languageCode)
    await refreshPranksByLanguage(languageCode)
  }

  const handleLaunchCall = async () => {
    if (!selectedPrank || !targetName.trim() || !targetPhone.trim() || !uid || phoneError) {
      return
    }

    setIsLaunching(true)
    setStatusText("Launching call")
    try {
      const timestamp = toTaskTimestamp()
      const payload = {
        _id: api.generateTaskId(),
        c: selectedLanguage || baseCountry,
        dial: selectedPrank._id,
        dst: normalizePhoneForApi(targetPhone),
        f: timestamp,
        nombre: targetName.trim(),
        real_f: timestamp,
        titulo: selectedPrank.titulo,
        uid,
      }

      const response = await api.launchPrank(payload)
      if (response?.res === "OK") {
        setStatusText("Call queued")
        toast.success("Call queued successfully")
        setRecordingsRefreshToken((prev) => prev + 1)
      } else {
        const message = response?.msg || "Call launch failed"
        setStatusText(message)
        toast.error(message)
      }
    } catch (error) {
      const message = error?.message || "Call launch failed"
      setStatusText(message)
      toast.error(message)
    } finally {
      setIsLaunching(false)
    }
  }

  const copyLogCurl = async (log) => {
    try {
      await navigator.clipboard.writeText(buildCurlFromLog(log))
      toast.success("cURL copied")
    } catch {
      toast.error("Could not copy cURL")
    }
  }

  const canLaunch =
    !isInitializing &&
    !isLaunching &&
    !isLoadingPranks &&
    Boolean(uid) &&
    Boolean(selectedPrankId) &&
    Boolean(targetName.trim()) &&
    Boolean(targetPhone.trim()) &&
    !phoneError

  return (
    <div className="dark relative min-h-svh overflow-hidden bg-black font-sans text-foreground antialiased selection:bg-primary/30">
      <ShaderBackground />
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-6 md:px-6 md:py-10">
        <div className="grid w-full gap-6 xl:grid-cols-2">
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
            className="xl:sticky xl:top-6 xl:self-start">
            <Card className="rounded-2xl border border-primary/25 bg-card/80 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex flex-col items-center gap-2 text-center text-2xl font-bold tracking-tight">
                  <PhoneCallIcon className="size-6 text-primary" />
                  Launch Call
                </CardTitle>
                <CardDescription className="text-center text-sm font-medium text-muted-foreground md:text-base">
                  Fill in number, name, language, and prank. Then start the call.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MotionDiv
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.1 }}
                  className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="target-name" className="text-sm font-medium">Name</Label>
                    <Input
                      id="target-name"
                      placeholder="Target name"
                      className="h-12 rounded-xl border-white/5 bg-zinc-900/50 px-4 text-base transition-all focus:border-zinc-500/50 focus:ring-0"
                      value={targetName}
                      onChange={(event) => setTargetName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-phone" className="text-sm font-medium">Phone Number</Label>
                    <Input
                      id="target-phone"
                      placeholder="+358 401 234 567"
                      className="h-12 rounded-xl border-white/5 bg-zinc-900/50 px-4 text-base transition-all focus:border-zinc-500/50 focus:ring-0"
                      value={targetPhone}
                      onChange={(event) => setTargetPhone(maskPhoneInput(event.target.value))}
                    />
                    <p className={`text-xs ${phoneError ? "text-destructive" : "text-muted-foreground"}`}>
                      {phoneError || "Include country code. Example: +358 401 234 567"}
                    </p>
                  </div>
                </MotionDiv>

                <MotionDiv
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.16 }}
                  className="space-y-3">
                  <Label className="text-sm font-medium">Language</Label>
                  {isInitializing ? (
                    <Skeleton className="h-14 w-full rounded-xl" />
                  ) : (
                    <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={isInitializing}>
                      <SelectTrigger className="h-12 rounded-xl border-white/5 bg-zinc-900/50 px-4 text-base transition-all focus:border-zinc-500/50 focus:ring-0">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language._id} value={language._id} className="py-2.5 text-sm">
                            {language.tname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </MotionDiv>

                <MotionDiv
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.2 }}
                  className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-sm font-medium">Pranks</Label>
                    <p className="text-xs text-muted-foreground transition-all">
                      {selectedPrank ? selectedPrank.titulo : "Select one"}
                    </p>
                  </div>
                  <ScrollArea className="h-[360px] rounded-xl border border-border/80 bg-muted/20 p-3">
                    {isLoadingPranks || isInitializing ? (
                      <div className="grid gap-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-xl border border-border/60 bg-card/50 p-3">
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="mt-3 h-5 w-2/3" />
                            <Skeleton className="mt-2 h-4 w-full" />
                            <Skeleton className="mt-1 h-4 w-4/5" />
                            <Skeleton className="mt-3 h-10 w-full rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup
                        value={selectedPrankId}
                        onValueChange={setSelectedPrankId}
                        className="grid gap-2">
                        {pranks.map((prank) => {
                          const prankImage = prank.image_url || prank.pic || ""
                          const prankPreview = prank.example || ""
                          const isSelected = prank._id === selectedPrankId

                          return (
                            <label
                              key={prank._id}
                              className={`relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-xl border p-2.5 transition-all duration-200 hover:bg-zinc-800/20 ${
                                isSelected
                                  ? "border-zinc-500/60 bg-zinc-800/40 shadow-[0_4px_20px_-5px_rgba(255,255,255,0.08)]"
                                  : "border-white/5 bg-transparent opacity-80 hover:opacity-100"
                              }`}>
                              <RadioGroupItem value={prank._id} id={prank._id} className="sr-only" />

                              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white/5 shadow-sm">
                                {prankImage ? (
                                  <img
                                    src={prankImage}
                                    alt={prank.titulo}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center bg-zinc-800">
                                    <Volume2Icon className="size-5 text-zinc-500" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <p className={`truncate text-sm font-medium tracking-tight transition-colors ${isSelected ? "text-white" : "text-zinc-300"}`}>
                                  {prank.titulo}
                                </p>
                                <p className="line-clamp-1 text-xs leading-relaxed text-zinc-500">
                                  {prank.desc || "Interactive scenario"}
                                </p>
                              </div>

                              {prankPreview && (
                                <button
                                  type="button"
                                  onClick={(e) => handlePlayToggle(e, prank)}
                                  className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90 ${
                                    playingId === prank._id
                                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                  }`}>
                                  {playingId === prank._id ? (
                                    <PauseIcon className="size-4 fill-current" />
                                  ) : (
                                    <PlayIcon className="size-4 fill-current ml-0.5" />
                                  )}
                                </button>
                              )}
                            </label>
                          )
                        })}
                      </RadioGroup>
                    )}
                  </ScrollArea>
                </MotionDiv>

                <MotionDiv
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.24 }}
                  className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Badge variant="secondary" className="px-4 py-1.5 text-sm transition-all duration-200">
                      {statusText}
                    </Badge>
                    {(isInitializing || isLoadingPranks || isLaunching) && (
                      <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-xl border-white/5 bg-zinc-900/50 px-5 text-base transition-all hover:bg-zinc-800 sm:w-auto"
                      onClick={() => setIsLogsOpen(true)}>
                      <FileTextIcon className="size-4 mr-2" />
                      View Logs
                    </Button>
                    <Button 
                      className="h-12 w-full rounded-xl bg-white px-10 text-base font-semibold shadow-lg text-black transition-all hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-xl sm:w-auto" 
                      onClick={handleLaunchCall} 
                      disabled={!canLaunch}>
                      {isLaunching ? "Launching..." : "Start Call"}
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground/60">
                    DID: {did ? `${did.slice(0, 12)}...` : "-"} - UID: {uid ? `${uid.slice(0, 16)}...` : "-"}
                  </p>
                </MotionDiv>
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14, ease: "easeOut" }}>
            <RecordedCallsPanel
              uid={uid}
              countryCode={baseCountry}
              refreshToken={recordingsRefreshToken}
            />
          </MotionDiv>
        </div>
      </MotionDiv>

      <Sheet open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <SheetContent side="right" className="w-full border-l border-border/80 sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>API Logs</SheetTitle>
            <SheetDescription>
              Request and response history for calls, prank loading, identity sync, and recordings.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{filteredApiLogs.length} entries</p>
            <div className="flex items-center gap-2">
              <Button
                variant={logFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogFilter("all")}>
                All
              </Button>
              <Button
                variant={logFilter === "errors" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogFilter("errors")}>
                Errors
              </Button>
              <Button
                variant={logFilter === "launch" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogFilter("launch")}>
                Launch
              </Button>
              <Button
                variant={logFilter === "recordings" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogFilter("recordings")}>
                Recordings
              </Button>
              <Button variant="outline" size="sm" onClick={api.clearApiLogs} disabled={apiLogs.length === 0}>
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="mt-4 h-[calc(100svh-12.5rem)] pr-2">
            <div className="space-y-3 pb-4">
              {filteredApiLogs.map((log) => (
                <div key={log.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-primary">{log.path}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.ok ? "secondary" : "destructive"}>
                        {log.ok ? "OK" : "ERROR"}
                      </Badge>
                      <Badge variant="outline">
                        {log.status || "NET"} - {log.durationMs ?? 0}ms
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.ts).toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => copyLogCurl(log)}>
                      Copy as cURL
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Request</p>
                    <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
{formatLogValue(log.request)}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">{log.ok ? "Response" : "Error"}</p>
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
{formatLogValue(log.ok ? log.response : log.error || log.response)}
                    </pre>
                  </div>
                </div>
              ))}

              {filteredApiLogs.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No logs match this filter yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Toaster richColors closeButton />
    </div>
  )
}

export default App
