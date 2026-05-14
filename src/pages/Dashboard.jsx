import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, localeToCountry, localeToLanguage } from "../lib/data";
import { API_CONFIG, createSession, getDialplan, getDialplanList, createTask } from "../lib/api";
import { LOCAL_LANGUAGE_OPTIONS, countryToLocale, getLocalPranksForCountry } from "../lib/prankLibrary";
import Icon from "../components/Icon";
import Flag from "../components/Flag";
import AudioPlayer from "../components/AudioPlayer";
import StatusPill from "../components/StatusPill";

const isValidDialPrefix = (value) => /^\+?\d{1,4}$/.test(value.trim());
const normaliseDialString = (prefix, value) => `+${prefix.replace(/\D/g, "")}${value.replace(/\D/g, "")}`;

const normalizeLocale = (value) => String(value || "").replace("_", "-");

const Dashboard = () => {
  const [subject, setSubject] = useState("Marcus Cole");
  const [dialPrefix, setDialPrefix] = useState("+1");
  const [number, setNumber] = useState("(415) 555-0182");
  const [locale, setLocale] = useState("en-US");
  const [scenarioId, setScenarioId] = useState(null);
  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultCategory, setVaultCategory] = useState("All");
  const [activity, setActivity] = useState([]);
  const [toast, setToast] = useState(null);
  const [logFilter, setLogFilter] = useState("All");
  const [selectedLogId, setSelectedLogId] = useState(null);

  // Real backend state
  const [session, setSession] = useState(null);
  const [dialplan, setDialplan] = useState([]);
  const [status, setStatus] = useState("initialising");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [planSource, setPlanSource] = useState("local");
  const [apiMessage, setApiMessage] = useState("Connecting to backend...");
  const [languages, setLanguages] = useState(LOCAL_LANGUAGE_OPTIONS);

  const activeLanguage = useMemo(() => {
    const country = localeToCountry(locale);
    return languages.find((item) => normalizeLocale(item.locale) === locale)
      || languages.find((item) => item.country === country)
      || LOCAL_LANGUAGE_OPTIONS.find((item) => normalizeLocale(item.locale) === locale)
      || LOCAL_LANGUAGE_OPTIONS[0];
  }, [languages, locale]);

  const activeCountry = activeLanguage?.country || localeToCountry(locale);
  const activeLocale = normalizeLocale(activeLanguage?.locale || locale || countryToLocale(activeCountry));

  // Toast lifetime
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // 1. Session init
  useEffect(() => {
    let cancelled = false;
    setStatus("initialising");
    setSession(null);
    setApiMessage("Connecting to backend...");
    (async () => {
      try {
        const s = await createSession({
          country: activeCountry,
          language: localeToLanguage(activeLocale),
        });
        if (cancelled) return;
        setSession(s);
        setStatus("ready");
        setApiMessage(API_CONFIG.usesLocalMock ? "Local mock backend is active. Set VITE_API_PROXY_TARGET only when you want a live backend." : "Backend session is ready.");
      } catch (error) {
        if (!cancelled) {
          setSession(null);
          setStatus("error");
          setApiMessage(error?.message || "Backend is not reachable.");
          setToast({ type: "error", msg: "Backend offline. The vault is available in local preview mode." });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [activeCountry, activeLocale]);

  // 2. Fetch available languages, then load pranks for the selected language.
  useEffect(() => {
    if (!session) {
      setLanguages(LOCAL_LANGUAGE_OPTIONS);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await getDialplanList({ did: session.did, uid: session.uid });
        if (cancelled || !list.length) return;
        setLanguages(list.map((item) => ({
          ...item,
          country: item.country || item.code,
          code: item.code || item.country,
          locale: normalizeLocale(item.locale) || countryToLocale(item.country || item.code),
          flag: item.flag || (item.country || item.code || "us").toUpperCase(),
          label: item.label || item.tname || item.name || (item.country || item.code || "US").toUpperCase(),
        })));
      } catch {
        if (!cancelled) setLanguages(LOCAL_LANGUAGE_OPTIONS);
      }
    })();

    return () => { cancelled = true; };
  }, [session]);

  // 3. Fetch dial plan when language or session changes
  useEffect(() => {
    const fallbackPlan = getLocalPranksForCountry(activeCountry);
    const ensureSelection = (plan) => {
      setScenarioId((current) => (plan.some((item) => item._id === current) ? current : plan[0]?._id || null));
    };

    if (!session) {
      setDialplan(fallbackPlan);
      setPlanSource("local");
      ensureSelection(fallbackPlan);
      return;
    }

    let cancelled = false;
    setLoadingPlan(true);
    (async () => {
      try {
        const plan = await getDialplan({ country: activeCountry, uid: session.uid, selectedCountry: activeCountry });
        if (cancelled) return;
        const usablePlan = plan.length ? plan : fallbackPlan;
        setDialplan(usablePlan);
        setPlanSource(plan.length ? "api" : "local");
        setApiMessage(plan.length ? (API_CONFIG.usesLocalMock ? "Local mock dial plan loaded. Runs are queued locally without recordings." : "Live dial plan loaded.") : "Backend returned an empty dial plan; showing local preview data.");
        ensureSelection(usablePlan);
      } catch (error) {
        if (!cancelled) {
          setDialplan(fallbackPlan);
          setPlanSource("local");
          setApiMessage(error?.message || "Dial plan could not be loaded.");
          ensureSelection(fallbackPlan);
          setToast({ type: "error", msg: "Dial plan unavailable. Showing local preview data." });
        }
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCountry, session]);

  // Map dialplan items to card format
  const toCard = useCallback((p) => ({
    id: p._id,
    dialId: p.dialId || p.dial_id || p.dial || p._id,
    title: p.titulo || "Untitled scenario",
    desc: p.descripcion || p.desc || p.description || p.titulo || "No description provided.",
    duration: p.duracion || 120,
    flag: p.flag || p.region || activeLanguage?.flag || "US",
    locale: normalizeLocale(p.locale) || activeLocale,
    region: p.region || p.country?.toUpperCase() || activeCountry.toUpperCase(),
    languageLabel: p.languageLabel || activeLanguage?.label || activeLocale,
    category: p.categoria || "Scenario",
    imageUrl: p.image_url || p.imageUrl || p.thumbnail || "",
    previewUrl: p.previewUrl || p.example || p.audiofile || p.audio_url || p.audioUrl || p.recording_url || p.recordingUrl || "",
    source: p.source || "api",
  }), [activeCountry, activeLanguage, activeLocale]);

  const vaultScenarios = useMemo(() => {
    let s = dialplan.map(toCard);
    if (vaultCategory !== "All") s = s.filter(x => x.category === vaultCategory);
    if (vaultQuery.trim()) {
      const q = vaultQuery.toLowerCase();
      s = s.filter(x => x.title.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q));
    }
    return s;
  }, [dialplan, toCard, vaultCategory, vaultQuery]);

  const allCats = useMemo(() => ["All", ...new Set(dialplan.map(p => p.categoria || "Scenario"))], [dialplan]);

  const selectedScenario = useMemo(() => {
    const p = dialplan.find(x => x._id === scenarioId);
    return p ? toCard(p) : null;
  }, [dialplan, scenarioId, toCard]);

  // 3. Real initiate
  const initiate = async () => {
    if (!subject.trim() || !number.trim()) { setToast({ type: "error", msg: "Subject and destination are required." }); return; }
    if (!isValidDialPrefix(dialPrefix)) { setToast({ type: "error", msg: "Use a numeric country prefix, such as +1." }); return; }
    const dialString = normaliseDialString(dialPrefix, number);
    if (dialString.replace(/\D/g, "").length < 8) { setToast({ type: "error", msg: "Enter a full destination number." }); return; }
    const scenario = dialplan.find(p => p._id === scenarioId) || dialplan[0];
    if (!scenario) { setToast({ type: "error", msg: "No scenario selected." }); return; }
    if (!session) { setToast({ type: "error", msg: "Session not ready." }); return; }
    if (planSource !== "api") { setToast({ type: "error", msg: "Connect a live backend before starting a run." }); return; }

    setLaunching(true);
    const scenarioCountry = String(scenario.country || scenario.region || activeCountry).toLowerCase();
    const scenarioLocale = normalizeLocale(scenario.locale) || countryToLocale(scenarioCountry);
    const localeObj = languages.find(l => l.country === scenarioCountry) || LOCALES.find(l => l.code === scenarioLocale) || activeLanguage;
    const rowId = "evt_" + Date.now().toString(36);
    const row = {
      id: rowId,
      scenario: scenario.titulo,
      subject,
      number: dialString,
      locale: scenarioLocale,
      flag: scenario.flag || localeObj?.flag || scenarioCountry.toUpperCase(),
      status: "routing",
      duration: 0,
      started: new Date().toISOString(),
      message: "Submitting request to backend.",
      audioUrl: null,
    };
    setActivity(prev => [row, ...prev]);
    setSelectedLogId(rowId);

    try {
      const { outcome } = await createTask({ uid: session.uid, country: scenarioCountry, scenario, subject, phone: dialString });
      setActivity(prev => prev.map(a => a.id === rowId ? {
        ...a,
        status: outcome.status,
        duration: outcome.status === "recorded" ? outcome.duration || scenario.duracion || 0 : 0,
        audioUrl: outcome.audioUrl,
        message: outcome.message,
      } : a));

      const toastType = outcome.status === "recorded" ? "success" : outcome.status === "queued" ? "neutral" : "error";
      setToast({ type: toastType, msg: outcome.message });
    } catch (error) {
      const message = error?.message || "Network error";
      setActivity(prev => prev.map(a => a.id === rowId ? { ...a, status: "failed", message } : a));
      setToast({ type: "error", msg: message });
    } finally {
      setLaunching(false);
    }
  };

  const purgeAll = () => { setActivity([]); setToast({ type: "neutral", msg: "Activity log purged" }); };
  const localeObj = activeLanguage;
  const launchDisabled = launching || status !== "ready" || planSource !== "api" || !dialplan.length;
  const selectedLogStatus = logFilter.toLowerCase().replace(/\s+/g, "_");
  const visibleActivity = activity.filter((item) => logFilter === "All" || item.status === selectedLogStatus);

  return (
    <main style={{ paddingTop: 24, paddingBottom: 64 }}>
      <div className="shell">
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="kicker">Console / Run orchestrator</span>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 560, fontSize: 38, letterSpacing: "-0.024em", color: "var(--ink)" }}>Configure a run</h1>
            <p className="small" style={{ color: "var(--ink-4)", margin: 0 }}>Workspace: <span className="mono" style={{ color: "var(--ink-2)" }}>nw-behav-labs / production</span></p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="surface-flat" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", height: 34 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: status === "ready" ? "var(--ok)" : status === "error" ? "var(--bad)" : "var(--warn)" }} />
              <span className="micro mono" style={{ color: "var(--ink-3)" }}>{status === "ready" ? `uid ${session?.uid.slice(0, 8)}...` : status === "preview" ? "preview" : status === "error" ? "offline" : "connecting..."}</span>
            </div>
            <button className="btn btn-ghost btn-sm" type="button"><Icon name="settings" size={14} />Settings</button>
          </div>
        </div>

        <div className={`api-notice ${status === "ready" && planSource === "api" ? "api-notice-ok" : "api-notice-warn"}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Icon name={status === "ready" && planSource === "api" ? "check" : "shield"} size={14} />
            <span className="small" style={{ color: "var(--ink-2)" }}>{apiMessage}</span>
          </div>
          <span className="chip mono">{API_CONFIG.usesLocalMock ? "local mock" : planSource === "api" ? "live backend" : "local preview"}</span>
        </div>

        {/* Top grid */}
        <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "flex-start" }}>
          {/* Configure Run sidebar */}
          <div className="dash-configure surface" style={{ position: "sticky", top: 92, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="kicker">Configure run</span>
              <span className="chip mono">draft</span>
            </div>
            <div className="field">
              <label className="field-label">Subject name<span className="field-hint">required</span></label>
              <input className="control" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Marcus Cole" />
            </div>
            <div className="field">
              <label className="field-label">Destination number<span className="field-hint">E.164</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 6 }}>
                <input className="control" value={dialPrefix} onChange={(e) => setDialPrefix(e.target.value)} style={{ textAlign: "center", fontFamily: "var(--font-mono)" }} />
                <input className="control" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="(415) 555-0182" />
              </div>
            </div>
            <LocaleSelect value={locale} options={languages} onChange={(v) => { setLocale(v); setScenarioId(null); }} />
            <div className="field">
              <label className="field-label">Selected scenario</label>
              {selectedScenario ? (
                <div style={{ padding: 14, border: "1px solid var(--accent-line)", background: "var(--accent-soft)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Flag code={selectedScenario.flag} size={20} />
                    <span className="mono" style={{ fontSize: 12, color: "oklch(0.86 0.08 14)" }}>{selectedScenario.dialId || selectedScenario.id?.slice(0, 8)}</span>
                    <span style={{ flex: 1 }} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>~{Math.round(selectedScenario.duration / 60)}:{String(selectedScenario.duration % 60).padStart(2, "0")}</span>
                  </div>
                  <div style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.35 }}>{selectedScenario.title}</div>
                  <div className="small" style={{ color: "var(--ink-3)", lineHeight: 1.5 }}>{selectedScenario.desc}</div>
                </div>
              ) : (
                <div className="surface-flat" style={{ padding: 12, color: "var(--ink-4)", fontSize: 13 }}>{loadingPlan ? "Loading…" : "Pick one from the vault →"}</div>
              )}
            </div>
            <button className="btn btn-primary btn-lg" onClick={initiate} type="button" disabled={launchDisabled} style={{ opacity: launchDisabled ? 0.55 : 1 }}>
              <Icon name="phone-out" size={14} stroke={2} />
              {launching ? "Starting..." : planSource !== "api" ? "Connect backend" : "Start run"}
            </button>
          </div>

          {/* Vault */}
          <div className="surface dash-vault" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="kicker">Scenario vault</span>
                  <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19, letterSpacing: "-0.015em", color: "var(--ink)" }}>
                    Language library <span style={{ color: "var(--ink-3)", fontSize: 14.5, marginLeft: 8 }}><Flag code={localeObj?.flag} size={20} /> {localeObj?.label}</span>
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <a className="btn btn-ghost btn-sm" href="#call-logs"><Icon name="activity" size={14} />Call logs</a>
                  <div className="control-prefix-wrap" style={{ width: 320 }}>
                    <span className="prefix"><Icon name="search" size={13} /></span>
                    <input className="control" placeholder="Find a scenario..." value={vaultQuery} onChange={(e) => setVaultQuery(e.target.value)} style={{ height: 34, paddingLeft: 34 }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allCats.map((c) => (
                  <button key={c} type="button" onClick={() => setVaultCategory(c)} style={{ height: 34, padding: "0 14px", borderRadius: 99, border: `1px solid ${vaultCategory === c ? "var(--accent-line)" : "var(--line)"}`, background: vaultCategory === c ? "var(--accent-soft)" : "transparent", color: vaultCategory === c ? "oklch(0.92 0.08 14)" : "var(--ink-3)", fontSize: 13, transition: "all 150ms ease" }}>
                    {c}{vaultCategory === c && <span className="mono" style={{ marginLeft: 8, color: "oklch(0.78 0.10 14)", fontSize: 10.5 }}>{vaultScenarios.length}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="dash-vault-grid" style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16, alignContent: "flex-start", flex: 1 }}>
              {vaultScenarios.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: 48, textAlign: "center", color: "var(--ink-4)", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                  <Icon name="search" size={22} style={{ color: "var(--ink-5)" }} />
                  <span className="small">{loadingPlan ? "Loading scenarios…" : "No scenarios match. Try clearing filters."}</span>
                </div>
              )}
              {vaultScenarios.map((s, i) => (
                <ScenarioCard key={s.id} scenario={s} selected={scenarioId === s.id} onSelect={() => setScenarioId(s.id)} seed={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div id="call-logs" className="surface" style={{ marginTop: 20, padding: 0, scrollMarginTop: 96 }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="kicker">Activity log</span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19, letterSpacing: "-0.015em", color: "var(--ink)" }}>{activity.length} runs</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "oklch(0.175 0.010 30)" }}>
                {["All", "Recorded", "Queued", "Routing", "No audio", "Failed"].map((f, idx) => (
                  <button key={f} type="button" onClick={() => setLogFilter(f)} style={{ height: 30, padding: "0 12px", borderLeft: idx === 0 ? "none" : "1px solid var(--line)", background: logFilter === f ? "var(--bg-3)" : "transparent", color: logFilter === f ? "var(--ink)" : "var(--ink-4)", fontSize: 12 }}>{f}</button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={purgeAll} type="button" style={{ color: "var(--bad)" }}><Icon name="trash" size={14} />Purge</button>
            </div>
          </div>
          <ActivityList items={visibleActivity} selectedId={selectedLogId} onSelect={setSelectedLogId} onDelete={(id) => setActivity(prev => prev.filter(a => a.id !== id))} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fade-up" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "oklch(0.20 0.011 30 / 0.96)", border: `1px solid ${toast.type === "error" ? "var(--bad)" : toast.type === "success" ? "var(--accent-line)" : "var(--line-2)"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, backdropFilter: "blur(12px)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          <Icon name={toast.type === "error" ? "x" : "check"} size={14} style={{ color: toast.type === "error" ? "var(--bad)" : toast.type === "success" ? "var(--accent)" : "var(--ink-3)" }} />
          <span className="small" style={{ color: "var(--ink)" }}>{toast.msg}</span>
        </div>
      )}
    </main>
  );
};

const THUMB_PALETTES = {
  Bureaucratic: ["oklch(0.36 0.065 224)", "oklch(0.22 0.030 35)", "oklch(0.78 0.115 66)"],
  Corporate: ["oklch(0.34 0.055 255)", "oklch(0.20 0.020 245)", "oklch(0.72 0.100 185)"],
  Domestic: ["oklch(0.42 0.075 145)", "oklch(0.22 0.032 72)", "oklch(0.80 0.090 128)"],
  Utility: ["oklch(0.43 0.065 88)", "oklch(0.21 0.025 35)", "oklch(0.82 0.120 84)"],
  Absurd: ["oklch(0.48 0.090 20)", "oklch(0.24 0.026 325)", "oklch(0.83 0.105 34)"],
  Scenario: ["oklch(0.36 0.045 225)", "oklch(0.20 0.018 30)", "oklch(0.72 0.085 160)"],
};

const ScenarioThumb = ({ scenario, seed }) => {
  const palette = THUMB_PALETTES[scenario.category] || THUMB_PALETTES.Scenario;
  const angle = 118 + ((seed * 31) % 48);
  return (
    <div
      className="scenario-thumb"
      style={{
        "--thumb-a": palette[0],
        "--thumb-b": palette[1],
        "--thumb-c": palette[2],
        "--thumb-angle": `${angle}deg`,
      }}
    >
      {scenario.imageUrl && <img className="scenario-thumb-img" src={scenario.imageUrl} alt="" loading="lazy" />}
      <div className="scenario-thumb-mark">
        <Flag code={scenario.flag} size={24} />
        <span className="mono">{scenario.region || scenario.locale}</span>
      </div>
      <span className="scenario-thumb-label">{scenario.category}</span>
    </div>
  );
};

// ── Scenario card (vault) ───────────────────────────────────────────
const ScenarioCard = ({ scenario, selected, onSelect, seed }) => (
  <div onClick={onSelect} role="button" tabIndex={0}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
    style={{
      padding: 0, border: `1px solid ${selected ? "var(--accent-line)" : "var(--line)"}`,
      background: selected ? "var(--accent-soft)" : "oklch(0.175 0.010 30)",
      borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden",
      cursor: "pointer", transition: "all 160ms ease",
      boxShadow: selected ? "0 0 0 3px var(--accent-soft)" : "none",
    }}
    onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "oklch(0.195 0.010 30)"; } }}
    onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "oklch(0.175 0.010 30)"; } }}
  >
    <ScenarioThumb scenario={scenario} seed={seed} />
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Flag code={scenario.flag} size={20} />
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-5)" }}>{scenario.dialId || scenario.id?.slice(0, 12)}</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-5)" }}>{scenario.locale}</span>
      </div>
      <h4 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 560, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.012em", lineHeight: 1.25 }}>{scenario.title}</h4>
      <p className="small" style={{ color: "var(--ink-3)", margin: 0, lineHeight: 1.55, minHeight: 52 }}>{scenario.desc}</p>
      <div onClick={(e) => e.stopPropagation()}>
        <AudioPlayer id={scenario.id} src={scenario.previewUrl} duration={scenario.duration} autoSeed={seed * 17} emptyLabel="Preview unavailable" />
      </div>
    </div>
  </div>
);


