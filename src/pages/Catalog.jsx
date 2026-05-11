import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "../context/RouterContext";
import Icon from "../components/Icon";
import Flag from "../components/Flag";
import AudioPlayer from "../components/AudioPlayer";
import { SCENARIOS } from "../lib/data";

const Catalog = () => {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [view, setView] = useState("grid");

  const regions = useMemo(() => ["All", ...new Set(SCENARIOS.map(s => s.region))], []);
  const cats = useMemo(() => ["All", ...new Set(SCENARIOS.map(s => s.category))], []);

  const results = useMemo(() => {
    let s = [...SCENARIOS];
    if (region !== "All") s = s.filter(x => x.region === region);
    if (category !== "All") s = s.filter(x => x.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      s = s.filter(x => x.title.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q) || x.locale.toLowerCase().includes(q));
    }
    if (sort === "Longest") s.sort((a, b) => b.duration - a.duration);
    else if (sort === "Shortest") s.sort((a, b) => a.duration - b.duration);
    else if (sort === "A → Z") s.sort((a, b) => a.title.localeCompare(b.title));
    return s;
  }, [query, region, category, sort]);

  return (
    <main style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="shell">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, maxWidth: 760 }}>
          <span className="kicker">Catalog · v 4.2</span>
          <h1 className="h-1">Scenario library</h1>
          <p className="lead">Peer-reviewed, locale-bound voice scripts. Preview any entry; one click hands it to the console.</p>
        </div>

        {/* Search row */}
        <div className="catalog-toolbar" style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <div className="control-prefix-wrap">
            <span className="prefix"><Icon name="search" size={14} /></span>
            <input className="control" placeholder="Search 1,284 scenarios by title, locale, or keyword…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ height: 44, paddingLeft: 40, fontSize: 14.5 }} />
          </div>
          <Dropdown label="Region" value={region} options={regions} onChange={setRegion} renderOption={(o) => o === "All" ? <span>All regions</span> : <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Flag code={o} />{o}</span>} />
          <Dropdown label="Category" value={category} options={cats} onChange={setCategory} />
          <Dropdown label="Sort" value={sort} options={["Newest", "Longest", "Shortest", "A → Z"]} onChange={setSort} />
          <div style={{ display: "flex", border: "1px solid var(--line)", background: "oklch(0.175 0.010 30)", borderRadius: 8, overflow: "hidden", height: 44 }}>
            {[{ v: "grid", i: "stack" }, { v: "list", i: "filter" }].map((m) => (
              <button key={m.v} type="button" onClick={() => setView(m.v)} style={{ width: 44, display: "grid", placeItems: "center", background: view === m.v ? "var(--bg-3)" : "transparent", color: view === m.v ? "var(--ink)" : "var(--ink-4)", borderRight: m.v === "grid" ? "1px solid var(--line)" : "none" }}>
                <Icon name={m.i} size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="small" style={{ color: "var(--ink-3)" }}><span className="numeric" style={{ color: "var(--ink)", fontWeight: 500 }}>{results.length}</span> result{results.length === 1 ? "" : "s"}</span>
            {(query || region !== "All" || category !== "All") && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setQuery(""); setRegion("All"); setCategory("All"); }}><Icon name="x" size={13} />Clear filters</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["en-US (US)", "fr-FR (FR)", "de-DE (DE)", "ja-JP (JP)", "pt-BR (BR)"].map((s) => <span key={s} className="chip mono">{s}</span>)}
            <span className="micro" style={{ color: "var(--ink-5)", alignSelf: "center" }}>· popular regions</span>
          </div>
        </div>

        {/* Results */}
        {view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {results.map((s, i) => <CatalogCard key={s.id} scenario={s} seed={i} />)}
          </div>
        ) : (
          <div className="surface catalog-list-wrap" style={{ padding: 0 }}>
            <div className="catalog-list-head" style={{ display: "grid", gridTemplateColumns: "70px 80px 1.6fr 1fr 130px 90px 220px 100px", gap: 12, padding: "10px 20px", background: "oklch(0.165 0.010 30)", borderBottom: "1px solid var(--line)" }}>
              {["ID", "Locale", "Title", "Description", "Category", "Length", "Preview", ""].map((h) => (
                <span key={h} className="micro" style={{ color: "var(--ink-5)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{h}</span>
              ))}
            </div>
            {results.map((s, i) => (
              <div key={s.id} className="catalog-list-row" style={{ display: "grid", gridTemplateColumns: "70px 80px 1.6fr 1fr 130px 90px 220px 100px", gap: 12, padding: "14px 20px", alignItems: "center", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-5)" }}>{s.id}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Flag code={s.flag} size={14} /><span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{s.locale}</span></div>
                <span style={{ fontSize: 13.5, color: "var(--ink)", minWidth: 0 }} className="truncate">{s.title}</span>
                <span className="small truncate" style={{ color: "var(--ink-4)", minWidth: 0 }}>{s.desc}</span>
                <span className="chip" style={{ height: 20, fontSize: 10.5 }}>{s.category}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{`${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, "0")}`}</span>
                <AudioPlayer id={s.id} duration={s.duration} compact autoSeed={i * 19} />
                <button className="btn btn-secondary btn-sm" type="button">Use →</button>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && (
          <div style={{ padding: 96, textAlign: "center", color: "var(--ink-4)", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <Icon name="search" size={28} style={{ color: "var(--ink-5)" }} />
            <span className="h-3" style={{ color: "var(--ink-3)" }}>No scenarios match.</span>
            <span className="small">Try clearing filters or searching by locale code.</span>
          </div>
        )}
      </div>
    </main>
  );
};

const CatalogCard = ({ scenario, seed }) => (
  <article className="surface hover-lift" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ height: 120, position: "relative", overflow: "hidden", borderBottom: "1px solid var(--line)" }}>
      <ScenarioArtwork seed={seed} flag={scenario.flag} category={scenario.category} />
      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
        <span className="chip mono" style={{ background: "oklch(0.12 0.008 30 / 0.7)", backdropFilter: "blur(8px)" }}><Flag code={scenario.flag} size={12} />{scenario.locale}</span>
      </div>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <span className="chip" style={{ background: "oklch(0.12 0.008 30 / 0.7)", backdropFilter: "blur(8px)" }}>{scenario.category}</span>
      </div>
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-5)" }}>{scenario.id}</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-5)" }}>{`${Math.floor(scenario.duration / 60)}:${String(scenario.duration % 60).padStart(2, "0")}`}</span>
      </div>
      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 16, color: "var(--ink)", letterSpacing: "-0.014em", lineHeight: 1.25 }}>{scenario.title}</h3>
      <p className="small" style={{ color: "var(--ink-4)", margin: 0, lineHeight: 1.45, flex: 1 }}>{scenario.desc}</p>
      <div style={{ marginTop: 4 }}><AudioPlayer id={scenario.id} duration={scenario.duration} compact autoSeed={seed * 23} /></div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Use in run <Icon name="arrow" size={12} stroke={2} /></Link>
        <button className="btn btn-ghost btn-sm" type="button"><Icon name="share" size={13} /></button>
        <button className="btn btn-ghost btn-sm" type="button"><Icon name="more" size={14} /></button>
      </div>
    </div>
  </article>
);

