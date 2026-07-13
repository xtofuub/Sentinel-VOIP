import React, { useEffect, useLayoutEffect, useState } from "react"
import { ArrowUpRight, Menu, Pause, Waves, X } from "lucide-react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { AccountMenu } from "@/components/AccountMenu"
import { useAuth } from "@/state/AuthContext"

const publicNavItems = [
  { to: "/library", label: "Library" },
  { to: "/new", label: "Console" },
  { to: "/activity", label: "Activity" },
]

const motionStorageKey = "sentinel-motion"
const motionEntrySelector = [
  ".hero-eyebrow",
  ".hero-title",
  ".hero-copy",
  ".hero-actions",
  ".hero-meta",
  ".product-hero__index",
  ".product-hero__copy",
  ".product-hero__meta",
  ".product-hero__action",
  ".product-hero > .button",
  ".product-hero__actions",
  ".control-bar",
  ".surface",
  ".notice",
  ".mobile-nav",
  ".scroll-reveal.is-revealed",
].join(", ")

const scrollRevealSelector = [
  ".landing-mission__intro",
  ".landing-stat",
  ".landing-section-heading",
  ".feature-card",
  ".workflow-card",
  ".landing-footer__intro",
  ".landing-footer__links",
  ".landing-footer__meta",
].join(", ")

function getInitialMotionMode() {
  if (typeof document === "undefined") return "full"

  return document.documentElement.dataset.motion === "reduced" ? "reduced" : "full"
}

export function AppShell() {
  const { isAdmin } = useAuth()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [motionMode, setMotionMode] = useState(getInitialMotionMode)
  const isLanding = pathname === "/"
  const navItems = isAdmin
    ? [...publicNavItems, { to: "/logs", label: "API logs" }]
    : publicNavItems

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 36)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  useLayoutEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname])

  useLayoutEffect(() => {
    if (pathname !== "/") return undefined

    const targets = Array.from(document.querySelectorAll(scrollRevealSelector))

    targets.forEach((element) => {
      const parent = element.parentElement
      const shouldStagger = parent?.matches(
        ".landing-stats, .feature-grid, .workflow-grid, .landing-footer__inner",
      )
      const siblingIndex = shouldStagger ? Array.from(parent.children).indexOf(element) : 0
      const delay = Math.min(Math.max(siblingIndex, 0), 3) * 60

      element.classList.add("scroll-reveal")
      element.style.setProperty("--reveal-delay", `${delay}ms`)
    })

    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("is-revealed"))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          entry.target.classList.add("is-revealed")
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    )

    targets.forEach((element) => {
      if (!element.classList.contains("is-revealed")) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [pathname])

  useEffect(() => {
    document.documentElement.dataset.motion = motionMode
  }, [motionMode])

  const toggleMotion = () => {
    const nextMode = motionMode === "full" ? "reduced" : "full"

    document.querySelectorAll(motionEntrySelector).forEach((element) => {
      const bounds = element.getBoundingClientRect()
      if (bounds.bottom > 0 && bounds.top < window.innerHeight) {
        element.classList.add("motion-static")
      }
    })

    setMotionMode(nextMode)

    try {
      window.localStorage.setItem(motionStorageKey, nextMode)
    } catch {
      // Motion preference still applies for the current session.
    }
  }

  return (
    <div className={`app-shell${isLanding ? " is-landing" : " is-product"}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="noise-overlay" aria-hidden="true" />
      {!isLanding && (
        <div className="product-atmosphere" aria-hidden="true">
          <img src="/visuals/atmosphere.png" alt="" />
        </div>
      )}

      <header className={`top-nav${scrolled || !isLanding ? " is-solid" : ""}`}>
        <div className="nav-inner">
          <Link className="brand" to="/" aria-label="Sentinel home">
            <span className="brand-name">Sentinel<span>.</span></span>
            <small aria-hidden="true">VOIP OPS</small>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <button
              className="motion-toggle"
              type="button"
              aria-label="Reduced motion"
              aria-pressed={motionMode === "reduced"}
              title={motionMode === "reduced" ? "Reduced motion on" : "Reduced motion off"}
              onClick={toggleMotion}
            >
              {motionMode === "full" ? (
                <Waves size={16} aria-hidden="true" />
              ) : (
                <Pause size={15} aria-hidden="true" />
              )}
            </button>
            <AccountMenu />
            <Link className="nav-cta" to="/new">
              Start session
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <button
              className="nav-menu-button"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-nav-link${isActive ? " is-active" : ""}`}
              >
                {item.label}
                <ArrowUpRight size={15} aria-hidden="true" />
              </NavLink>
            ))}
            <Link className="mobile-nav-link mobile-start-link" to="/new">
              Start session
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <AccountMenu mobile />
          </nav>
        )}
      </header>

      <div className="route-frame" id="main-content" tabIndex="-1">
        <Outlet />
      </div>
    </div>
  )
}
