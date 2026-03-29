import { useEffect, useMemo, useState } from "react"
import {
  CopyIcon,
  FileTextIcon,
  LoaderIcon,
  PhoneCallIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { RecordedCallsPanel } from "@/components/recorded-calls-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import * as api from "@/services/api"

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
  return `+${digits}`
}

const normalizePhoneForApi = (value) => {
  const digits = value.replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

const LAST_CALL_RECIPIENT_KEY = "lastCallRecipient"

const readLastCallRecipient = () => {
  try {
    const raw = localStorage.getItem(LAST_CALL_RECIPIENT_KEY)
    if (!raw) {
      return { name: "", phone: "" }
    }
    const o = JSON.parse(raw)
    return {
      name: typeof o.name === "string" ? o.name : "",
      phone: typeof o.phone === "string" ? o.phone : "",
    }
  } catch {
    return { name: "", phone: "" }
  }
}

const buildCurlFromLog = (log) => {
  const endpoint = `https://master.appha.es/lua/bromapp/user/${log.path}`
  const payload = JSON.stringify(log.request ?? {})
  const escapedPayload = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `curl.exe -X POST "${endpoint}" -H "Content-Type: application/json" -d "${escapedPayload}"`
}

const showLaunchFailureToast = (detail) => {
  if (/valittu numero ei voi vastaanottaa vitsejä/i.test(detail)) {
    toast.error(detail, {
      description:
        "This number cannot receive prank calls (blocked, unsupported, or not allowed). Try another mobile number.",
    })
  } else {
    toast.error(detail)
  }
}

function App() {
  const [did, setDid] = useState("")
  /** Server account id (Mongo) for get_dialplan_ios / pranks — not the same as device did. */
  const [mongoUid, setMongoUid] = useState("")
  const [baseCountry, setBaseCountry] = useState("fi")
  const [languages, setLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [pranks, setPranks] = useState([])
  const [selectedPrankId, setSelectedPrankId] = useState("")
  const initRecipient = readLastCallRecipient()
  const [targetName, setTargetName] = useState(initRecipient.name)
  const [targetPhone, setTargetPhone] = useState(initRecipient.phone)
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

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          LAST_CALL_RECIPIENT_KEY,
          JSON.stringify({ name: targetName, phone: targetPhone })
        )
      } catch {
        /* ignore quota / private mode */
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [targetName, targetPhone])

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
        const legacyUid = localStorage.getItem("uid")
        if (!currentDid && legacyUid?.includes("-")) {
          currentDid = legacyUid
          localStorage.setItem("did", legacyUid)
        }
        let storedMongo = localStorage.getItem("mongoUid")
        if (!storedMongo && legacyUid && legacyUid !== currentDid) {
          storedMongo = legacyUid
        }
        const storedCountry = (localStorage.getItem("baseCountry") ?? "fi").toLowerCase()
        setBaseCountry(storedCountry)

        let resolvedMongoUid = storedMongo || ""

        const persistSession = (nextDid, nextMongo) => {
          currentDid = nextDid
          resolvedMongoUid = nextMongo
          setDid(nextDid)
          setMongoUid(nextMongo)
          localStorage.setItem("did", nextDid)
          localStorage.setItem("mongoUid", nextMongo)
        }

        if (!currentDid) {
          setStatusText("Creating account")
          const fresh = await api.bootstrapNewSession(storedCountry)
          persistSession(fresh.did, fresh.mongoUid)
          resolvedMongoUid = fresh.mongoUid
          localStorage.setItem("baseCountry", storedCountry)
        } else {
          persistSession(currentDid, resolvedMongoUid)
          setStatusText("Checking account status")
          try {
            const identityResponse = await api.syncIdentity(currentDid, currentDid)
            const resolved = api.resolveUid(identityResponse, storedMongo || undefined) || storedMongo
            if (resolved) {
              resolvedMongoUid = resolved
              setMongoUid(resolved)
              localStorage.setItem("mongoUid", resolved)
            }
          } catch (err) {
            if (api.isMissingUserError(err)) {
              setStatusText("Creating account")
              toast.info("Saved session was not found on the server. Starting a new account.")
              const fresh = await api.bootstrapNewSession(storedCountry)
              persistSession(fresh.did, fresh.mongoUid)
              resolvedMongoUid = fresh.mongoUid
            }
          }
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
        let prankList
        try {
          prankList = await api.getPranks(storedCountry, resolvedMongoUid, initialLanguage)
        } catch (err) {
          if (api.isMissingUserError(err)) {
            toast.info("Session invalid while loading pranks. Creating a new account.")
            const fresh = await api.bootstrapNewSession(storedCountry)
            persistSession(fresh.did, fresh.mongoUid)
            resolvedMongoUid = fresh.mongoUid
            prankList = await api.getPranks(storedCountry, resolvedMongoUid, initialLanguage)
          } else {
            throw err
          }
        }
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
    if (!mongoUid || !languageCode) {
      return
    }
    setIsLoadingPranks(true)
    try {
      setStatusText(`Loading ${languageCode.toUpperCase()} pranks`)
      let prankList
      try {
        prankList = await api.getPranks(baseCountry, mongoUid, languageCode)
      } catch (err) {
        if (api.isMissingUserError(err)) {
          toast.info("Session was not found. Creating a new account.")
          const fresh = await api.bootstrapNewSession(baseCountry)
          setDid(fresh.did)
          setMongoUid(fresh.mongoUid)
          localStorage.setItem("did", fresh.did)
          localStorage.setItem("mongoUid", fresh.mongoUid)
          prankList = await api.getPranks(baseCountry, fresh.mongoUid, languageCode)
        } else {
          throw err
        }
      }
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
    if (!selectedPrank || !targetName.trim() || !targetPhone.trim() || phoneError) {
      return
    }

    setIsLaunching(true)
    setStatusText("Checking call credits")
    try {
      let callDid = did
      let sessionMongoUid = mongoUid
      const storedCountry = selectedLanguage || baseCountry || "fi"

      if (!String(callDid || "").trim() || !String(sessionMongoUid || "").trim()) {
        throw new Error("Session not ready. Please wait for initialization.")
      }

      let identityResponse
      try {
        identityResponse = await api.syncIdentity(callDid, callDid)
      } catch (err) {
        if (api.isMissingUserError(err)) {
          toast.info("Session was not found. Creating a new account.")
          const fresh = await api.bootstrapNewSession(storedCountry)
          callDid = fresh.did
          sessionMongoUid = fresh.mongoUid
          setDid(callDid)
          setMongoUid(sessionMongoUid)
          localStorage.setItem("did", callDid)
          localStorage.setItem("mongoUid", sessionMongoUid)
          identityResponse = await api.syncIdentity(callDid, callDid)
        } else {
          throw err
        }
      }

      let resolvedMongo = api.resolveUid(identityResponse, sessionMongoUid) || sessionMongoUid
      const credits = api.getCallCreditsFromIdentity(identityResponse)

      let prankForLaunch = selectedPrank

      if (credits < 1) {
        setStatusText("Creating account")
        callDid = api.generateId()
        const createRes = await api.createAccount(callDid, storedCountry)
        const afterCreate = await api.syncIdentity(callDid, callDid)
        resolvedMongo = api.resolveUid(afterCreate, createRes) || resolvedMongo
        sessionMongoUid = resolvedMongo
        setDid(callDid)
        setMongoUid(resolvedMongo)
        localStorage.setItem("did", callDid)
        localStorage.setItem("mongoUid", resolvedMongo)

        const prankList = await api.getPranks(storedCountry, resolvedMongo, selectedLanguage)
        prankForLaunch =
          prankList.find((p) => p._id === selectedPrank._id) ?? prankList[0] ?? null
        setPranks(prankList)
        setSelectedPrankId(prankForLaunch?._id ?? "")
      } else if (resolvedMongo !== mongoUid) {
        setMongoUid(resolvedMongo)
        localStorage.setItem("mongoUid", resolvedMongo)
        sessionMongoUid = resolvedMongo
      }

      if (!prankForLaunch) {
        throw new Error("No prank available for this account.")
      }

      setStatusText("Launching call")
      const timestamp = toTaskTimestamp()
      const payload = {
        _id: api.generateTaskId(),
        c: storedCountry,
        dial: prankForLaunch._id,
        dst: normalizePhoneForApi(targetPhone),
        f: timestamp,
        nombre: targetName.trim(),
        real_f: timestamp,
        titulo: prankForLaunch.titulo,
        uid: callDid,
      }

      const response = await api.launchPrank(payload)
      if (response?.res === "OK") {
        setStatusText("Call queued")
        toast.success("Call queued successfully")

        api.pushRecordingTargetMemory({
          uid: callDid,
          dial: prankForLaunch._id,
          targetName: targetName.trim(),
          targetPhone: normalizePhoneForApi(targetPhone),
          taskId: payload._id,
        })

        const activeAccounts = JSON.parse(localStorage.getItem("activeAccounts") || "[]")
        const entry = {
          did: callDid,
          uid: callDid,
          mongoUid: sessionMongoUid,
          country: storedCountry,
          timestamp: Date.now(),
          dial: prankForLaunch._id,
          targetName: targetName.trim(),
          targetPhone: normalizePhoneForApi(targetPhone),
          taskId: payload._id,
        }
        const existingIdx = activeAccounts.findIndex(
          (a) => (a.did || a.uid) === callDid
        )
        if (existingIdx === -1) {
          activeAccounts.push(entry)
        } else {
          activeAccounts[existingIdx] = { ...activeAccounts[existingIdx], ...entry }
        }
        localStorage.setItem("activeAccounts", JSON.stringify(activeAccounts))

        setRecordingsRefreshToken((prev) => prev + 1)
      } else {
        const message = response?.msg || "Call launch failed"
        setStatusText(message)
        toast.error(message)
      }
    } catch (error) {
      const detail = api.formatKoErrorMessage(error) || "Call launch failed"
      setStatusText(detail)
      showLaunchFailureToast(detail)
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
    Boolean(did) &&
    Boolean(mongoUid) &&
    Boolean(selectedPrankId) &&
    Boolean(targetName.trim()) &&
    Boolean(targetPhone.trim()) &&
    !phoneError

  return (
    <div className="dark relative min-h-svh bg-background font-sans text-foreground antialiased">
      <div className="relative mx-auto w-full max-w-screen-2xl px-3 py-6 sm:px-4 md:py-8 lg:px-6 xl:px-8">
        <header className="mb-8 space-y-2 border-b border-border pb-8">
          <h1 className="typography-h1">Sentinel</h1>
          <p className="typography-lead max-w-2xl">
            Launch calls, track sessions, and review recordings.
          </p>
        </header>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 [&>*]:min-h-0 [&>*]:min-w-0">
          <div className="min-h-0 min-w-0 lg:sticky lg:top-6">
            <Card className="min-w-0 shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="typography-h3 flex items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <PhoneCallIcon className="size-5" />
                  </span>
                  Launch call
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1.5">
                  Name, phone, language, and prank scenario.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="target-name" className="text-sm font-semibold">Name</Label>
                    <Input
                      id="target-name"
                      placeholder="Target name"
                      className="h-12 text-base font-medium"
                      value={targetName}
                      onChange={(event) => setTargetName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-phone" className="text-sm font-semibold">Phone</Label>
                    <Input
                      id="target-phone"
                      placeholder="+358401234567"
                      className="h-12 text-base font-medium"
                      value={targetPhone}
                      onChange={(event) => setTargetPhone(maskPhoneInput(event.target.value))}
                    />
                    <p className={phoneError ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
                      {phoneError || "Include country code, e.g. +358401234567"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Language</Label>
                  {isInitializing ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={isInitializing}>
                      <SelectTrigger className="h-12 text-base font-medium">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language._id} value={language._id} className="text-base">
                            {language.tname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Pranks</Label>
                    <span className="typography-muted truncate">
                      {selectedPrank ? selectedPrank.titulo : "Select one"}
                    </span>
                  </div>
                  <ScrollArea className="h-[420px] rounded-md border bg-muted/30 py-1.5 pl-0 pr-1 sm:h-[460px] sm:py-2 sm:pr-1.5">
                    {isLoadingPranks || isInitializing ? (
                      <div className="grid gap-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="space-y-2 rounded-md border bg-card p-2">
                            <Skeleton className="h-20 w-full rounded" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup value={selectedPrankId} onValueChange={setSelectedPrankId} className="grid gap-2">
                        {pranks.map((prank) => {
                          const prankImage = prank.image_url || prank.pic || ""
                          const prankPreview = prank.example || ""
                          const isSelected = prank._id === selectedPrankId

                          return (
                            <label
                              key={prank._id}
                              className={`flex cursor-pointer items-center gap-2 rounded-md border py-2 pl-1 pr-2 sm:gap-2.5 sm:pl-1.5 sm:pr-2.5 transition-colors ${
                                isSelected
                                  ? "border-foreground/20 bg-muted"
                                  : "border-transparent bg-card hover:bg-muted/50"
                              }`}>
                              <RadioGroupItem value={prank._id} id={prank._id} className="sr-only" />

                              <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted sm:size-12">
                                {prankImage ? (
                                  <img src={prankImage} alt="" className="size-full object-cover" />
                                ) : (
                                  <div className="grid size-full place-items-center">
                                    <Volume2Icon className="size-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 pr-0.5">
                                <p className="text-sm leading-snug font-medium text-foreground">{prank.titulo}</p>
                                <p className="typography-muted mt-1 text-[13px] leading-snug break-words sm:text-sm">
                                  {prank.desc || "Scenario"}
                                </p>
                              </div>

                              {prankPreview && (
                                <button
                                  type="button"
                                  onClick={(e) => handlePlayToggle(e, prank)}
                                  className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                                    playingId === prank._id
                                      ? "border-transparent bg-primary text-primary-foreground"
                                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                                  }`}>
                                  {playingId === prank._id ? (
                                    <PauseIcon className="size-3.5 fill-current" />
                                  ) : (
                                    <PlayIcon className="ml-0.5 size-3.5 fill-current" />
                                  )}
                                </button>
                              )}
                            </label>
                          )
                        })}
                      </RadioGroup>
                    )}
                  </ScrollArea>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Badge variant="secondary" className="h-7 px-3 text-sm font-medium">
                      {statusText}
                    </Badge>
                    {(isInitializing || isLoadingPranks || isLaunching) && (
                      <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button variant="outline" className="h-12 text-base font-semibold sm:w-auto" onClick={() => setIsLogsOpen(true)}>
                      <FileTextIcon className="size-5" />
                      View logs
                    </Button>
                    <Button className="h-12 text-base font-semibold sm:w-auto sm:px-8" onClick={handleLaunchCall} disabled={!canLaunch}>
                      {isLaunching ? "Starting…" : "Start call"}
                    </Button>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="typography-muted font-mono text-[10px] sm:text-[11px]">
                      <span className="typography-inline-code text-[10px] font-normal leading-relaxed break-all sm:text-[11px]">
                        DID {did || "—"}
                      </span>
                    </p>
                    <p className="typography-muted font-mono text-[10px] sm:text-[11px]">
                      <span className="typography-inline-code text-[10px] font-normal leading-relaxed break-all sm:text-[11px]">
                        Account {mongoUid || "—"}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 min-w-0">
            <RecordedCallsPanel uid={did} countryCode={baseCountry} refreshToken={recordingsRefreshToken} />
          </div>
        </div>
      </div>

      <Sheet open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-svh w-full flex-col gap-0 overflow-hidden border-l p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 pt-6 pb-4">
            <SheetTitle className="typography-h4">API logs</SheetTitle>
            <SheetDescription className="typography-muted text-base">
              Requests and responses for identity, pranks, launches, and recordings.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="typography-muted tabular-nums">
                {filteredApiLogs.length} {filteredApiLogs.length === 1 ? "entry" : "entries"}
                {logFilter !== "all" && apiLogs.length !== filteredApiLogs.length
                  ? ` · filtered from ${apiLogs.length}`
                  : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={logFilter}
                  onValueChange={(v) => v && setLogFilter(v)}
                  variant="outline"
                  size="sm"
                  spacing={0}
                  className="w-full justify-start sm:w-auto">
                  <ToggleGroupItem value="all" className="px-3">
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem value="errors" className="px-3">
                    Errors
                  </ToggleGroupItem>
                  <ToggleGroupItem value="launch" className="px-3">
                    Launch
                  </ToggleGroupItem>
                  <ToggleGroupItem value="recordings" className="px-3">
                    Recordings
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={api.clearApiLogs}
                  disabled={apiLogs.length === 0}>
                  Clear all
                </Button>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 pr-3">
              <div className="space-y-4 pb-2">
                {filteredApiLogs.map((log) => (
                  <div
                    key={log.id}
                    className="overflow-hidden rounded-lg border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
                      <code className="break-all font-mono text-xs leading-snug text-foreground sm:text-sm">
                        {log.path}
                      </code>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <Badge variant={log.ok ? "secondary" : "destructive"} className="tabular-nums">
                          {log.ok ? "OK" : "Error"}
                        </Badge>
                        <Badge variant="outline" className="font-normal tabular-nums text-muted-foreground">
                          {log.status ?? "—"} · {log.durationMs ?? 0} ms
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <time className="typography-muted text-xs" dateTime={new Date(log.ts).toISOString()}>
                        {new Date(log.ts).toLocaleString()}
                      </time>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => copyLogCurl(log)}>
                        <CopyIcon className="size-3" />
                        Copy cURL
                      </Button>
                    </div>

                    <Separator />

                    <div className="grid gap-0 sm:grid-cols-1">
                      <div className="border-border/60 px-4 py-3 sm:border-b-0">
                        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                          Request
                        </p>
                        <pre className="max-h-36 overflow-x-auto overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground sm:text-xs">
{formatLogValue(log.request)}
                        </pre>
                      </div>
                      <div className="border-t border-border/60 px-4 py-3">
                        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                          {log.ok ? "Response" : "Error"}
                        </p>
                        <pre className="max-h-44 overflow-x-auto overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground sm:max-h-52 sm:text-xs">
{formatLogValue(log.ok ? log.response : log.error || log.response)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredApiLogs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-6 py-12 text-center">
                    <FileTextIcon className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                    <p className="typography-muted">No logs match this filter.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster richColors closeButton />
    </div>
  )
}

export default App
