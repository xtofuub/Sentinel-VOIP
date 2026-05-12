import { useState, useEffect, useContext } from "react";
import { RouterContext, Link } from "../context/RouterContext";
import Icon from "./Icon";
import { LogoMark, Wordmark } from "./LogoMark";

const NavLink = ({ to, children, external, className = "" }) => {
  const { path, navigate } = useContext(RouterContext);
  const active = path === to;
  return (
    <a href={`#${to}`}
       className={className}
       onClick={(e) => { if (!external) { e.preventDefault(); navigate(to); } else { e.preventDefault(); } }}
       style={{
         padding: "6px 10px", borderRadius: 7, fontSize: 13.5,
         color: active ? "var(--ink)" : "var(--ink-3)",
         background: active ? "var(--bg-2)" : "transparent",
         transition: "color 150ms ease, background 150ms ease",
       }}
       onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--ink)"; }}
       onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--ink-3)"; }}>
      {children}
    </a>
  );
};

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(14px) saturate(160%)",
      WebkitBackdropFilter: "blur(14px) saturate(160%)",
      background: scrolled ? "oklch(0.155 0.008 30 / 0.78)" : "oklch(0.155 0.008 30 / 0.4)",
      borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
      transition: "background 200ms ease, border-color 200ms ease",
    }}>
      <div className="shell nav-shell" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={28} />
          <Wordmark size={16} />
        </Link>
        <nav className="nav-main" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavLink to="/catalog">Catalog</NavLink>
          <NavLink to="/dashboard">Console</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/docs" external className="nav-hide-mobile">Docs</NavLink>
          <NavLink to="/changelog" external className="nav-hide-mobile">Changelog</NavLink>
        </nav>
        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" type="button">
            <Icon name="command" size={14} />
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Ctrl K</span>
          </button>
          <Link to="/dashboard" className="btn btn-secondary btn-sm">Sign in</Link>
          <Link to="/dashboard" className="btn btn-primary btn-sm">
            Open console
            <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
