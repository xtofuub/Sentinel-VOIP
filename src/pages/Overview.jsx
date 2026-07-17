import { createElement, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  ArrowRight,
  BookOpen,
  FileText,
  Headphones,
  PhoneCall,
} from "@/components/icons"
import { Link } from "react-router-dom"
import { useCatalog } from "@/hooks/useCatalog"
import { useAuth } from "@/state/AuthContext"
import "./Overview.css"

const FALLBACK_SCENARIO_COUNT = 2129
const FALLBACK_LOCALE_COUNT = 64

const readStoredArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const readLocalOverview = () => ({
  accounts: readStoredArray("activeAccounts"),
  launches: readStoredArray("recordingTargetMemory"),
})

const journey = [
  {
    title: "Pick the prank",
    detail: "Browse and preview the scenario first.",
    icon: BookOpen,
  },
  {
    title: "Sentinel calls",
    detail: "Add their number and place the call.",
    icon: PhoneCall,
  },
  {
    title: "Keep the reaction",
    detail: "The recording returns to your activity.",
    icon: Headphones,
  },
]

export function Overview() {
  const { isAdmin } = useAuth()
  const { error, loading, locales, scenarios } = useCatalog()
  const [localState, setLocalState] = useState(readLocalOverview)
  const heroRef = useRef(null)

  useEffect(() => {
    const refreshLocalState = () => setLocalState(readLocalOverview())
    window.addEventListener("focus", refreshLocalState)
    window.addEventListener("storage", refreshLocalState)
    return () => {
      window.removeEventListener("focus", refreshLocalState)
      window.removeEventListener("storage", refreshLocalState)
    }
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined

    let frameId = 0
    const setPointer = (x, y) => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        hero.style.setProperty("--pointer-x", `${(x * 38).toFixed(2)}px`)
        hero.style.setProperty("--pointer-y", `${(y * 28).toFixed(2)}px`)
        hero.style.setProperty("--pointer-x-reverse", `${(x * -34).toFixed(2)}px`)
        hero.style.setProperty("--pointer-y-reverse", `${(y * -25).toFixed(2)}px`)
      })
    }
    const handlePointerMove = (event) => {
      const bounds = hero.getBoundingClientRect()
      setPointer((event.clientX - bounds.left) / bounds.width - 0.5, (event.clientY - bounds.top) / bounds.height - 0.5)
    }
    const resetPointer = () => setPointer(0, 0)

    hero.addEventListener("pointermove", handlePointerMove, { passive: true })
    hero.addEventListener("pointerleave", resetPointer)
    return () => {
      window.cancelAnimationFrame(frameId)
      hero.removeEventListener("pointermove", handlePointerMove)
      hero.removeEventListener("pointerleave", resetPointer)
    }
  }, [])

  const catalogSummary = useMemo(() => {
    const scenarioCount = scenarios.length || FALLBACK_SCENARIO_COUNT
    const localeCount = locales.length || FALLBACK_LOCALE_COUNT
    return {
      scenarioLabel: scenarioCount.toLocaleString(),
      localeLabel: localeCount.toLocaleString(),
    }
  }, [locales.length, scenarios.length])

  const stats = [
    {
      value: catalogSummary.scenarioLabel,
      label: "Prank scenarios",
      detail: "Ready to browse and preview",
    },
    {
      value: loading ? "—" : catalogSummary.localeLabel,
      label: "Localized collections",
      detail: "Languages and regions",
    },
    {
      value: "Immediate",
      label: "Call launch",
      detail: "Placed as soon as you confirm",
    },
    {
      value: localState.launches.length.toLocaleString(),
      label: "Saved reactions",
      detail: "Remembered in this browser",
    },
  ]

  return (
    <main className="cinematic-landing">
      <section className="cinematic-hero" ref={heroRef} aria-labelledby="cinematic-hero-title">
        <div className="cinematic-hero__backdrop" aria-hidden="true">
          <img className="cinematic-hero__atmosphere" src="/visuals/atmosphere.png" alt="" loading="eager" />
          <div className="cinematic-hero__shade" />
        </div>

        <div className="cinematic-hand-field cinematic-hand-field--left" aria-hidden="true">
          <img src="/visuals/hand-left.png" alt="" loading="eager" />
        </div>
        <div className="cinematic-hand-field cinematic-hand-field--right" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="eager" />
        </div>

        <div className="cinematic-shell cinematic-hero__inner">
          <div className="cinematic-hero__brandline">
            <span className="cinematic-hero__monogram" aria-hidden="true">S</span>
            <span>Sentinel prank call studio</span>
            <span className="cinematic-hero__status"><i />Control room online</span>
          </div>

          <h1 id="cinematic-hero-title">
            <span>Prank calls,</span>
            <span>on command.</span>
          </h1>
          <p className="cinematic-hero__promise">Every reaction, ready to replay.</p>
          <p className="cinematic-hero__copy">
            Pick a scenario, enter their number, and confirm the setup. Sentinel places the prank and brings the
            recording back to one private activity feed.
          </p>

          <div className="cinematic-hero__actions">
            <Link className="cinematic-button cinematic-button--light" to="/new">
              Start a prank
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="cinematic-button cinematic-button--quiet" to="/library">
              Browse {catalogSummary.scenarioLabel} scenarios
            </Link>
          </div>
          <p className="cinematic-hero__access">Browse freely. Sign in only when you are ready to place the call.</p>

          <ol className="cinematic-route" aria-label="How Sentinel works">
            {journey.map(({ detail, icon, title }, index) => (
              <li key={title}>
                <span className="cinematic-route__index">0{index + 1}</span>
                <span className="cinematic-route__icon" aria-hidden="true">
                  {createElement(icon, { size: 19, strokeWidth: 1.7 })}
                </span>
                <span className="cinematic-route__copy">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                {index < journey.length - 1 && <ArrowRight className="cinematic-route__arrow" size={16} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="clean-overview" aria-labelledby="clean-overview-title">
        <div className="cinematic-shell">
          <header className="clean-overview__intro">
            <p>From setup to replay</p>
            <h2 id="clean-overview-title">Everything stays in one place.</h2>
            <p>
              Browse the prank, choose the timing, and find the returned recording later. No extra tools and no lost context.
            </p>
            {error && (
              <span className="clean-overview__notice" role="status">
                The live catalog could not load. Your saved browser activity is still available.
              </span>
            )}
          </header>

          <div className="clean-stats" aria-label="Sentinel capabilities">
            {stats.map((stat) => (
              <div className="clean-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
                <p>{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="clean-features">
            <article className="clean-feature clean-feature--accent">
              <div className="clean-feature__topline">
                <BookOpen size={23} aria-hidden="true" />
                <span>Scenario library</span>
              </div>
              <div className="clean-feature__copy">
                <h3>Find the prank before you make the call.</h3>
                <p>Filter by locale, search the catalog, and preview the audio before choosing anything.</p>
                <Link to="/library">
                  Browse scenarios
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </article>

            <article className="clean-feature clean-feature--dark">
              <div className="clean-feature__topline">
                <Activity size={23} aria-hidden="true" />
                <span>Call activity</span>
              </div>
              <div className="clean-feature__copy">
                <h3>The right reaction stays easy to find.</h3>
                <p>Recipient, scenario, call time, and returned audio remain together in one clear history.</p>
                <div className="clean-feature__links">
                  <Link to="/activity">
                    Open activity
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                  {isAdmin && <Link className="clean-feature__admin" to="/logs">API logs</Link>}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="cinematic-final" aria-labelledby="final-title">
        <div className="cinematic-final__hand" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="lazy" />
        </div>
        <div className="cinematic-shell cinematic-final__inner">
          <p>Ready when the timing is right.</p>
          <h2 id="final-title">Choose the prank.<br />Keep the reaction.</h2>
          <div className="cinematic-final__actions">
            <Link className="cinematic-button cinematic-button--dark" to="/new">
              Start a prank
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="cinematic-final__browse" to="/library">Explore the scenario library</Link>
          </div>
        </div>
      </section>

      <footer className="cinematic-footer">
        <div className="cinematic-shell cinematic-footer__inner">
          <Link className="cinematic-footer__brand" to="/" aria-label="Sentinel home">Sentinel<span>.</span></Link>
          <nav aria-label="Footer navigation">
            <Link to="/library">Library</Link>
            <Link to="/new">Console</Link>
            <Link to="/activity">Activity</Link>
            {isAdmin && <Link to="/logs"><FileText size={14} aria-hidden="true" />API logs</Link>}
          </nav>
          <p>Use Sentinel only with permission and for a lawful purpose.</p>
          <span>© {new Date().getFullYear()} Sentinel VOIP</span>
        </div>
      </footer>
    </main>
  )
}
