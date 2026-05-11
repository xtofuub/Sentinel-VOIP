const SectionHeader = ({ kicker, title, lead, align = "left" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: align === "center" ? "center" : "flex-start", textAlign: align === "center" ? "center" : "left", marginBottom: 56 }}>
    {kicker && <span className="kicker">{kicker}</span>}
    <h2 className="section-title">{title}</h2>
    {lead && <p className="lead">{lead}</p>}
  </div>
);

export default SectionHeader;