const ScenarioArtwork = ({ seed, category }) => {
  let s = (seed + 1) * 2654435761 >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s & 0xffff) / 0xffff; };
  const palette = { Bureaucratic: ["oklch(0.62 0.10 60)", "oklch(0.40 0.08 50)"], Corporate: ["oklch(0.55 0.13 240)", "oklch(0.35 0.10 250)"], Domestic: ["oklch(0.68 0.13 130)", "oklch(0.45 0.10 140)"], Utility: ["oklch(0.65 0.13 80)", "oklch(0.42 0.09 75)"], Absurd: ["oklch(0.62 0.16 320)", "oklch(0.40 0.12 300)"] }[category] || ["oklch(0.55 0.10 30)", "oklch(0.35 0.08 30)"];
  const elements = Array.from({ length: 4 }, () => ({ cx: r() * 100, cy: r() * 100, rx: 18 + r() * 28, ry: 18 + r() * 28, c: r() > 0.5 ? palette[0] : palette[1], o: 0.45 + r() * 0.45 }));
  const lines = Array.from({ length: 5 }, (_, i) => ({ y: 18 + i * 14 + r() * 4, x1: -8 + r() * 15, x2: 92 + r() * 15, o: 0.08 + r() * 0.12 }));
  return (
    <div style={{ width: "100%", height: "100%", background: "oklch(0.17 0.010 30)", position: "relative", overflow: "hidden" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs><filter id={`blur-${seed}`}><feGaussianBlur stdDeviation="6" /></filter></defs>
        <g filter={`url(#blur-${seed})`}>{elements.map((e, i) => <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={e.c} opacity={e.o} />)}</g>
        {lines.map((l, i) => <path key={i} d={`M ${l.x1} ${l.y} Q 50 ${l.y - 8 + r() * 16}, ${l.x2} ${l.y}`} fill="none" stroke="oklch(0.96 0.005 60)" strokeOpacity={l.o} strokeWidth="0.3" />)}
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, oklch(0.16 0.010 30) 100%)" }} />
    </div>
  );
};

const Dropdown = ({ label, value, options, onChange, renderOption }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const render = renderOption || ((o) => <span>{o}</span>);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="control" style={{ height: 44, display: "flex", alignItems: "center", gap: 10, paddingRight: 12, cursor: "pointer", width: "auto", minWidth: 140 }}>
        <span className="micro" style={{ color: "var(--ink-5)" }}>{label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink)" }}>{render(value)}</span>
        <Icon name="chev-d" size={13} style={{ color: "var(--ink-4)", marginLeft: 4 }} />
      </button>
      {open && (
        <div className="surface-pop" style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 200, maxHeight: 320, overflow: "auto", zIndex: 30 }}>
          {options.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: o === value ? "var(--accent-soft)" : "transparent", color: o === value ? "oklch(0.92 0.08 14)" : "var(--ink-2)", textAlign: "left", borderRadius: 0, fontSize: 13, cursor: "pointer" }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (o !== value) e.currentTarget.style.background = "transparent"; }}>
              {render(o)}<span style={{ flex: 1 }} />{o === value && <Icon name="check" size={13} style={{ color: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
