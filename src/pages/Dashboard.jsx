import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { usePrank } from "../context/PrankContext";
import { MOCK_PRANKS_BY_LANGUAGE } from "../services/mock_data";
import { toast } from "sonner";
import {
  getRecordedCalls,
  enrichRecordedCallsWithLocalInput,
  bootstrapNewSession,
  launchPrank,
  generateTaskId,
  pushRecordingTargetMemory,
  formatKoErrorMessage
} from "../services/api";

const formatPlaybackTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTaskTimestamp = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const DashboardAudioPlayer = ({ url, titulo }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration && el.duration > 0 ? el.duration : 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [url]);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = percent * duration;
    setCurrent(percent * duration);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: "Recorded prank call", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Audio link copied");
      }
    } catch {
      toast.error("Share unavailable");
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `recording-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const progressPercent = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-5 w-full">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      
      <button
        onClick={toggle}
        className="relative h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-[#ff4a8e]/10 border border-[#ff4a8e]/20 text-[#ffb1c5] transition-all hover:bg-[#ff4a8e]/20 hover:text-white hover:border-[#ff4a8e]/40 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,74,142,0.1)] group"
        aria-label={playing ? "Pause recording" : "Play recording"}
      >
        <span className="material-symbols-outlined text-[24px] relative z-10 transition-transform group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
          {playing ? "pause" : "play_arrow"}
        </span>
        {playing && (
          <span className="absolute inset-0 rounded-full border border-[#ff4a8e] animate-ping opacity-20"></span>
        )}
      </button>

      <div className="min-w-0 flex-1 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-white">
            {titulo}
          </span>
          <span className="text-[10px] font-mono font-bold text-[#ffb1c5]/80 shrink-0">
            {formatPlaybackTime(current)}<span className="opacity-40 mx-1">/</span>{formatPlaybackTime(duration)}
          </span>
        </div>
        
        <div className="group/track h-4 w-full cursor-pointer relative flex items-center" onClick={handleSeek}>
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-[#1e1518] shadow-inner overflow-hidden border border-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff4a8e]/50 to-[#ff4a8e] shadow-[0_0_10px_#ff4a8e]" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div 
            className="absolute h-3 w-3 rounded-full bg-white shadow-[0_0_10px_#ff4a8e] scale-0 group-hover/track:scale-100 transition-transform duration-200" 
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          onClick={handleShare}
          type="button"
          title="Share"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 transition-all hover:text-[#ff4a8e] hover:bg-[#ff4a8e]/10"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
        <button
          onClick={handleDownload}
          type="button"
          title="Download"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 transition-all hover:text-[#ff4a8e] hover:bg-[#ff4a8e]/10"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>
      </div>
    </div>
  );
};

const PRIMARY_LANGUAGE_GROUPS = new Set(["English", "Español", "Français", "Português"]);

const REGION_CODE_MAP = {
  Danmark: "dk",
  Deutsch: "de",
  Eesti: "ee",
  English: "gb",
  "Español": "es",
  "Français": "fr",
  Hrvatska: "hr",
  Indonesia: "id",
  Italiano: "it",
  Latvija: "lv",
  Lietuva: "lt",
  "Magyarország": "hu",
  Malaysia: "my",
  Malta: "mt",
  Moldova: "md",
  Nederlands: "nl",
  Norge: "no",
  Polska: "pl",
  "Português": "pt",
  "România": "ro",
  Slovenija: "si",
  Slovensko: "sk",
  Suomi: "fi",
  Sverige: "se",
  "Türkiye": "tr",
  "Yкраїнська": "ua",
  "Việt Nam": "vn",
  "Ísland": "is",
  "Česko": "cz",
  "Ελλάδα": "gr",
  "Κύπρος": "cy",
  "България": "bg",
  "Русский": "ru",
  "ישראל": "il",
  "پاکستان": "pk",
  "भारत": "in",
  "বাংলাদেশ": "bd",
  "ประเทศไทย": "th",
  "中国": "cn",
  "台灣": "tw",
  "日本": "jp",
  "대한민국": "kr",
  "مصر": "eg",
  "香港": "hk",
  "Hong Kong": "hk",
  Australia: "au",
  Canada: "ca",
  Ireland: "ie",
  "New Zealand": "nz",
  Singapore: "sg",
  "South Africa": "za",
  "United Kingdom": "gb",
  "United States": "us",
  "España": "es",
  "México": "mx",
  Colombia: "co",
  Argentina: "ar",
  Chile: "cl",
  "Costa Rica": "cr",
  Paraguay: "py",
  "Perú": "pe",
  "Puerto Rico": "pr",
  Venezuela: "ve",
  Belgique: "be",
  France: "fr",
  "Lëtzebuerg": "lu",
  Suisse: "ch",
  Brasil: "br",
  Portugal: "pt",
  "Română": "ro",
  "عربي": "eg"
};

const normalizeLanguageName = (name) => {
  if (!name) return "";
  const cleaned = name.replace(/\uFFFD/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.includes("香港") || /hong\s*kong/i.test(cleaned)) return "Hong Kong";
  return cleaned;
};

const getFlagEmoji = (regionName) => {
  const normalized = normalizeLanguageName(regionName);
  const code = REGION_CODE_MAP[normalized];
  if (!code) return "🌐";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((ch) => 127397 + ch.charCodeAt(0))
  );
};

const buildLanguageOptions = (data) => {
  const options = [];

  Object.entries(data).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      const label = normalizeLanguageName(key);
      options.push({
        id: `flat:${key}`,
        label,
        displayName: `${getFlagEmoji(label)} ${label}`,
        pranks: val
      });
      return;
    }

    if (val && typeof val === "object") {
      Object.entries(val).forEach(([subKey, subPranks]) => {
        if (!Array.isArray(subPranks)) return;
        const sourceLabel = PRIMARY_LANGUAGE_GROUPS.has(key) ? subKey : key;
        const label = normalizeLanguageName(sourceLabel);
        options.push({
          id: `nested:${key}:${subKey}`,
          label,
          displayName: `${getFlagEmoji(label)} ${label}`,
          pranks: subPranks
        });
      });
    }
  });

  // Keep one entry per visible label to avoid duplicates
  const uniqueByLabel = new Map();
  options.forEach((option) => {
    const existing = uniqueByLabel.get(option.label);
    if (!existing || option.pranks.length > existing.pranks.length) {
      uniqueByLabel.set(option.label, option);
    }
  });

  return Array.from(uniqueByLabel.values()).sort((a, b) => a.label.localeCompare(b.label));
};

export const Dashboard = () => {
  const { selectedPrank, setSelectedPrank, credits } = usePrank();
  const [targetName, setTargetName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const languageMenuRef = useRef(null);
  const [calls, setCalls] = useState([]);
  const [queuedCalls, setQueuedCalls] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [canScrollMore, setCanScrollMore] = useState(true);
  const previewAudioRef = useRef(null);
  const [previewingId, setPreviewingId] = useState(null);

  const handlePrankListScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 20;
    setCanScrollMore(!bottom);
  };

  const visibleCalls = useMemo(() => {
    const byId = new Map();
    [...queuedCalls, ...calls].forEach((entry) => {
      if (!byId.has(entry._id)) {
        byId.set(entry._id, entry);
      }
    });
    return Array.from(byId.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [queuedCalls, calls]);

  const fetchCalls = useCallback(async ({ silent = false } = {}) => {
    const activeAccounts = JSON.parse(localStorage.getItem("activeAccounts") || "[]");
    const uidSeen = new Set();
    const allUids = [];
    for (const a of activeAccounts) {
      const taskId = a?.did || a?.uid;
      if (!taskId || uidSeen.has(taskId)) continue;
      uidSeen.add(taskId);
      allUids.push(a);
    }
    
    if (allUids.length === 0) {
      setCalls([]);
      return;
    }

    if (!silent) setIsLoadingLogs(true);
    
    try {
      const results = [];
      for (const acc of allUids) {
        const taskUid = acc.did || acc.uid;
        const row = await getRecordedCalls(acc.country || "fi", taskUid).catch(() => []);
        results.push(row);
      }
      let combined = results.flat();
      const seen = new Set();
      combined = combined.filter((c) => {
        if (seen.has(c._id)) return false;
        seen.add(c._id);
        return true;
      });

      const hiddenCalls = JSON.parse(localStorage.getItem("hiddenCalls") || "[]");
      combined = combined.filter((c) => !hiddenCalls.includes(c._id));
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      combined = combined.map((c) => ({ ...c, targetName: "", targetPhone: "" }));
      combined = enrichRecordedCallsWithLocalInput(combined);

      setQueuedCalls((currentQueued) => currentQueued.filter((queued) => !combined.some((call) => call._id === queued._id)));
      setCalls(combined);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const runningCount = useMemo(() => {
    return visibleCalls.filter((call) => call.status === "running" || call.status === "queued" || call.status === "pending").length;
  }, [visibleCalls]);

  useEffect(() => {
    if (runningCount === 0) return;
    const intervalId = setInterval(() => {
      fetchCalls({ silent: true });
    }, 20000);
    return () => clearInterval(intervalId);
  }, [fetchCalls, runningCount]);

  const availableLanguages = useMemo(() => {
    return buildLanguageOptions(MOCK_PRANKS_BY_LANGUAGE);
  }, []);

  const activeLanguage = useMemo(() => {
    return availableLanguages.find((lang) => lang.id === selectedLanguage) || availableLanguages[0] || null;
  }, [availableLanguages, selectedLanguage]);

  const selectedCountryCode = useMemo(() => {
    const normalizedLabel = normalizeLanguageName(activeLanguage?.label || "");
    return (REGION_CODE_MAP[normalizedLabel] || "fi").toLowerCase();
  }, [activeLanguage]);

  const pranksForLanguage = useMemo(() => {
    return activeLanguage?.pranks || [];
  }, [activeLanguage]);

  useEffect(() => {
    setCanScrollMore(pranksForLanguage.length > 0);
  }, [pranksForLanguage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const previewEl = previewAudioRef.current;
    if (!previewEl) return;

    const onEnded = () => setPreviewingId(null);
    previewEl.addEventListener("ended", onEnded);

    return () => {
      previewEl.removeEventListener("ended", onEnded);
      previewEl.pause();
      previewEl.src = "";
    };
  }, []);

  const handlePreviewToggle = async (prank) => {
    const previewUrl = prank?.example;
    if (!previewUrl) {
      toast.error("No preview available for this scenario.");
      return;
    }

    const previewEl = previewAudioRef.current;
    if (!previewEl) {
      toast.error("Audio preview is unavailable.");
      return;
    }

    const isCurrent = previewingId === prank._id;
    if (isCurrent) {
      previewEl.pause();
      previewEl.currentTime = 0;
      setPreviewingId(null);
      return;
    }

    try {
      previewEl.pause();
      previewEl.src = previewUrl;
      previewEl.currentTime = 0;
      await previewEl.play();
      setPreviewingId(prank._id);
    } catch {
      setPreviewingId(null);
      toast.error("Could not play preview audio.");
    }
  };

  const handleDeleteLog = useCallback((callId) => {
    if (!callId) {
      return;
    }

    const currentHidden = JSON.parse(localStorage.getItem("hiddenCalls") || "[]");
    const hiddenSet = new Set(Array.isArray(currentHidden) ? currentHidden : []);
    hiddenSet.add(callId);
    localStorage.setItem("hiddenCalls", JSON.stringify(Array.from(hiddenSet).slice(-500)));

    setCalls((currentCalls) => currentCalls.filter((entry) => entry._id !== callId));
    setQueuedCalls((currentCalls) => currentCalls.filter((entry) => entry._id !== callId));

    toast.success("Call deleted from history");
  }, []);

  const handleStartPrank = async () => {
    if (!selectedPrank) {
      toast.error("Select a scenario first.");
      return;
    }
    const cleanName = targetName.trim();
    const cleanPhone = phoneNumber.trim();
    if (!cleanName || !cleanPhone) {
      toast.error("Enter target name and phone number.");
      return;
    }

    if (isLaunching) {
      return;
    }

    setIsLaunching(true);

    const taskId = generateTaskId();
    const nowUnix = Math.floor(Date.now() / 1000);
    const didFallback = `local-${taskId}`;
    const queuedPreview = {
      _id: taskId,
      uid: didFallback,
      titulo: selectedPrank.titulo,
      cou: selectedCountryCode,
      pic: selectedPrank.image_url || "",
      url: "",
      started: false,
      queued: true,
      done: false,
      ndone: false,
      returned: false,
      status: "queued",
      isPlayable: false,
      timestamp: nowUnix,
      timeLabel: "Queued now",
      dial: String(selectedPrank._id || ""),
      targetName: cleanName,
      targetPhone: cleanPhone
    };

    setQueuedCalls((currentQueued) => [queuedPreview, ...currentQueued.filter((item) => item._id !== queuedPreview._id)].slice(0, 30));

    try {
      const { did, mongoUid } = await bootstrapNewSession(selectedCountryCode);
      const taskTimestamp = formatTaskTimestamp();

      pushRecordingTargetMemory({
        uid: did,
        dial: selectedPrank._id,
        targetName: cleanName,
        targetPhone: cleanPhone,
        taskId
      });

      const activeAccounts = JSON.parse(localStorage.getItem("activeAccounts") || "[]");
      const mergedAccounts = [
        {
          did,
          uid: mongoUid,
          country: selectedCountryCode,
          at: Date.now()
        },
        ...activeAccounts.filter((entry) => (entry?.did || entry?.uid) !== did)
      ];
      localStorage.setItem("activeAccounts", JSON.stringify(mergedAccounts.slice(0, 30)));

      await launchPrank({
        _id: taskId,
        c: selectedCountryCode,
        dial: selectedPrank._id,
        dst: cleanPhone,
        f: taskTimestamp,
        nombre: cleanName,
        real_f: taskTimestamp,
        titulo: selectedPrank.titulo,
        uid: did
      });

      setQueuedCalls((currentQueued) =>
        currentQueued.map((entry) => (entry._id === taskId ? { ...entry, uid: did } : entry))
      );

      toast.success("Mischief queued", {
        description: `${cleanName} • ${selectedPrank.titulo}`
      });
      setTargetName("");
      setPhoneNumber("");

      await fetchCalls({ silent: true });
      setTimeout(() => {
        void fetchCalls({ silent: true });
      }, 1600);
    } catch (error) {
      setQueuedCalls((currentQueued) => currentQueued.filter((entry) => entry._id !== taskId));
      toast.error("Launch failed", {
        description: formatKoErrorMessage(error) || "Could not queue the call."
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <main className="pt-32 pb-24 px-8 max-w-[1600px] mx-auto bg-[#131313] min-h-screen font-['Inter'] selection:bg-[#ff4a8e] selection:text-white">
      <audio ref={previewAudioRef} preload="none" className="hidden" />
      <div className="flex flex-col gap-12">

        {/* Top Section: Config Left, Bento Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: Configure Call */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-32 w-full max-w-full">
            <header className="mb-6">
              <div className="h-[1px] w-12 bg-[#ff4a8e] mb-4"></div>
              <h1 className="text-5xl font-black tracking-tighter text-on-surface uppercase italic leading-none">Configure</h1>
              <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] mt-2 opacity-60">Target Details & Logic</p>
            </header>

            <div className="bg-[#1b1b1b] p-8 rounded-3xl border border-outline-variant/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-8 relative group z-10">
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ff4a8e]/10 blur-[40px] rounded-full group-hover:bg-[#ff4a8e]/20 group-hover:blur-[50px] transition-all duration-700"></div>
              </div>

              <div className="space-y-6 relative z-30">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Target Name</label>
                  <div className="relative">
                    <input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      className="w-full bg-[#131313] border border-outline-variant/10 focus:border-[#ffb1c5] focus:ring-0 text-on-surface placeholder:text-white/40 px-4 py-4 rounded-xl transition-all font-medium"
                      placeholder="Who is the target?"
                      type="text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Phone Number</label>
                  <div className="relative">
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-[#131313] border border-outline-variant/10 focus:border-[#ffb1c5] focus:ring-0 text-on-surface placeholder:text-white/40 px-4 py-4 rounded-xl transition-all font-medium"
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative z-[50]">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Language</label>
                  <div className="relative z-[50]" ref={languageMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLanguageMenuOpen((prev) => !prev);
                        if (!isLanguageMenuOpen) setLanguageSearch("");
                      }}
                      className={`w-full bg-[#101010] border ${
                        isLanguageMenuOpen ? "border-[#ff4a8e] shadow-[0_0_20px_rgba(255,74,142,0.2)]" : "border-white/10 hover:border-white/20"
                      } text-white px-4 py-4 rounded-xl transition-all font-bold flex items-center justify-between group/langbox`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="truncate tracking-wide text-sm">
                          {activeLanguage?.displayName || "Select region..."}
                        </span>
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isLanguageMenuOpen ? "bg-[#ff4a8e] text-white rotate-180 shadow-[0_0_15px_#ff4a8e]" : "bg-white/5 text-white/50 group-hover/langbox:bg-white/10"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                      </div>
                    </button>

                    {isLanguageMenuOpen && (
                      <div className="absolute z-[100] mt-3 w-full rounded-2xl border border-[#ff4a8e]/30 bg-black/90 backdrop-blur-2xl shadow-[0_30px_80px_-10px_rgba(255,74,142,0.2)] flex flex-col ring-1 ring-white/5 origin-top animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-white/10 bg-[#ff4a8e]/5">
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={languageSearch}
                              onChange={(e) => setLanguageSearch(e.target.value)}
                              placeholder="Search Global Node..."
                              className="w-full bg-[#1b1b1b]/80 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-white/40 focus:border-[#ff4a8e]/50 focus:ring-0 transition-all font-medium backdrop-blur-sm"
                            />
                          </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 gap-2">
                          {availableLanguages
                            .filter(l => l.label.toLowerCase().includes(languageSearch.toLowerCase()))
                            .map((lang) => (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLanguage(lang.id);
                                  setIsLanguageMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-4 rounded-xl text-base font-bold transition-all flex items-center justify-between group/item ${
                                  activeLanguage?.id === lang.id
                                    ? "bg-[#ff4a8e]/20 text-white shadow-[inset_0_0_0_1px_rgba(255,74,142,0.4)]"
                                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span className={`truncate transition-colors ${activeLanguage?.id === lang.id ? "text-[#ffb1c5]" : "group-hover/item:text-white"}`}>
                                  {lang.displayName}
                                </span>
                                {activeLanguage?.id === lang.id && (
                                  <div className="w-6 h-6 rounded-full bg-[#ff4a8e] flex items-center justify-center shadow-[0_0_10px_rgba(255,74,142,0.5)]">
                                    <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                                  </div>
                                )}
                              </button>
                            ))}
                          
                          {availableLanguages.filter(l => l.label.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 && (
                            <div className="py-6 text-center text-white/40 text-xs font-medium">
                              No intercept nodes found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-6 relative z-10">
                <div className="flex items-center justify-between p-5 bg-[#131313] rounded-2xl border border-outline-variant/5 relative z-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff4a8e]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#ff4a8e]">bolt</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest leading-none mb-1">Mischief Balance</p>
                      <p className="text-base font-black text-on-surface leading-none">{credits} Credits</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-black text-[#ffb1c5] hover:text-[#ff4a8e] uppercase tracking-widest transition-colors">Refill</button>
                </div>

                <div className="relative z-0">
                  <button
                    onClick={handleStartPrank}
                    disabled={isLaunching}
                    className="group relative w-full bg-[#ff4a8e]/10 text-[#ffb1c5] py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center space-x-3 active:scale-[0.98] transition-all border border-[#ff4a8e]/30 hover:bg-[#ff4a8e]/20 hover:border-[#ff4a8e]/60 hover:text-white hover:shadow-[0_0_30px_rgba(255,74,142,0.15)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#ff4a8e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative z-10">{isLaunching ? "Queueing..." : "Initiate Mischief"}</span>
                    <span className="material-symbols-outlined text-lg relative z-10 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">rocket_launch</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: Scenarios Vault */}
          <div className="lg:col-span-8 flex flex-col h-full lg:max-h-[85vh]">
            <header className="mb-6 shrink-0 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <div className="h-[1px] w-16 bg-gradient-to-r from-[#ff4a8e] to-[#ff936a] mb-4"></div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface uppercase italic leading-none">Scenario Vault</h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] opacity-70">Sentinel Voice Arsenal</span>
                  <span className="text-[9px] bg-[#ff4a8e]/20 text-[#ffb1c5] px-2 py-0.5 rounded font-black uppercase border border-[#ff4a8e]/20">
                    {activeLanguage?.label || "Unknown"}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 min-w-[220px]">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Active Catalog</p>
                <p className="text-2xl font-black text-white mt-1 leading-none">{pranksForLanguage.length}</p>
                <p className="text-[10px] text-[#ffb1c5] font-bold uppercase tracking-[0.18em] mt-1">Ready Scenarios</p>
              </div>
            </header>

            {/* SCROLLABLE GRID CONTAINER */}
            <div className="relative flex-1 min-h-0">
              <div 
                className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#131313] via-[#131313]/90 to-transparent z-10 pointer-events-none flex flex-col items-center justify-end pb-8 transition-opacity duration-500 ${
                  pranksForLanguage.length > 0 && canScrollMore ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="flex flex-col items-center gap-1.5 translate-y-2 animate-bounce">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#ffb1c5] bg-[#ff4a8e]/10 border border-[#ff4a8e]/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(255,74,142,0.15)] flex items-center gap-2">
                    Scroll To Continue
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff4a8e] shadow-[0_0_5px_#ff4a8e]"></div>
                  </span>
                  <span className="material-symbols-outlined text-white/50 text-xl font-light">keyboard_arrow_down</span>
                </div>
              </div>

              <div 
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pr-4 pb-20 custom-scrollbar content-start h-full"
                onScroll={handlePrankListScroll}
              >
                {pranksForLanguage.length > 0 ? (
                  pranksForLanguage.map((prank, idx) => {
                    return (
                      <div
                        key={prank._id || idx}
                        onClick={() => setSelectedPrank(prank)}
                        className={`
                          group relative flex flex-col overflow-hidden rounded-[1.4rem] cursor-pointer border transition-all duration-300 min-h-[330px]
                          ${selectedPrank?._id === prank._id
                            ? 'border-[#ff4a8e] bg-[#181818] shadow-[0_0_30px_rgba(255,74,142,0.18)]'
                            : 'border-white/10 bg-[#101010] hover:border-white/20 hover:bg-[#151515]'}
                        `}
                      >
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-start gap-4">
                            <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#0d0d0d]">
                              <img
                                className="w-full h-full object-cover opacity-90"
                                src={prank.image_url}
                                alt={prank.titulo}
                              />
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md border ${
                                  selectedPrank?._id === prank._id
                                    ? "border-[#ff4a8e]/30 text-[#ffb1c5] bg-[#ff4a8e]/10"
                                    : "border-[#ff4a8e]/20 text-[#ffc2d4]/85 bg-[#ff4a8e]/10"
                                }`}>
                                  Script
                                </span>
                                {selectedPrank?._id === prank._id && (
                                  <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md border border-[#ff4a8e]/30 text-[#ffb1c5] bg-[#ff4a8e]/10">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <h3 className="font-black text-white text-lg tracking-tight uppercase leading-tight line-clamp-2">
                                {prank.titulo}
                              </h3>
                            </div>
                          </div>

                          <p className="text-white/60 text-sm mt-4 leading-relaxed line-clamp-4 font-medium flex-1">
                            {prank.desc}
                          </p>

                          <div className="flex items-center justify-between mt-4 pt-5 border-t border-white/10">
                            <button
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 border transition-all text-[11px] font-black uppercase tracking-[0.16em] ${
                                selectedPrank?._id === prank._id
                                  ? "bg-[#ff4a8e]/12 border-[#ff4a8e]/28 text-[#ffd3e1] hover:bg-[#ff4a8e]/18 hover:border-[#ff4a8e]/45"
                                  : "bg-[#ff4a8e]/10 border-[#ff4a8e]/20 text-[#ffc2d4] hover:text-white hover:bg-[#ff4a8e]/16 hover:border-[#ff4a8e]/35"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePreviewToggle(prank);
                              }}
                            >
                              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {previewingId === prank._id ? "pause_circle" : "play_circle"}
                              </span>
                              {previewingId === prank._id ? "Pause" : "Play"}
                            </button>

                            <span className="text-[10px] text-white/45 font-black uppercase tracking-[0.18em]">Tap Card To Arm</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-[2.5rem] bg-[#1b1b1b] border border-outline-variant/10 flex flex-col items-center justify-center text-on-surface-variant p-20 text-center">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
                    <p className="text-2xl font-black uppercase italic tracking-tighter">Vault Empty</p>
                    <p className="text-sm opacity-50 mt-2 max-w-[300px]">Initialising more mischief for {activeLanguage?.label || "this locale"} soon.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- DATALINE DIVIDER --- */}
        <div className="w-full py-12 flex items-center justify-center relative opacity-90">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#ff4a8e]/40 to-transparent shadow-[0_0_15px_rgba(255,74,142,0.3)]"></div>
          
          <div className="relative bg-[#131313] px-8 py-2.5 border border-[#ff4a8e]/20 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(255,74,142,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4a8e] shadow-[0_0_10px_#ff4a8e] animate-pulse"></span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#ffb1c5]/80">
              Terminal Boundary
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4a8e] shadow-[0_0_10px_#ff4a8e] animate-pulse" style={{ animationDelay: "500ms" }}></span>
          </div>
        </div>

        {/* BOTTOM: Mischief Log (Column span 12) */}
        <section className="mt-4 break-inside-avoid">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-center justify-center bg-[#ff4a8e]/10 border border-[#ff4a8e]/20 w-16 h-16 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#ff4a8e] opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"></div>
                <span className="material-symbols-outlined text-[#ff4a8e] text-3xl font-light">radar</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-[2px] w-8 bg-[#ff4a8e]"></div>
                  <span className="text-[10px] text-[#ff4a8e] font-black uppercase tracking-[0.3em]">Sentinel Systems</span>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
                  Intercept Log
                </h3>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">
                  Global node transmission history
                </p>
              </div>
            </div>
            
            <div className="flex items-end gap-6 bg-[#161114] border border-[#ff4a8e]/10 px-6 py-4 rounded-2xl">
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50">Total</p>
                <p className="mt-1 text-2xl font-black text-white leading-none">{visibleCalls.length}</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10"></div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff4a8e]/70">Pending</p>
                <p className="mt-1 text-2xl font-black text-[#ffb1c5] leading-none">{runningCount}</p>
              </div>
            </div>
          </header>

          <div className="relative rounded-[2rem] border border-[#ff4a8e]/10 bg-[#120e10] shadow-[0_30px_80px_-20px_rgba(255,74,142,0.15)] overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#ff4a8e]/30 to-transparent"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 bg-[#171114] px-8 py-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ff4a8e] animate-pulse"></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  Live encrypted feed
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchCalls()}
                className="flex items-center gap-2 rounded-lg border border-[#ff4a8e]/20 bg-[#ff4a8e]/5 px-4 py-2 transition-all hover:bg-[#ff4a8e]/10 hover:border-[#ff4a8e]/30 active:scale-95 text-[#ffb1c5]"
              >
                <span className="material-symbols-outlined text-[14px]">sync</span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em]">Sync Data</span>
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#ff4a8e]/10 rounded-3xl bg-[#141012]">
                  <span className="material-symbols-outlined text-4xl text-[#ff4a8e] animate-spin mb-4">settings</span>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Decrypting Logs...</p>
                </div>
              ) : visibleCalls.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {visibleCalls.map((call) => {
                    const isSuccess = call.status === "accepted";
                    const isRunning = call.status === "running" || call.status === "queued" || call.status === "pending";
                    
                    const statusConfig = isSuccess
                      ? {
                          label: "Intercepted",
                          color: "text-emerald-400",
                          bg: "bg-emerald-400/10",
                          border: "border-emerald-400/20",
                          icon: "check_circle"
                        }
                      : isRunning
                        ? {
                            label: "Routing",
                            color: "text-[#ffd166]",
                            bg: "bg-[#ffd166]/10",
                            border: "border-[#ffd166]/20",
                            icon: "satellite_alt"
                          }
                        : {
                            label: "Failed",
                            color: "text-rose-400",
                            bg: "bg-rose-400/10",
                            border: "border-rose-400/20",
                            icon: "error"
                          };

                    return (
                      <article key={call._id} className="group relative flex flex-col gap-5 rounded-3xl border border-white/5 bg-[#181316] p-6 hover:border-[#ff4a8e]/20 hover:shadow-[0_0_30px_rgba(255,74,142,0.05)] transition-all">
                        
                        {/* Status Header */}
                        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.border} ${statusConfig.bg}`}>
                            <span className={`material-symbols-outlined text-[14px] ${statusConfig.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                              {statusConfig.icon}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <p className="text-[10px] font-mono font-medium text-white/40 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[12px] opacity-50 text-[#ffb1c5]">schedule</span>
                              {call.timeLabel || (call.timestamp ? new Date(call.timestamp * 1000).toLocaleString() : "Unknown")}
                            </p>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLog(call._id);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500/50 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              title="Purge record"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex flex-col md:flex-row md:items-center gap-6 mt-2">
                          {/* Left: Target Info */}
                          <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center">
                            {/* Mission / Title Tag */}
                            <div className="inline-flex items-center self-start gap-2 px-2.5 py-1 mb-4 rounded border border-[#ff4a8e]/30 bg-[#ff4a8e]/10 shadow-[0_0_20px_rgba(255,74,142,0.15)] relative overflow-hidden group/optag">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff4a8e]/10 to-transparent translate-x-[-100%] group-hover/optag:translate-x-[100%] transition-transform duration-1000"></div>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4a8e] animate-pulse shadow-[0_0_8px_#ff4a8e] relative z-10"></span>
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ffb1c5] truncate max-w-[220px] relative z-10">
                                OP: {call.titulo}
                              </span>
                            </div>
                            
                            {/* Subject Dossier Block */}
                            <div className="pl-4 relative">
                               <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/5 rounded-full overflow-hidden">
                                 <div className="w-full h-1/3 bg-gradient-to-b from-[#ff4a8e] to-[#ff4a8e]/0 shadow-[0_0_10px_#ff4a8e] rounded-full"></div>
                               </div>
                               
                               <div className="flex items-center gap-2 mb-1 opacity-60">
                                 <span className="material-symbols-outlined text-[10px] text-[#ffb1c5]">person_search</span>
                                 <p className="text-[8px] font-bold text-[#ffb1c5] tracking-[0.3em] uppercase leading-none mt-[1px]">Subject Identifier</p>
                               </div>
                               
                               <h4 className="text-3xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter italic text-white truncate leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]">
                                 {call.targetName || "UNKNOWN"}
                               </h4>
                               
                               {call.targetPhone && (
                                 <div className="mt-3 flex items-center gap-2.5 bg-white/5 self-start inline-flex pl-1 pr-3 py-1 rounded border border-white/5 hook-card group-hover:border-white/10 transition-colors">
                                   <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-black/40 text-white/50">
                                     <span className="material-symbols-outlined text-[12px]">dialpad</span>
                                   </div>
                                   <p className="text-xs font-mono font-medium text-white/70 tracking-widest">
                                     {call.targetPhone}
                                   </p>
                                 </div>
                               )}
                            </div>
                          </div>

                          {/* Right: Action/State Area */}
                          <div className="w-full md:w-[60%] shrink-0">
                            {isSuccess && call.isPlayable ? (
                              <div className="relative bg-[#0d0a0b]/80 rounded-[1.25rem] p-5 border border-[#ff4a8e]/10 shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)] overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff4a8e]/30 to-transparent"></div>
                                <DashboardAudioPlayer url={call.url} titulo={call.titulo} />
                              </div>
                            ) : isRunning ? (
                              <div className="flex flex-col justify-center items-center gap-3 bg-[#140e11] rounded-2xl p-5 border border-[#ffd166]/10 h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[#ffd166]/70 animate-spin text-lg">cyclone</span>
                                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd166]/80">
                                    Establishing Connection
                                  </p>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full w-1/2 bg-[#ffd166]/50 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col justify-center items-center gap-2 bg-[#140e11] rounded-2xl p-5 border border-rose-500/10 h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                                <span className="material-symbols-outlined text-rose-500/50 text-2xl">call_end</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-500/70 text-center">
                                  Transmission Lost
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-[#ff4a8e]/20 bg-[#161114]">
                  <div className="w-20 h-20 mb-6 rounded-full bg-[#ff4a8e]/5 border border-[#ff4a8e]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#ff4a8e] opacity-50">visibility_off</span>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight text-white mb-2">No Intercepts Found</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffb1c5]/60 max-w-sm text-center">
                    Initiate a sequence from the scenario vault to begin tracking.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
};
