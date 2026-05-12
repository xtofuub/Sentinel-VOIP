import { useState } from "react";
import { Link } from "../context/RouterContext";
import Icon from "../components/Icon";
import SectionHeader from "../components/SectionHeader";

const Pricing = () => {
  const [billing, setBilling] = useState("annual");
  const [runs, setRuns] = useState(1200);

  const operatorBase = billing === "annual" ? 79 : 99;
  const operatorCost = operatorBase + Math.max(0, runs - 1000) * 0.08;
  const adhocCost = runs * 0.18;
  const recommended = runs <= 25 ? "Probe" : runs <= 8000 ? "Operator" : "Institution";

  const tiers = [
    { name: "Probe", blurb: "Solo researchers and one-off pilots. Get the catalog without a card.", monthly: 0, annual: 0, cta: "Start with 25 runs", ctaSecondary: "No credit card", features: [["25 runs", "per month, hard cap"], ["All 64 locales", "no region restrictions"], ["1 operator seat", "single console session"], ["30-day retention", "recordings & transcripts"], ["Webhook delivery", "JSON, single endpoint"]] },
    { name: "Operator", blurb: "Day-to-day routing for a lab or study team.", monthly: 99, annual: 79, cta: "Start 14-day trial", ctaSecondary: "Then $79/mo billed yearly", featured: true, features: [["1,000 runs", "included monthly, then $0.08 each"], ["5 operator seats", "with role-based scopes"], ["Signed audit JSON", "SHA-256, SOC 2 root key"], ["180-day retention", "with KMS-encrypted exports"], ["8 concurrent runs", "burst to 16 on request"], ["Webhook + queue", "Kafka, SQS, PubSub adapters"]] },
    { name: "Institution", blurb: "Compliance-grade routing at department scale.", monthly: null, annual: null, pricelet: "Custom", cta: "Talk to sales", ctaSecondary: "Annual contract · procurement-ready", features: [["Unmetered pools", "concurrency tuned to your trunk"], ["Unlimited seats", "SAML SSO, SCIM provisioning"], ["BAA · DPA · DPIA", "executed before kickoff"], ["Dedicated region", "eu-central, us-east, ap-southeast"], ["Indefinite retention", "BYO bucket + key escrow"], ["Named CSM", "24h response SLA, quarterly review"]] },
  ];

  return (
    <main style={{ paddingTop: 56, paddingBottom: 64 }}>
      <div className="shell">
        {/* Header */}
        <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center", marginBottom: 44 }}>
          <span className="kicker">Pricing · v3.2 effective Jan 2025</span>
          <h1 className="h-1" style={{ maxWidth: 880 }}>Pay for runs, <span style={{ color: "var(--ink-4)" }}>not for the platform.</span></h1>
          <p className="lead" style={{ textAlign: "center", maxWidth: 640 }}>One catalog, one console, three commitment levels. Recordings stay readable for the retention window you bought &mdash; even after you cancel.</p>
          <div role="radiogroup" style={{ display: "flex", padding: 4, border: "1px solid var(--line-2)", borderRadius: 99, background: "oklch(0.175 0.010 30)", marginTop: 6 }}>
            {[{ k: "monthly", l: "Monthly" }, { k: "annual", l: "Annual" }].map((b) => (
              <button key={b.k} type="button" role="radio" aria-checked={billing === b.k} onClick={() => setBilling(b.k)} style={{ height: 32, padding: "0 18px", borderRadius: 99, background: billing === b.k ? "var(--bg-3)" : "transparent", color: billing === b.k ? "var(--ink)" : "var(--ink-3)", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8, transition: "background 200ms ease, color 200ms ease" }}>
                {b.l}
                {b.k === "annual" && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 6px", borderRadius: 4, background: billing === "annual" ? "oklch(0.30 0.10 145 / 0.25)" : "oklch(0.22 0.010 30)", color: billing === "annual" ? "var(--ok)" : "var(--ink-4)", letterSpacing: "0.04em" }}>-20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div className="pricing-tiers reveal-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 64 }}>
          {tiers.map((t) => {
            const price = billing === "annual" ? t.annual : t.monthly;
            const isFeatured = t.featured;
            return (
              <div key={t.name} className={isFeatured ? "surface-pop" : "surface"} style={{ padding: "30px 28px 28px", display: "flex", flexDirection: "column", gap: 18, position: "relative", border: isFeatured ? "1px solid var(--accent-line)" : undefined, background: isFeatured ? "linear-gradient(180deg, oklch(0.22 0.030 25) 0%, var(--bg-2) 60%)" : undefined, overflow: "hidden" }}>
                {isFeatured && <>
                  <div style={{ position: "absolute", inset: "-40% -20% auto auto", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)", opacity: 0.5, pointerEvents: "none" }} />
                  <span style={{ position: "absolute", top: 16, right: 16, display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 99, background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, zIndex: 1 }}>Most chosen</span>
                </>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: isFeatured ? "var(--accent)" : "var(--ink-5)", boxShadow: isFeatured ? "0 0 12px var(--accent-glow)" : undefined }} />
                    <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, color: "var(--ink)", letterSpacing: "-0.018em" }}>{t.name}</h3>
                  </div>
                  <p className="small" style={{ color: "var(--ink-4)", margin: 0, lineHeight: 1.5 }}>{t.blurb}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    {price === null ? (
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--ink)", letterSpacing: "-0.03em", fontWeight: 500, lineHeight: 1 }}>{t.pricelet}</span>
                    ) : (<>
                      <span style={{ fontSize: 22, color: "var(--ink-3)", fontWeight: 400, fontFamily: "var(--font-display)" }}>$</span>
                      <span className="numeric" style={{ fontFamily: "var(--font-display)", fontSize: 56, color: "var(--ink)", letterSpacing: "-0.035em", fontWeight: 500, lineHeight: 1 }}>{price}</span>
                      <span className="small" style={{ color: "var(--ink-4)" }}>/ month</span>
                    </>)}
                  </div>
                  <span className="micro" style={{ color: "var(--ink-5)" }}>{t.ctaSecondary}</span>
                </div>
                <Link to="/dashboard" className={isFeatured ? "btn btn-primary btn-lg" : "btn btn-secondary btn-lg"} style={{ position: "relative" }}>{t.cta} <Icon name="arrow" size={14} stroke={2} /></Link>
                <div className="divider-soft" style={{ margin: "2px 0" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                  {t.features.map(([head, sub]) => (
                    <li key={head} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 1, background: isFeatured ? "var(--accent)" : "oklch(0.24 0.012 30)", display: "grid", placeItems: "center", boxShadow: isFeatured ? "0 0 0 1px var(--accent-line), 0 6px 14px -6px var(--accent-glow)" : "0 0 0 1px var(--line-soft)" }}>
                        <Icon name="check" size={11} stroke={3} style={{ color: isFeatured ? "var(--on-accent)" : "var(--ink-3)" }} />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 13.5, color: "var(--ink-2)", fontWeight: 500 }}>{head}</span>
                        <span className="micro" style={{ color: "var(--ink-5)", lineHeight: 1.45 }}>{sub}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Runs calculator */}
        <div className="reveal surface" style={{ padding: 32, marginBottom: 96, position: "relative", overflow: "hidden" }}>
          <div className="pricing-calc" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <span className="kicker">Estimate · interactive</span>
              <h2 className="h-2" style={{ margin: 0 }}>How many runs will you actually use?</h2>
              <p className="small" style={{ color: "var(--ink-3)", margin: 0, lineHeight: 1.55 }}>Slide to estimate monthly run volume. We'll recommend a tier and show what the same volume would cost à la carte.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="micro" style={{ color: "var(--ink-4)" }}>Runs per month</span>
                  <span className="numeric" style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", letterSpacing: "-0.02em", fontWeight: 500 }}>{runs.toLocaleString()}</span>
                </div>
                <input type="range" min="25" max="20000" step="25" value={runs} onChange={(e) => setRuns(parseInt(e.target.value, 10))} className="runs-slider" style={{ width: "100%", appearance: "none", height: 6, borderRadius: 99, background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${(runs - 25) / (20000 - 25) * 100}%, oklch(0.22 0.010 30) ${(runs - 25) / (20000 - 25) * 100}%, oklch(0.22 0.010 30) 100%)`, outline: "none", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {["25", "5,000", "10,000", "20,000+"].map(v => <span key={v} className="micro" style={{ color: "var(--ink-5)" }}>{v}</span>)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 14px", border: "1px solid var(--accent-line)", borderRadius: 10, background: "oklch(0.22 0.040 25 / 0.25)" }}>
                <Icon name="check" size={14} stroke={2.4} style={{ color: "var(--accent)" }} />
                <span className="small" style={{ color: "var(--ink-2)" }}>Recommended plan: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{recommended}</strong></span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="surface" style={{ padding: 24, background: "linear-gradient(180deg, oklch(0.22 0.030 25) 0%, var(--bg-3) 100%)", border: "1px solid var(--accent-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span className="kicker" style={{ color: "var(--accent)" }}>On Sentinel · Operator</span></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                  <span className="numeric" style={{ fontFamily: "var(--font-display)", fontSize: 46, color: "var(--ink)", letterSpacing: "-0.03em", fontWeight: 500, lineHeight: 1 }}>${Math.round(operatorCost).toLocaleString()}</span>
                  <span className="small" style={{ color: "var(--ink-4)" }}>/ month, all-in</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
                  <span>Platform · ${operatorBase}</span><span>Overage · ${Math.round(Math.max(0, runs - 1000) * 0.08).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ padding: "16px 24px", borderRadius: 12, border: "1px dashed var(--line-2)", background: "oklch(0.16 0.008 30)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="small" style={{ color: "var(--ink-4)" }}>Generic SIP &amp; consultancy fees</span>
                  <span className="numeric" style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-3)", textDecoration: "line-through", textDecorationColor: "var(--ink-5)", fontWeight: 500 }}>${Math.round(adhocCost).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span className="micro" style={{ color: "var(--ink-5)" }}>Same volume, no audit, no consent ledger</span>
                  <span className="micro" style={{ color: "var(--ok)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>save ${Math.round(adhocCost - operatorCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ComparisonTable />
        <TrustStrip />
        <FAQ />
        <FinalCTA />
      </div>

      <style>{`
        .runs-slider::-webkit-slider-thumb { appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--ink); border: 3px solid var(--accent); box-shadow: 0 4px 14px var(--accent-glow); cursor: grab; }
        .runs-slider::-webkit-slider-thumb:hover { transform: scale(1.12); }
        .runs-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--ink); border: 3px solid var(--accent); box-shadow: 0 4px 14px var(--accent-glow); cursor: grab; }
        details[open] .faq-plus { transform: rotate(45deg); background: var(--accent); color: var(--on-accent); }
      `}</style>
    </main>
  );
};

export default Pricing;


const ComparisonTable = () => {
  const sections = [
    { section: "Run economics", rows: [["Included runs / mo", "25", "1,000", "Custom"], ["Overage rate", "—", "$0.08 / run", "Volume tiers"], ["Concurrent runs", "1", "8", "Unmetered pool"], ["Locale coverage", "All 64", "All 64", "All 64 + custom"]] },
    { section: "Recording & audit", rows: [["Recording retention", "30 days", "180 days", "Indefinite + escrow"], ["Signed audit JSON", "—", "✓", "✓"], ["Export to S3 / GCS", "—", "✓", "✓ + BYO bucket"], ["Transcript NLP tags", "—", "Standard", "Custom taxonomy"]] },
    { section: "Team & access", rows: [["Operator seats", "1", "5", "Unlimited"], ["SSO (SAML / OIDC)", "—", "—", "✓ + SCIM"], ["Role-based scopes", "—", "Standard", "Granular + custom"], ["Audit log export", "—", "30 days", "Indefinite"]] },
    { section: "Support & contracts", rows: [["Support", "Community", "Email · 24h", "Named CSM · 24h SLA"], ["DPA / BAA", "—", "DPA", "BAA + DPA + DPIA"], ["Onboarding", "Self-serve docs", "Group office hours", "Solutions architect"], ["Procurement", "—", "Self-serve", "Annual contract"]] },
  ];
  return (
    <div className="reveal" style={{ marginBottom: 96 }}>
      <SectionHeader kicker="Side by side" title="The full plan comparison." />
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="pricing-compare-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 16, padding: "16px 22px", background: "oklch(0.18 0.010 30)", borderBottom: "1px solid var(--line)" }}>
          <span className="micro" style={{ color: "var(--ink-5)" }}>FEATURE</span>
          {["Probe", "Operator", "Institution"].map((n, i) => <span key={n} className="kicker" style={{ color: i === 1 ? "var(--accent)" : "var(--ink-3)" }}>{n}</span>)}
        </div>
        {sections.map((g) => (
          <div key={g.section}>
            <div style={{ padding: "14px 22px", background: "oklch(0.165 0.010 30)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line-soft)" }}>
              <span className="kicker" style={{ color: "var(--ink-3)" }}>{g.section}</span>
            </div>
            {g.rows.map(([label, ...vals]) => (
              <div key={label} className="pricing-compare-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 16, padding: "13px 22px", alignItems: "center", borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{label}</span>
                {vals.map((v, i) => (
                  <span key={i} className="small" style={{ color: v === "—" ? "var(--ink-5)" : (i === 1 ? "var(--ink)" : "var(--ink-3)"), fontFamily: /[0-9$]/.test(v) ? "var(--font-mono)" : "var(--font-sans)", fontWeight: i === 1 && v !== "—" ? 500 : 400 }}>
                    {v === "✓" ? <Icon name="check" size={15} stroke={2.4} style={{ color: i === 1 ? "var(--accent)" : "var(--ok)" }} /> : v}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};


const TrustStrip = () => (
  <div className="reveal" style={{ marginBottom: 96, padding: "32px 0", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
      <span className="kicker" style={{ color: "var(--ink-4)" }}>Trusted by research teams at</span>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center", opacity: 0.55 }}>
        {["Brookhaven Labs", "MERIDIAN", "Carlyle Bureau", "Hexley Inst.", "Ostlund & Co.", "ARPA-E"].map((n) => (
          <span key={n} style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)", letterSpacing: "-0.012em", fontWeight: 500 }}>{n}</span>
        ))}
      </div>
    </div>
  </div>
);

const FAQ = () => {
  const items = [
    { q: "Is consent recorded for me, or do I supply it?", a: "Sentinel attaches whatever consent artefact you upload (audio, e-signature, or IRB letter) to each run's signed audit record. We don't synthesise consent." },
    { q: "Where are recordings stored?", a: "By default, in the routing region you choose (us-east, eu-central, ap-southeast). On Institution, you can mount your own KMS-encrypted bucket and we never persist a copy." },
    { q: "What's in the audit JSON?", a: "Run ID, scenario hash, locale, dial plan, channel timings, recording SHA-256, operator identity, webhook delivery status. Signed with our SOC 2 root key." },
    { q: "How does overage billing work?", a: "Overages on the Operator plan are metered per run and billed monthly. You can set a hard cap in the console; runs above the cap are rejected before the trunk opens." },
    { q: "Can I bring my own SIP trunk?", a: "Institution plans can mount a BYO trunk per locale. We still acquire and validate the dial plan; you can attach a private SIP carrier for telephony." },
    { q: "What's the cancellation policy?", a: "Monthly plans cancel any time; access stops at the end of the billing period. Annual plans are pro-rated against unused months on request." },
    { q: "Do you offer non-profit / academic pricing?", a: "Operator plans are discounted 30% for verified academic institutions. Email research@sentinel-voip.example with your .edu domain." },
    { q: "What happens to my recordings if I cancel?", a: "They remain readable through the console for the retention window you bought, then are deleted along with the signing keys. Export anytime via the audit endpoint." },
  ];
  return (
    <div className="reveal" style={{ marginBottom: 88 }}>
      <SectionHeader kicker="Frequently asked" title="The questions our procurement contacts ask." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {items.map((f) => (
          <details key={f.q} className="surface" style={{ padding: "18px 22px" }}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 15.5, color: "var(--ink)", letterSpacing: "-0.012em" }}>{f.q}</span>
              <span className="faq-plus" style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: "oklch(0.22 0.010 30)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-3)", transition: "transform 220ms ease, background 220ms ease, color 220ms ease" }}>
                <Icon name="plus" size={12} stroke={2.5} />
              </span>
            </summary>
            <p className="small" style={{ color: "var(--ink-3)", marginTop: 14, marginBottom: 0, lineHeight: 1.65 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
};

const FinalCTA = () => (
  <div className="cta-banner reveal surface-pop" style={{ padding: "44px 48px", background: "linear-gradient(135deg, oklch(0.24 0.040 25) 0%, var(--bg-2) 60%)", border: "1px solid var(--accent-line)", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: "-50% auto auto -10%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)", opacity: 0.55, pointerEvents: "none" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, position: "relative", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 540 }}>
        <span className="kicker" style={{ color: "var(--accent)" }}>Ready when you are</span>
        <h2 className="h-2" style={{ margin: 0 }}>Start audited runs.</h2>
        <p className="small" style={{ color: "var(--ink-3)", margin: 0 }}>25 runs free, no card. Everything else is metered.</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/dashboard" className="btn btn-primary btn-lg">Start with 25 runs <Icon name="arrow" size={14} stroke={2} /></Link>
        <Link to="/catalog" className="btn btn-secondary btn-lg">Browse catalog</Link>
      </div>
    </div>
  </div>
);
