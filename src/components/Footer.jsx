import { LogoMark, Wordmark } from "./LogoMark";

const Footer = () => (
  <footer style={{ borderTop: "1px solid var(--line)", marginTop: 96, padding: "56px 0 40px", background: "oklch(0.145 0.008 30)" }}>
    <div className="shell">
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(4, 1fr)", gap: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <LogoMark size={24} animated={false} />
            <Wordmark size={15} />
          </div>
          <p className="small" style={{ maxWidth: 280, color: "var(--ink-4)" }}>
            A research-oriented scenario catalog and routing console for controlled VOIP studies.
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
            <span className="chip mono">SOC 2 · Type II</span>
            <span className="chip mono">GDPR</span>
          </div>
        </div>
        {[
          { h: "Product", links: ["Catalog", "Console", "Recorder", "Webhooks", "Changelog"] },
          { h: "Resources", links: ["Documentation", "API reference", "Status", "Compliance", "Trust"] },
          { h: "Company", links: ["About", "Customers", "Careers", "Press kit", "Contact"] },
          { h: "Legal", links: ["Terms", "Privacy", "Acceptable use", "DPA", "Subprocessors"] },
        ].map((col) => (
          <div key={col.h}>
            <div className="micro" style={{ marginBottom: 14, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{col.h}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) => <li key={l}><a href="#" style={{ fontSize: 13, color: "var(--ink-3)" }} onClick={(e) => e.preventDefault()}>{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "40px 0 20px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span className="micro" style={{ color: "var(--ink-5)" }}>© 2026 Sentinel Research, Inc. · Cleared for academic use under license.</span>
        <span className="micro mono" style={{ color: "var(--ink-5)" }}>v 4.218 · build a7f9c2</span>
      </div>
    </div>
  </footer>
);

export default Footer;
