const StatusPill = ({ status }) => {
  const map = {
    recorded: { cls: "pill-ok", label: "Recorded" },
    routing: { cls: "pill-warn pill-routing", label: "Routing" },
    failed: { cls: "pill-bad", label: "Failed" },
  };
  const s = map[status] || { cls: "", label: status };
  return (
    <span className={`pill ${s.cls}`}>
      <span className="dot" />
      {s.label}
    </span>
  );
};

export default StatusPill;
