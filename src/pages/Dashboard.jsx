import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, SCENARIOS, localeToCountry, localeToLanguage } from "../lib/data";
import { API_CONFIG, createSession, getDialplan, createTask } from "../lib/api";
import Icon from "../components/Icon";
import Flag from "../components/Flag";
import AudioPlayer from "../components/AudioPlayer";
import StatusPill from "../components/StatusPill";

const scenarioToDialplan = (scenario) => ({
  _id: scenario.id,
  titulo: scenario.title,
  descripcion: scenario.desc,
  duracion: scenario.duration,
  categoria: scenario.category,
  previewUrl: scenario.previewUrl,
  source: "local",
});

const fallbackDialplanForLocale = (locale) => {
  const exact = SCENARIOS.filter((scenario) => scenario.locale === locale);
  if (exact.length) return exact.map(scenarioToDialplan);

  const country = localeToCountry(locale).toUpperCase();
  const sameCountry = SCENARIOS.filter((scenario) => scenario.region === country);
  return (sameCountry.length ? sameCountry : SCENARIOS).map(scenarioToDialplan);
};

const isValidDialPrefix = (value) => /^\+?\d{1,4}$/.test(value.trim());
const normaliseDialString = (prefix, value) => `+${prefix.replace(/\D/g, "")}${value.replace(/\D/g, "")}`;

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
          country: localeToCountry(locale),
          language: localeToLanguage(locale),
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
  }, [locale]);

  // 2. Fetch dial plan when locale or session changes
  useEffect(() => {
    const fallbackPlan = fallbackDialplanForLocale(locale);
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
        const plan = await getDialplan({ country: localeToCountry(locale), uid: session.uid });
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
  }, [locale, session]);

  // Map dialplan items to card format
  const toCard = useCallback((p) => ({
    id: p._id,
    title: p.titulo || "Untitled scenario",
    desc: p.descripcion || p.titulo || "No description provided.",
    duration: p.duracion || 120,
    flag: LOCALES.find(l => l.code === locale)?.flag || "US",
    locale,
    category: p.categoria || "Scenario",
    previewUrl: p.previewUrl || p.audio_url || p.audioUrl || p.recording_url || p.recordingUrl || "",
    source: p.source || "api",
  }), [locale]);

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
    const localeObj = LOCALES.find(l => l.code === locale);
    const rowId = "evt_" + Date.now().toString(36);
    const row = {
      id: rowId,
      scenario: scenario.titulo,
      subject,
      number: dialString,
      locale,
      flag: localeObj?.flag || "US",
      status: "routing",
      duration: 0,
      started: new Date().toISOString(),
      message: "Submitting request to backend.",
      audioUrl: null,
    };
    setActivity(prev => [row, ...prev]);
    setSelectedLogId(rowId);

    try {
      const { outcome } = await createTask({ uid: session.uid, country: localeToCountry(locale), scenario, subject, phone: dialString });
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
  const localeObj = LOCALES.find(l => l.code === locale);
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
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30, letterSpacing: "-0.022em", color: "var(--ink)" }}>Configure a run</h1>
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
        <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "flex-start" }}>
          {/* Configure Run sidebar */}
          <div className="dash-configure surface" style={{ position: "sticky", top: 80, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
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
            <LocaleSelect value={locale} onChange={(v) => { setLocale(v); setScenarioId(null); }} />
            <div className="field">
              <label className="field-label">Selected scenario</label>
              {selectedScenario ? (
                <div style={{ padding: 12, border: "1px solid var(--accent-line)", background: "var(--accent-soft)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Flag code={selectedScenario.flag} size={14} />
                    <span className="mono" style={{ fontSize: 10.5, color: "oklch(0.86 0.08 14)" }}>{selectedScenario.id?.slice(0, 8)}</span>
                    <span style={{ flex: 1 }} />
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>~{Math.round(selectedScenario.duration / 60)}:{String(selectedScenario.duration % 60).padStart(2, "0")}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink)" }}>{selectedScenario.title}</div>
                  <div className="micro" style={{ color: "var(--ink-3)", lineHeight: 1.5 }}>{selectedScenario.desc}</div>
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
          <div className="surface" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 720 }}>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="kicker">Scenario vault</span>
                  <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19, letterSpacing: "-0.015em", color: "var(--ink)" }}>
                    Routed to <Flag code={localeObj?.flag} size={16} /> <span style={{ color: "var(--ink-2)" }}>{localeObj?.label}</span>
                  </h2>
                </div>
                <div className="control-prefix-wrap" style={{ width: 240 }}>
                  <span className="prefix"><Icon name="search" size={13} /></span>
                  <input className="control" placeholder="Find a scenario…" value={vaultQuery} onChange={(e) => setVaultQuery(e.target.value)} style={{ height: 34, paddingLeft: 34 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allCats.map((c) => (
                  <button key={c} type="button" onClick={() => setVaultCategory(c)} style={{ height: 28, padding: "0 12px", borderRadius: 99, border: `1px solid ${vaultCategory === c ? "var(--accent-line)" : "var(--line)"}`, background: vaultCategory === c ? "var(--accent-soft)" : "transparent", color: vaultCategory === c ? "oklch(0.92 0.08 14)" : "var(--ink-3)", fontSize: 12, transition: "all 150ms ease" }}>
                    {c}{vaultCategory === c && <span className="mono" style={{ marginLeft: 8, color: "oklch(0.78 0.10 14)", fontSize: 10.5 }}>{vaultScenarios.length}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(264px, 1fr))", gap: 12, alignContent: "flex-start", flex: 1 }}>
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
        <div className="surface" style={{ marginTop: 20, padding: 0 }}>
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

// ── Scenario card (vault) ───────────────────────────────────────────
const ScenarioCard = ({ scenario, selected, onSelect, seed }) => (
  <div onClick={onSelect} role="button" tabIndex={0}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
    style={{
      padding: 14, border: `1px solid ${selected ? "var(--accent-line)" : "var(--line)"}`,
      background: selected ? "var(--accent-soft)" : "oklch(0.175 0.010 30)",
      borderRadius: 12, display: "flex", flexDirection: "column", gap: 10,
      cursor: "pointer", transition: "all 160ms ease",
      boxShadow: selected ? "0 0 0 3px var(--accent-soft)" : "none",
    }}
    onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "oklch(0.195 0.010 30)"; } }}
    onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "oklch(0.175 0.010 30)"; } }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Flag code={scenario.flag} size={14} />
      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-5)" }}>{scenario.id?.slice(0, 10)}</span>
      <span style={{ flex: 1 }} />
      <span className="chip" style={{ height: 18, fontSize: 10, padding: "0 7px" }}>{scenario.category}</span>
    </div>
    <h4 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14.5, color: "var(--ink)", letterSpacing: "-0.012em", lineHeight: 1.3 }}>{scenario.title}</h4>
    <p className="micro" style={{ color: "var(--ink-3)", margin: 0, lineHeight: 1.5, minHeight: 32 }}>{scenario.desc}</p>
    <div onClick={(e) => e.stopPropagation()}>
      <AudioPlayer id={scenario.id} src={scenario.previewUrl} duration={scenario.duration} compact autoSeed={seed * 17} emptyLabel="Preview unavailable" />
    </div>
  </div>
);