export default Dashboard;


// ── Locale select ───────────────────────────────────────────────────
const LocaleSelect = ({ value, options = LOCAL_LANGUAGE_OPTIONS, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const cur = options.find(l => normalizeLocale(l.locale) === value) || options[0];

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = q.trim()
    ? options.filter(l => `${l.label} ${l.locale} ${l.country}`.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div className="field" ref={ref} style={{ position: "relative" }}>
      <label className="field-label">Language<span className="field-hint">{options.length} regions</span></label>
      <button type="button" onClick={() => setOpen(o => !o)} className="control" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
        <Flag code={cur?.flag || cur?.country} size={22} />
        <span style={{ fontSize: 15 }}>{cur?.label}</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-5)", marginLeft: 4 }}>{cur?.locale}</span>
        <span style={{ flex: 1 }} />
        <Icon name="chev-d" size={14} style={{ color: "var(--ink-4)" }} />
      </button>
      {open && (
        <div className="surface-pop" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30, maxHeight: 320, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 8, borderBottom: "1px solid var(--line)" }}>
            <div className="control-prefix-wrap">
              <span className="prefix"><Icon name="search" size={13} /></span>
              <input className="control" autoFocus placeholder="Search languages..." value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 38, paddingLeft: 34, fontSize: 14 }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((l) => (
              <button key={l.country || l.code || l.locale} type="button" onClick={() => { onChange(normalizeLocale(l.locale) || countryToLocale(l.country || l.code)); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 12px", background: normalizeLocale(l.locale) === value ? "var(--accent-soft)" : "transparent", color: normalizeLocale(l.locale) === value ? "oklch(0.92 0.08 14)" : "var(--ink-2)", textAlign: "left", borderRadius: 0, cursor: "pointer", fontSize: 14 }}
                onMouseEnter={(e) => { if (normalizeLocale(l.locale) !== value) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (normalizeLocale(l.locale) !== value) e.currentTarget.style.background = "transparent"; }}>
                <Flag code={l.flag || l.country} size={22} /><span>{l.label}</span><span style={{ flex: 1 }} /><span className="mono" style={{ fontSize: 12, color: "var(--ink-5)" }}>{l.count ? `${l.count} scripts` : l.locale}</span>
                {normalizeLocale(l.locale) === value && <Icon name="check" size={14} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--ink-5)", fontSize: 14 }}>No languages match "{q}"</div>}
          </div>
        </div>
      )}
    </div>
  );
};


// ── Activity list ───────────────────────────────────────────────────
const ActivityList = ({ items, selectedId, onSelect, onDelete }) => {
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtDur = (s) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "—";

  if (items.length === 0) {
    return (
      <div style={{ padding: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--ink-4)" }}>
        <Icon name="activity" size={22} style={{ color: "var(--ink-5)" }} />
        <span className="small">No runs to show. Start a run to see the log fill in.</span>
      </div>
    );
  }

  return (
    <div className="activity-wrap">
      <div className="activity-head" style={{ display: "grid", gridTemplateColumns: "100px 80px 1.4fr 1fr 130px 110px 90px 100px", gap: 16, padding: "10px 20px", borderBottom: "1px solid var(--line)", background: "oklch(0.165 0.010 30)" }}>
        {["Run ID", "Locale", "Scenario", "Subject", "Number", "Started", "Duration", "Status"].map((h) => (
          <span key={h} className="micro" style={{ color: "var(--ink-5)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{h}</span>
        ))}
      </div>
      {items.map((a, i) => {
        const isSelected = a.id === selectedId;
        return (
          <div key={a.id}>
            <div className="activity-row" onClick={() => onSelect(a.id)} style={{ display: "grid", gridTemplateColumns: "100px 80px 1.4fr 1fr 130px 110px 90px 100px", gap: 16, padding: "12px 20px", alignItems: "center", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)", background: isSelected ? "oklch(0.205 0.011 30)" : "transparent", cursor: "pointer", transition: "background 120ms ease" }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "oklch(0.185 0.010 30)"; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.id}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Flag code={a.flag} size={14} /><span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.locale}</span></div>
              <span style={{ fontSize: 13.5, color: "var(--ink)" }} className="truncate">{a.scenario}</span>
              <span style={{ fontSize: 13, color: "var(--ink-2)" }} className="truncate">{a.subject}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.number}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>{fmtTime(a.started)}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{fmtDur(a.duration)}</span>
              <StatusPill status={a.status} />
            </div>
            {isSelected && a.status === "recorded" && (
              <div style={{ padding: "16px 20px", background: "oklch(0.17 0.010 30)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}><AudioPlayer id={a.id} src={a.audioUrl} duration={a.duration || 120} autoSeed={i * 13} emptyLabel="Recording unavailable" /></div>
                  {a.audioUrl ? (
                    <a className="btn btn-ghost btn-sm" href={a.audioUrl} download onClick={(e) => e.stopPropagation()}><Icon name="download" size={14} />Download</a>
                  ) : (
                    <button className="btn btn-ghost btn-sm" type="button" disabled><Icon name="download" size={14} />Download</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} type="button" style={{ color: "var(--bad)" }}><Icon name="trash" size={14} />Delete</button>
                </div>
              </div>
            )}
            {isSelected && a.status === "queued" && (
              <div style={{ padding: "14px 20px", background: "oklch(0.18 0.010 30)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-info"><span className="dot" />Queued</span>
                  <span className="micro mono" style={{ color: "var(--ink-4)" }}>{a.message || "Waiting for recording metadata from the backend."}</span>
                </div>
              </div>
            )}
            {isSelected && a.status === "routing" && (
              <div style={{ padding: "14px 20px", background: "oklch(0.18 0.010 30)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-warn pill-routing"><span className="dot" />Submitting</span>
                  <span className="micro mono" style={{ color: "var(--ink-4)" }}>{a.message || `locale=${a.locale}`}</span>
                </div>
              </div>
            )}
            {isSelected && a.status === "no_audio" && (
              <div style={{ padding: "14px 20px", background: "oklch(0.18 0.010 30)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-bad"><span className="dot" />No audio</span>
                  <span className="micro mono" style={{ color: "var(--ink-4)" }}>{a.message || "The backend did not return a playable recording URL."}</span>
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} type="button" style={{ color: "var(--bad)" }}><Icon name="trash" size={14} />Delete</button>
                </div>
              </div>
            )}
            {isSelected && a.status === "failed" && (
              <div style={{ padding: "14px 20px", background: "oklch(0.18 0.010 30)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-bad"><span className="dot" />Failed</span>
                  <span className="micro mono" style={{ color: "var(--ink-4)" }}>{a.message || "Request failed."}</span>
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} type="button" style={{ color: "var(--bad)" }}><Icon name="trash" size={14} />Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
