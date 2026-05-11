const Icon = ({ name, size = 16, stroke = 1.6, className = "", style = {} }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
    className, style, "aria-hidden": "true",
  };
  switch (name) {
    case "logo":     return <svg {...props} viewBox="0 0 24 24"><path d="M3 12h3l2-7 4 14 3-10 2 6 2-3h2"/></svg>;
    case "arrow":    return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "arrow-up-right": return <svg {...props}><path d="M7 17 17 7M8 7h9v9"/></svg>;
    case "check":    return <svg {...props}><path d="M5 12.5 10 17l9-10"/></svg>;
    case "x":        return <svg {...props}><path d="M6 6l12 12M6 18 18 6"/></svg>;
    case "search":   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "phone":    return <svg {...props}><path d="M5 4h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>;
    case "phone-out":return <svg {...props}><path d="M5 4h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/><path d="M15 4h5v5"/><path d="m15 9 5-5"/></svg>;
    case "play":     return <svg {...props}><path d="M7 5v14l12-7z"/></svg>;
    case "pause":    return <svg {...props}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;
    case "download": return <svg {...props}><path d="M12 4v11m0 0-4-4m4 4 4-4M4 18h16"/></svg>;
    case "share":    return <svg {...props}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8 11 8-4M8 13l8 4"/></svg>;
    case "trash":    return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>;
    case "globe":    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case "shield":   return <svg {...props}><path d="M12 3 4 6v6c0 4.4 3.3 7.5 8 8 4.7-.5 8-3.6 8-8V6l-8-3z"/></svg>;
    case "zap":      return <svg {...props}><path d="M13 3 4 14h7l-1 7 9-11h-7l1-7z"/></svg>;
    case "spark":    return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>;
    case "lock":     return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "code":     return <svg {...props}><path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/></svg>;
    case "stack":    return <svg {...props}><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>;
    case "waveform": return <svg {...props}><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h2"/></svg>;
    case "chev-d":   return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chev-r":   return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "more":     return <svg {...props}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>;
    case "filter":   return <svg {...props}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "plus":     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "minus":    return <svg {...props}><path d="M5 12h14"/></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "book":     return <svg {...props}><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M18 8h2v12"/></svg>;
    case "command":  return <svg {...props}><path d="M6 9a3 3 0 1 1 3-3v12a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3V6a3 3 0 1 1 3 3z"/></svg>;
    case "circle":   return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
    case "dot":      return <svg {...props}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case "activity": return <svg {...props}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
    case "map":      return <svg {...props}><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16"/></svg>;
    case "users":    return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M3 19a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 19a5 5 0 0 0-3.5-4.8"/></svg>;
    case "infinity": return <svg {...props}><path d="M5 12c0-2.2 1.8-4 4-4 1.4 0 2.6.7 4 3 1.4 2.3 2.6 3 4 3a4 4 0 1 0 0-8c-1.4 0-2.6.7-4 3-1.4 2.3-2.6 3-4 3a4 4 0 1 0 0 8c1.4 0 2.6-.7 4-3"/></svg>;
    default:         return null;
  }
};

export default Icon;