export default Dashboard;


// ── Locale select ───────────────────────────────────────────────────
const LocaleSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const cur = LOCALES.find(l => l.code === value);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = q.trim()
    ? LOCALES.filter(l => l.label.toLowerCase().includes(q.toLowerCase()) || l.code.toLowerCase().includes(q.toLowerCase()))
    : LOCALES;

  return (
    <div className="field" ref={ref} style={{ position: "relative" }}>
      <label className="field-label">Locale<span className="field-hint">{LOCALES.length} regions</span></label>
      <button type="button" onClick={() => setOpen(o => !o)} className="control" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
        <Flag code={cur?.flag} />
        <span style={{ fontSize: 13.5 }}>{cur?.label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-5)", marginLeft: 4 }}>{cur?.code}</span>
        <span style={{ flex: 1 }} />
        <Icon name="chev-d" size={14} style={{ color: "var(--ink-4)" }} />
      </button>
      {open && (
        <div className="surface-pop" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30, maxHeight: 320, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 8, borderBottom: "1px solid var(--line)" }}>
            <div className="control-prefix-wrap">
              <span className="prefix"><Icon name="search" size={13} /></span>
              <input className="control" autoFocus placeholder="Search locales…" value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 32, paddingLeft: 34, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((l) => (
              <button key={l.code} type="button" onClick={() => { onChange(l.code); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", background: l.code === value ? "var(--accent-soft)" : "transparent", color: l.code === value ? "oklch(0.92 0.08 14)" : "var(--ink-2)", textAlign: "left", borderRadius: 0, cursor: "pointer", fontSize: 13 }}
                onMouseEnter={(e) => { if (l.code !== value) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (l.code !== value) e.currentTarget.style.background = "transparent"; }}>
                <Flag code={l.flag} /><span>{l.label}</span><span style={{ flex: 1 }} /><span className="mono" style={{ fontSize: 11, color: "var(--ink-5)" }}>{l.code}</span>
                {l.code === value && <Icon name="check" size={13} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--ink-5)", fontSize: 13 }}>No locales match "{q}"</div>}
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
