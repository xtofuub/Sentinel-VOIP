import { useState, useEffect, useContext } from "react";
import { RouterContext, Link } from "../context/RouterContext";
import Icon from "./Icon";
import { LogoMark, Wordmark } from "./LogoMark";

const NavLink = ({ to, children, external, className = "" }) => {
  const { path, navigate } = useContext(RouterContext);
  const active = path === to;
  return (
    <a href={`#${to}`}
       className={`nav-link ${active ? "nav-link-active" : ""} ${className}`}
       onClick={(e) => { if (!external) { e.preventDefault(); navigate(to); } else { e.preventDefault(); } }}
       aria-current={active ? "page" : undefined}>
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
      background: scrolled ? "oklch(0.155 0.008 30 / 0.92)" : "oklch(0.155 0.008 30 / 0.74)",
      borderBottom: `1px solid ${scrolled ? "var(--line)" : "var(--line-soft)"}`,
      boxShadow: scrolled ? "0 14px 36px -28px rgba(0,0,0,0.75)" : "none",
      transition: "background 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
    }}>
      <div className="shell nav-shell">
        <Link to="/" className="nav-brand">
          <LogoMark size={36} />
          <Wordmark size={19} />
        </Link>
        <nav className="nav-main">
          <NavLink to="/catalog">Catalog</NavLink>
          <NavLink to="/dashboard">Console</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/docs" external className="nav-hide-mobile">Docs</NavLink>
          <NavLink to="/changelog" external className="nav-hide-mobile">Changelog</NavLink>
        </nav>
        <div className="nav-actions">
          <button className="btn btn-ghost nav-command" type="button">
            <Icon name="command" size={16} />
            <span className="mono">Ctrl K</span>
          </button>
          <Link to="/dashboard" className="btn btn-secondary nav-action">Sign in</Link>
          <Link to="/dashboard" className="btn btn-primary nav-action">
            Open console
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
