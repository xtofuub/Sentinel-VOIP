const StatusPill = ({ status }) => {
  const map = {
    recorded: { cls: "pill-ok", label: "Recorded" },
    queued: { cls: "pill-info", label: "Queued" },
    no_audio: { cls: "pill-bad", label: "No audio" },
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
