import { useEffect, useMemo, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CopyIcon,
  FileTextIcon,
  LoaderIcon,
  PhoneCallIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  CheckCircle2Icon,
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
  const isLaunchingRef = useRef(false)

  const selectedPrank = useMemo(
    () => pranks.find((prank) => prank._id === selectedPrankId) ?? null,
    [pranks, selectedPrankId]
  )

  const phoneDigits = useMemo(() => targetPhone.replace(/\D/g, ""), [targetPhone])
  const phoneError = useMemo(() => {
    if (!targetPhone.trim()) {
      return ""
    }
    if (phoneDigits.length < 10) {
      return "Phone number must be at least 10 digits."
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
    // Neural monochrome theme is handled via CSS and the component
    return () => {}
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
    if (isLaunchingRef.current) {
      return
    }

    if (!selectedPrank || !targetName.trim() || !targetPhone.trim() || phoneError) {
      return
    }

    isLaunchingRef.current = true
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
      isLaunchingRef.current = false
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
    <div className="relative min-h-svh font-sans text-ms-pure antialiased bg-black/95">
      
      <main className="page-body relative z-10 mx-auto w-full max-w-[1400px] px-6 py-24 text-ms-pure">
        <header className="mb-16 text-left reveal active">
          <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-3">
            Sentinel <span className="opacity-10 text-ms-white">V2</span>
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-ms-muted">
            Unlimited Prank Call Intelligence
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div id="launch" className="lg:col-span-3 reveal active">
            <div className="module h-full">
              <div className="module-head border-b border-white/5 py-5 px-6">
                <span className="text-sm font-bold tracking-widest uppercase text-ms-pure">Configure Call Interaction</span>
                <Badge variant="secondary" className="px-3 py-1 font-mono text-[9px] rounded-full bg-white/5 text-ms-muted border-white/10">
                  {statusText}
                </Badge>
              </div>
              <div className="module-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="field">
                    <label className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2 block font-medium">Target Name</label>
                    <Input
                      id="target-name"
                      placeholder="Name"
                      className="h-11 text-sm bg-white/[0.03] border-white/10 rounded-full px-5 focus:bg-white/[0.06] focus:border-white/20 transition-all duration-500"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2 block font-medium">Target Phone</label>
                    <Input
                      id="target-phone"
                      placeholder="+Phone"
                      className="h-11 text-sm bg-white/[0.03] border-white/10 rounded-full px-5 focus:bg-white/[0.06] focus:border-white/20 transition-all duration-500"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(maskPhoneInput(e.target.value))}
                    />
                  </div>

                  <div className="field text-ms-pure">
                    <label className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2 block font-medium">Language</label>
                    {isInitializing ? (
                      <Skeleton className="h-11 w-full rounded-full" />
                    ) : (
                      <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={isInitializing}>
                        <SelectTrigger className="h-11 w-fit min-w-[140px] text-sm bg-white/[0.03] border-white/10 rounded-full px-5 focus:ring-0 focus:border-white/20 transition-all duration-500 flex items-center justify-between gap-3">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-ms-elevated border-ms-border text-ms-pure rounded-2xl">
                          {languages.map((l) => (
                            <SelectItem key={l._id} value={l._id} className="text-sm py-2">
                              {l.tname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                  <div className="field mt-12">
                    <div className="flex items-center justify-between mb-5 px-1">
                      <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-ms-muted">available prank scenarios</label>
                      <span className="text-[9px] font-mono text-ms-muted uppercase tracking-[0.2em] opacity-30">
                        {selectedPrank ? selectedPrank.titulo : "none selected"}
                      </span>
                    </div>
                  
                  <ScrollArea className="h-[406px] rounded-lg border border-ms-border bg-black/20 px-4 py-2">
                    {isLoadingPranks || isInitializing ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="module bg-surface/50 animate-pulse h-20" />
                        ))}
                      </div>
                    ) : (
                      <RadioGroup value={selectedPrankId} onValueChange={setSelectedPrankId} className="grid grid-cols-3 gap-3 p-1">
                        {pranks.map((prank, index) => {
                          const isSelected = prank._id === selectedPrankId
                          return (
                            <label
                              key={prank._id}
                              className={`module mb-0 cursor-pointer flex items-center transition-all duration-300 p-2 animate-in fade-in zoom-in group ${
                                isSelected 
                                  ? "border-ms-white ring-2 ring-ms-white/40 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.03] z-10" 
                                  : "hover:bg-ms-elevated hover:scale-[1.02] hover:-translate-y-0.5"
                              }`}
                              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                            >
                              <RadioGroupItem value={prank._id} className="sr-only" />
                              <div className="flex items-center gap-3 relative flex-1">
                                <div className={`size-10 rounded overflow-hidden border shrink-0 bg-black/40 relative transition-all duration-300 ${isSelected ? "border-ms-white ring-1 ring-ms-white/50" : "border-ms-border/50 group-hover:border-ms-white/30"}`}>
                                  {prank.pic || prank.image_url ? (
                                    <img src={prank.pic || prank.image_url} alt="" className={`size-full object-cover transition-transform duration-500 ${isSelected ? "scale-110 opacity-70" : "group-hover:scale-110"}`} />
                                  ) : (
                                    <div className="grid size-full place-items-center opacity-20">
                                      <Volume2Icon className="size-4" />
                                    </div>
                                  )}
                                  
                                  {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] animate-in zoom-in duration-200">
                                      <CheckCircle2Icon className="size-5 text-ms-white drop-shadow-md" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className={`text-[10px] font-bold leading-tight truncate transition-colors duration-300 ${isSelected ? "text-ms-white" : "text-ms-white/80 group-hover:text-ms-white"}`}>{prank.titulo}</h3>
                                  <p className={`text-[9px] truncate transition-colors duration-300 ${isSelected ? "text-ms-white/70" : "text-ms-muted group-hover:text-ms-muted"}`}>{prank.desc}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handlePlayToggle(e, prank)}
                                  className={`shrink-0 size-7 rounded-full flex items-center justify-center transition-all duration-300 z-20 relative ring-1 ring-ms-white/10 ${
                                    playingId === prank._id 
                                      ? "bg-ms-white text-black ring-transparent scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
                                      : "bg-black/40 text-ms-white hover:bg-ms-white/20 hover:scale-110"
                                  }`}
                                >
                                  {playingId === prank._id ? <PauseIcon className="size-3 fill-current" /> : <PlayIcon className="size-3 ml-0.5 fill-current" />}
                                </button>
                              </div>
                            </label>
                          )
                        })}
                      </RadioGroup>
                    )}
                  </ScrollArea>
                </div>

                <div className="mt-12 flex justify-center">
                  <Button 
                    className="w-full max-w-[320px] h-14 bg-white text-black hover:bg-ms-light font-bold text-[11px] tracking-[0.2em] uppercase rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-700 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 disabled:opacity-5 disabled:pointer-events-none disabled:grayscale"
                    onClick={handleLaunchCall}
                    disabled={!canLaunch}
                  >
                    {isLaunching ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <PhoneCallIcon className="size-4 fill-current" />
                    )}
                    START INTERACTION
                  </Button>
                </div>

                <div className="mt-6 text-center space-y-1">
                  <p className="text-[10px] font-mono text-ms-muted uppercase tracking-[0.2em]">
                    Identity Manifest
                  </p>
                  <div className="flex flex-col items-center gap-3 text-[11px] font-mono text-ms-muted">
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="px-3 py-1 rounded border border-ms-border bg-black/40 shadow-sm">
                        <span className="text-ms-muted mr-1">DID:</span>
                        <span className="text-ms-white">{did || "???"}</span>
                      </span>
                      <span className="px-3 py-1 rounded border border-ms-border bg-black/40 shadow-sm">
                        <span className="text-ms-muted mr-1">ACC:</span>
                        <span className="text-ms-white">{mongoUid || "???"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="recordings" className="lg:col-span-2 reveal active h-full">
            <RecordedCallsPanel uid={did} countryCode={baseCountry} refreshToken={recordingsRefreshToken} panelClassName="border-[var(--color-ms-border)] bg-[var(--color-ms-surface)] h-full" />
          </div>
        </div>
      </main>

      <Sheet open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-svh w-full flex-col gap-0 overflow-hidden border-l border-white/5 p-0 sm:max-w-2xl bg-[#050505]/60 backdrop-blur-[60px]">
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

      <Toaster 
        richColors 
        closeButton 
        theme="dark"
        toastOptions={{
          className: "bg-ms-elevated border border-ms-border text-ms-pure rounded-xl shadow-2xl backdrop-blur-md",
          duration: 3000,
        }}
      />


      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 1.2, 
          delay: 0.8, 
          ease: [0.16, 1, 0.3, 1] // Custom premium "out-expo" ease
        }}
        className="fixed bottom-6 right-6 z-50 px-1 py-1"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsLogsOpen(true)}
          className="size-10 rounded-full bg-white/[0.03] backdrop-blur-md border-white/10 text-ms-muted hover:text-ms-pure hover:bg-white/10 hover:border-white/20 transition-all duration-500 shadow-2xl group relative overflow-hidden"
        >
          <FileTextIcon className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </motion.div>
    </div>
  )
}

export default App
