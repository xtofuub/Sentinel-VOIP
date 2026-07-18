import { createElement, useMemo } from "react"
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
  const { error, loading, scenarios } = useCatalog()

  const catalogSummary = useMemo(() => {
    const scenarioCount = scenarios.length || FALLBACK_SCENARIO_COUNT
    return {
      scenarioLabel: scenarioCount.toLocaleString(),
    }
  }, [scenarios.length])

  return (
    <main className="cinematic-landing">
      <section className="cinematic-hero" aria-labelledby="cinematic-hero-title">
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
        </div>
      </section>

      <section className="cinematic-route-stage" aria-label="How Sentinel works">
        <div className="cinematic-shell">
          <ol className="cinematic-route">
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
            <h2 id="clean-overview-title">Everything stays in one place.</h2>
            <p>
              Browse the prank, place the call, and return to the recording later. One simple path from setup to replay.
            </p>
            {error && (
              <span className="clean-overview__notice" role="status">
                The live catalog could not load. Your saved browser activity is still available.
              </span>
            )}
          </header>

          <div className="clean-features" aria-label="Sentinel destinations">
            <div className="clean-feature-path clean-feature-path--down">
              <article className="clean-feature clean-feature--accent">
                <div className="clean-feature__topline">
                  <span className="clean-feature__icon" aria-hidden="true">
                    <BookOpen size={23} />
                  </span>
                  <span className="clean-feature__meta">
                    {loading ? "Loading catalog" : `${catalogSummary.scenarioLabel} scenarios`}
                  </span>
                </div>
                <div className="clean-feature__copy">
                  <p className="clean-feature__label">Scenario library</p>
                  <h3>Find the prank.<br />Hear it first.</h3>
                  <p>Search localized scenarios and preview the audio before you choose one.</p>
                  <Link to="/library">
                    Browse scenarios
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>

            <div className="clean-feature-path clean-feature-path--up">
              <article className="clean-feature clean-feature--dark">
                <div className="clean-feature__topline">
                  <span className="clean-feature__icon" aria-hidden="true">
                    <Activity size={23} />
                  </span>
                  <span className="clean-feature__meta">Private history</span>
                </div>
                <div className="clean-feature__copy">
                  <p className="clean-feature__label">Call activity</p>
                  <h3>Keep the reaction.<br />Find it later.</h3>
                  <p>Recipient, call time, share link, and returned audio stay together in one clear history.</p>
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
