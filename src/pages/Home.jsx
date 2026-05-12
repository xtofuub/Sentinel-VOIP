import { Link } from "../context/RouterContext";
import Icon from "../components/Icon";
import Flag from "../components/Flag";
import { LogoMark, Wordmark } from "../components/LogoMark";
import SectionHeader from "../components/SectionHeader";
import AudioPlayer from "../components/AudioPlayer";
import StatusPill from "../components/StatusPill";
import { SCENARIOS, ACTIVITY } from "../lib/data";

const Home = () => (
  <main>
    <Hero />
    <LogoStrip />
    <ProductPanel />
    <FeatureGrid />
    <CatalogPreview />
    <ApiBlock />
    <HowItWorks />
    <Testimonials />
    <CTABanner />
  </main>
);

const Hero = () => (
  <section style={{ position: "relative", paddingTop: 96, paddingBottom: 64, overflow: "hidden" }}>
    <div className="bg-aurora" />
    <div className="grid-bg" />
    <div className="shell" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 880, display: "flex", flexDirection: "column", gap: 26 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{
          alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 10,
          height: 28, padding: "0 4px 0 12px", borderRadius: 99,
          border: "1px solid var(--line-2)", background: "oklch(0.20 0.012 30 / 0.6)", backdropFilter: "blur(6px)",
        }}>
          <span className="micro mono" style={{ color: "var(--ink-3)" }}>v 4.2 · Locale routing for 64 regions</span>
          <span className="chip" style={{ height: 20, fontSize: 10.5, borderColor: "var(--accent-line)", background: "var(--accent-soft)", color: "oklch(0.92 0.08 14)" }}>
            <Icon name="arrow" size={11} stroke={2} />
          </span>
        </a>
        <h1 className="h-display">
          Operator-grade<br/>
          <span style={{ color: "var(--ink-3)" }}>VOIP scenario routing,</span><br/>
          built for controlled studies.
        </h1>
        <p className="lead" style={{ maxWidth: 600 }}>
          Sentinel routes parameterised voice scenarios to a subject across 64 locales, captures full
          waveform recordings and timing telemetry, and hands you a console designed for review &mdash;
          not theatrics.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          <Link to="/dashboard" className="btn btn-primary btn-lg">Open the console <Icon name="arrow" size={14} stroke={2} /></Link>
          <Link to="/catalog" className="btn btn-secondary btn-lg"><Icon name="book" size={14} />Browse the catalog</Link>
          <button className="btn btn-ghost btn-lg" type="button"><Icon name="phone" size={14} />Watch a 90&hairsp;s run</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--line-soft)" }}>
          {[{ k: "Locales", v: "64" }, { k: "Scenarios in catalog", v: "1,284" }, { k: "Avg. routing latency", v: "412 ms" }, { k: "Uptime, trailing 90d", v: "99.992%" }].map((s) => (
            <div key={s.k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="numeric" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 500, letterSpacing: "-0.02em" }}>{s.v}</span>
              <span className="micro" style={{ color: "var(--ink-4)" }}>{s.k}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const LogoStrip = () => {
  const logos = ["Heidelberg Institute", "Northwood Labs", "Caltech CPHS", "ETH Zürich", "Janus Foundation", "Cambridge SBHL", "Sema·Lingua"];
  return (
    <section style={{ padding: "16px 0 64px" }}>
      <div className="shell" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
        <span className="micro" style={{ color: "var(--ink-5)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Trusted by research teams running protocol-bound studies</span>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 44, alignItems: "center", opacity: 0.78 }}>
          {logos.map((l, i) => (
            <span key={l} style={{ fontFamily: i % 2 === 0 ? "var(--font-display)" : "var(--font-mono)", fontWeight: i % 2 === 0 ? 600 : 500, fontSize: i % 2 === 0 ? 17 : 13, color: "var(--ink-4)", letterSpacing: i % 2 === 0 ? "-0.02em" : "0.04em" }}>{l}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

const ProductPanel = () => (
  <section style={{ padding: "0 0 96px", position: "relative" }}>
    <div className="shell" style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: "-40px -40px 40px", background: "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.74 0.16 14 / 0.18), transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div className="surface-pop" style={{ position: "relative", zIndex: 1, overflow: "hidden", padding: 0, borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)", background: "oklch(0.165 0.010 30)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "oklch(0.40 0.012 30)" }} />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "oklch(0.40 0.012 30)" }} />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "oklch(0.40 0.012 30)" }} />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-5)", background: "oklch(0.195 0.010 30)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--line)" }}>app.sentinel-voip.io/console</span>
          </div>
          <div style={{ width: 60 }} />
        </div>
        <ConsoleMock />
      </div>
    </div>
  </section>
);

const ConsoleMock = () => {
  const sample = SCENARIOS.slice(0, 6);
  const activity = ACTIVITY.slice(0, 4);
  return (
    <div className="console-mock" style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 540, background: "var(--bg)" }}>
      <div style={{ padding: 22, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="kicker">Configure run</span>
        <div className="field"><label className="field-label">Subject<span className="field-hint">required</span></label><input className="control" defaultValue="Marcus Cole" readOnly /></div>
        <div className="field"><label className="field-label">Destination</label><div className="control-prefix-wrap"><span className="prefix">+1</span><input className="control" defaultValue="(415) 555-0182" readOnly /></div></div>
        <div className="field"><label className="field-label">Locale</label><div className="control" style={{ display: "flex", alignItems: "center", gap: 8 }}><Flag code="US" /><span style={{ fontSize: 13.5 }}>English (United States)</span><span style={{ flex: 1 }} /><Icon name="chev-d" size={14} style={{ color: "var(--ink-4)" }} /></div></div>
        <div className="field"><label className="field-label">Scenario<span className="field-hint">selected</span></label><div style={{ padding: "10px 12px", border: "1px solid var(--accent-line)", background: "var(--accent-soft)", borderRadius: 8 }}><span className="mono" style={{ fontSize: 10.5, color: "oklch(0.88 0.08 14)" }}>scn_002</span><div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 2 }}>Tier-3 IT Escalation</div></div></div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" type="button"><Icon name="phone-out" size={14} stroke={2} />Start run</button>
        <span className="micro" style={{ color: "var(--ink-5)", textAlign: "center" }}>Cost: 1 credit · 248 remaining</span>
      </div>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="kicker">Scenario vault · en-US</span>
          <div style={{ display: "flex", gap: 6 }}><span className="chip mono">22 in region</span><span className="chip mono">3 categories</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {sample.map((s, i) => (
            <div key={s.id} style={{ padding: 12, border: `1px solid ${i === 1 ? "var(--accent-line)" : "var(--line)"}`, background: i === 1 ? "var(--accent-soft)" : "oklch(0.175 0.010 30)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Flag code={s.flag} size={14} /><span className="mono" style={{ fontSize: 10, color: "var(--ink-5)" }}>{s.id}</span><span style={{ flex: 1 }} /><Icon name={i === 1 ? "pause" : "play"} size={11} style={{ color: "var(--ink-3)" }} /></div>
              <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.3 }}>{s.title}</div>
              <div className="micro" style={{ color: "var(--ink-5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="divider-soft" style={{ marginTop: 4 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span className="kicker">Activity log</span><span className="micro" style={{ color: "var(--ink-5)" }}>auto-refresh · 2s</span></div>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {activity.map((a, i) => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 12, alignItems: "center", padding: "10px 12px", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)", background: i % 2 === 0 ? "oklch(0.175 0.010 30)" : "transparent" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-5)" }}>{a.id}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><Flag code={a.flag} size={14} /><span style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.scenario}</span></div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.number}</span>
              <StatusPill status={a.status} />
              <Icon name="more" size={14} style={{ color: "var(--ink-4)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FeatureGrid = () => (
  <section style={{ padding: "64px 0" }}>
    <div className="shell">
      <SectionHeader kicker="Why operators choose Sentinel" title={<>A console you can <span style={{ color: "var(--ink-4)" }}>actually run a study from.</span></>} lead="Locale-correct routing, deterministic scenarios, full-fidelity recording. No theatrics, no surprises in the audit trail." />
      <div className="cols-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { i: "globe", h: "64 locale-correct routes", b: "Each scenario carries its locale, dial plan, and voice profile. Routes are validated before the trunk is opened." },
          { i: "waveform", h: "Full-fidelity recording", b: "16-bit PCM captures with diarised timing telemetry. Replay, share, or export to your compliance bucket." },
          { i: "shield", h: "Protocol-bound by default", b: "Subjects opt in via signed consent; recordings expire on a schedule you set. No silent retention." },
          { i: "stack", h: "Deterministic scenarios", b: "Versioned, reviewed, signed off. The script that ran last Tuesday is the one that runs today." },
          { i: "code", h: "Operator REST + webhooks", b: "Launch from the console, your notebook, or a queue. Status posts back to the URL you nominate." },
          { i: "infinity", h: "Concurrency without the rate-limit dance", b: "Pool-based concurrency with per-locale quotas. Hit the API as fast as your IRB will permit." },
        ].map((f) => (
          <div key={f.h} className="surface hover-lift" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid var(--line-2)", background: "oklch(0.18 0.010 30)", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><Icon name={f.i} size={18} /></span>
            <h3 className="h-3">{f.h}</h3>
            <p className="small" style={{ color: "var(--ink-3)" }}>{f.b}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CatalogPreview = () => {
  const featured = SCENARIOS.slice(0, 8);
  return (
    <section style={{ padding: "64px 0" }}>
      <div className="shell">
        <div className="cols-asym" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 56, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="kicker">Catalog</span>
            <h2 className="section-title">A library of scripts, not a bag of bits.</h2>
            <p className="lead">Every scenario is locale-bound, peer-reviewed, and labelled with its category and runtime. Audio previews appear inline when a source is attached.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Link to="/catalog" className="btn btn-secondary"><Icon name="book" size={14} />Browse all 1,284</Link>
              <button className="btn btn-ghost" type="button">Submit a script <Icon name="arrow-up-right" size={13} /></button>
            </div>
          </div>
          <div className="cols-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {featured.map((s, i) => (
              <div key={s.id} className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Flag code={s.flag} /><span className="mono" style={{ fontSize: 11, color: "var(--ink-5)" }}>{s.locale}</span><span style={{ flex: 1 }} /><span className="chip" style={{ height: 20, fontSize: 10.5 }}>{s.category}</span></div>
                <h4 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 15, color: "var(--ink)", letterSpacing: "-0.012em" }}>{s.title}</h4>
                <AudioPlayer id={s.id} duration={s.duration} compact autoSeed={i * 31} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ApiBlock = () => (
  <section style={{ padding: "64px 0" }}>
    <div className="shell">
      <div className="cols-asym" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
        <div className="surface" style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "oklch(0.175 0.010 30)" }}>
            <Icon name="code" size={14} style={{ color: "var(--ink-3)" }} />
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>POST /v1/runs</span>
            <span style={{ flex: 1 }} />
            <span className="chip" style={{ height: 20, fontSize: 10.5, background: "transparent" }}>cURL</span>
            <span className="chip" style={{ height: 20, fontSize: 10.5, background: "transparent", color: "var(--ink-5)", borderStyle: "dashed" }}>Python</span>
            <span className="chip" style={{ height: 20, fontSize: 10.5, background: "transparent", color: "var(--ink-5)", borderStyle: "dashed" }}>Node</span>
          </div>
          <pre style={{ margin: 0, padding: "20px 22px", fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)", overflowX: "auto" }}>
{`curl https://api.sentinel-voip.io/v1/runs \\
  -H "Authorization: Bearer $SENTINEL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenario": "scn_002",
    "subject":  { "name": "Marcus Cole" },
    "to":       "+14155550182",
    "locale":   "en-US",
    "webhook":  "https://hooks.your-lab.org/voip"
  }'

`}<span style={{ color: "var(--ink-5)" }}>{`# 201 Created`}</span>{`
{
  "id":     "run_8821",
  "status": "routing",
  "eta_ms": 412,
  "audit":  "audit_8821.json"
}`}
          </pre>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span className="kicker">Operator REST</span>
          <h2 className="section-title">One endpoint. Audited transcripts. Webhooks that land.</h2>
          <p className="lead">Launch a run from a notebook, queue, or the console &mdash; same payload, same audit schema. We sign every event so your downstream pipeline can verify origin.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ k: "Idempotency", v: "Replay-safe with Idempotency-Key headers" }, { k: "Webhooks", v: "Signed HMAC-SHA256, 4 retries with backoff" }, { k: "Audit", v: "Per-run JSON: scenario, locale, duration, hash" }].map((r) => (
              <div key={r.k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "baseline", paddingBottom: 10, borderBottom: "1px solid var(--line-soft)" }}>
                <span className="micro" style={{ color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.k}</span>
                <span className="small">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section style={{ padding: "96px 0", borderTop: "1px solid var(--line)", background: "oklch(0.165 0.008 30)" }}>
    <div className="shell">
      <SectionHeader kicker="The run cycle" title="Four steps from cold open to signed transcript." lead="The console reflects the real lifecycle. Nothing happens off-screen; nothing happens without an audit row." />
      <div className="cols-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", background: "var(--panel)" }}>
        {[
          { n: "01", h: "Configure", b: "Pick a scenario, set the locale, drop in the subject's number. The console validates dial plans before you commit." },
          { n: "02", h: "Route", b: "We acquire a locale-correct trunk, place the call, and hold the line through the script's branching points." },
          { n: "03", h: "Record", b: "Full waveform plus diarised timing telemetry. The buffer streams to your console while the call is live." },
          { n: "04", h: "Audit", b: "Each run lands a signed JSON record. Export, share, or hand off to the audit bucket your IRB nominated." },
        ].map((s, i) => (
          <div key={s.n} style={{ padding: "32px 28px", borderLeft: i === 0 ? "none" : "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12, background: i === 1 ? "oklch(0.20 0.011 30)" : "transparent" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", fontWeight: 500 }}>{s.n}</span>
            <h3 className="h-3">{s.h}</h3>
            <p className="small" style={{ color: "var(--ink-3)" }}>{s.b}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Testimonials = () => (
  <section style={{ padding: "96px 0" }}>
    <div className="shell">
      <div className="cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { q: "We routed 18,400 protocol-bound calls last quarter through Sentinel. The audit trail held up under IRB review without a single annotation.", who: "Dr. Helena Markarian", role: "PI · Northwood Behavioural Labs" },
          { q: "Other tools made us paste numbers into a CSV and pray. Sentinel made us write a webhook, point at it, and stop thinking about routing entirely.", who: "Tomás Ribeiro", role: "Research Engineer · Sema·Lingua" },
        ].map((t) => (
          <figure key={t.who} className="surface" style={{ padding: 32, margin: 0, display: "flex", flexDirection: "column", gap: 24 }}>
            <Icon name="waveform" size={22} style={{ color: "var(--accent)" }} />
            <blockquote style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1.35, color: "var(--ink)", letterSpacing: "-0.018em", fontWeight: 400 }}>"{t.q}"</blockquote>
            <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
              <span style={{ width: 36, height: 36, borderRadius: 99, background: "oklch(0.28 0.012 30)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500 }}>{t.who.split(" ").map(p => p[0]).slice(0, 2).join("")}</span>
              <div><div style={{ fontSize: 13.5, color: "var(--ink)" }}>{t.who}</div><div className="micro" style={{ color: "var(--ink-4)" }}>{t.role}</div></div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

const CTABanner = () => (
  <section style={{ padding: "64px 0 0" }}>
    <div className="shell">
      <div className="cta-banner" style={{ position: "relative", borderRadius: 18, border: "1px solid var(--line-2)", background: "linear-gradient(135deg, oklch(0.22 0.014 30) 0%, oklch(0.19 0.010 30) 60%)", padding: "56px 64px", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(closest-side, var(--accent-glow), transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 540 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 38, lineHeight: 1.05, letterSpacing: "-0.024em", color: "var(--ink)" }}>Get a key. Place a call.</h2>
            <p className="lead" style={{ fontSize: 16 }}>First 25 runs are on us. No card. No procurement call. Your console is provisioned in about eleven seconds.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/dashboard" className="btn btn-primary btn-lg">Open the console <Icon name="arrow" size={14} stroke={2} /></Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg">See pricing</Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Home;
