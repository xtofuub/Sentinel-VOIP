import { useEffect, useMemo } from "react"
import { Activity, ArrowRight, BookOpen, FileText } from "@/components/icons"
import { Link } from "react-router-dom"
import { useCatalog } from "@/hooks/useCatalog"
import { useAuth } from "@/state/AuthContext"
import "./Overview.css"

const FALLBACK_SCENARIO_COUNT = 2129

export function Overview() {
  const { isAdmin } = useAuth()
  const { error, loading, scenarios } = useCatalog()

  const scenarioLabel = useMemo(
    () => (scenarios.length || FALLBACK_SCENARIO_COUNT).toLocaleString(),
    [scenarios.length],
  )

  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll(".reference-reveal"))
    const heroContent = document.querySelector(".reference-hero__content")
    const cardUp = document.querySelector(".reference-card-path--up")
    const cardDown = document.querySelector(".reference-card-path--down")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("is-active")
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    )

    revealTargets.forEach((element) => observer.observe(element))

    let frame = 0
    const updateParallax = () => {
      frame = 0
      const scrolled = window.scrollY

      if (heroContent && scrolled < 1000) {
        heroContent.style.transform = `translate3d(0, ${scrolled * 0.4}px, 0)`
        heroContent.style.opacity = String(Math.max(0, 1 - scrolled / 600))
      }

      cardUp?.style.setProperty("--reference-card-offset", `${scrolled * -0.05}px`)
      cardDown?.style.setProperty("--reference-card-offset", `${scrolled * 0.05}px`)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax)
    }

    updateParallax()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <main className="reference-landing">
      <section className="reference-hero" aria-labelledby="reference-hero-title">
        <div className="reference-hero__backdrop" aria-hidden="true">
          <img src="/visuals/atmosphere.png" alt="" loading="eager" />
          <span />
        </div>

        <div className="reference-hand reference-hand--left" aria-hidden="true">
          <img src="/visuals/hand-left.png" alt="" loading="eager" />
        </div>
        <div className="reference-hand reference-hand--right" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="eager" />
        </div>

        <div className="reference-shell reference-hero__content">
          <div className="reference-reveal">
            <h1 id="reference-hero-title">
              Prank calls, on command.
              <span>Every reaction, ready to replay.</span>
            </h1>
          </div>

          <div className="reference-reveal reference-delay-1">
            <p className="reference-hero__copy">
              Pick a scenario, enter their number, and confirm the setup. Sentinel places the prank and brings the
              recording back to one private activity feed.
            </p>
          </div>

          <div className="reference-reveal reference-delay-2 reference-hero__action-group">
            <Link className="reference-hero__cta" to="/new">
              Start a prank
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <div className="reference-hero__meta">
              <span>{scenarioLabel} scenarios</span>
              <i aria-hidden="true" />
              <span>Private replay</span>
            </div>
          </div>
        </div>
      </section>

      <section className="reference-mission" aria-labelledby="reference-mission-title">
        <div className="reference-shell">
          <div className="reference-mission__copy reference-reveal">
            <h2 id="reference-mission-title">Choose the prank. Keep the reaction.</h2>
            <p>Preview the scenario first. Place the call when it is right. Return to the recording from one clear activity feed.</p>
            {error && <small>The live catalog is unavailable. Saved activity remains accessible.</small>}
          </div>

          <div className="reference-proof" aria-label="Sentinel product highlights">
            <span className="reference-reveal">{loading ? "Loading" : `${scenarioLabel} scenarios`}</span>
            <span className="reference-reveal reference-delay-short-1">Localized voices</span>
            <span className="reference-reveal reference-delay-short-2">Private activity</span>
            <span className="reference-reveal reference-delay-short-3">Direct replay</span>
          </div>
        </div>
      </section>

      <section className="reference-works" aria-labelledby="reference-works-title">
        <div className="reference-shell">
          <header className="reference-works__heading reference-reveal">
            <h2 id="reference-works-title">
              From scenario
              <span>to recording.</span>
            </h2>
          </header>

          <div className="reference-card-grid">
            <div className="reference-card-path reference-card-path--down">
              <article className="reference-card reference-card--accent reference-reveal">
                <div className="reference-card__topline">
                  <span className="reference-card__icon" aria-hidden="true"><BookOpen size={23} /></span>
                  <span className="reference-card__index">01</span>
                </div>
                <div className="reference-card__copy">
                  <p>Scenario library</p>
                  <h3>Find the prank.<br />Hear it first.</h3>
                  <p>Browse localized scenarios and preview the audio before choosing the call.</p>
                  <Link to="/library">Browse {scenarioLabel} scenarios <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <span className="reference-card__rule" />
              </article>
            </div>

            <div className="reference-card-path reference-card-path--up">
              <article className="reference-card reference-card--dark reference-reveal reference-delay-short-1">
                <div className="reference-card__topline">
                  <span className="reference-card__icon" aria-hidden="true"><Activity size={23} /></span>
                  <span className="reference-card__index">02</span>
                </div>
                <div className="reference-card__copy">
                  <p>Call activity</p>
                  <h3>Keep the reaction.<br />Find it later.</h3>
                  <p>The recipient, call time, share link, and returned recording stay together.</p>
                  <Link to="/activity">Open activity <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <span className="reference-card__rule" />
              </article>
            </div>
          </div>
        </div>
        <div className="reference-works__pattern" aria-hidden="true" />
      </section>

      <footer className="reference-footer">
        <div className="reference-shell reference-footer__inner">
          <p className="reference-footer__wordmark" aria-hidden="true">SENTINEL.</p>
          <div className="reference-footer__links">
            <Link to="/library">Library</Link>
            <Link to="/new">Console</Link>
            <Link to="/activity">Activity</Link>
            {isAdmin && <Link to="/logs"><FileText size={14} aria-hidden="true" /> API logs</Link>}
            <small>© {new Date().getFullYear()} Sentinel VOIP. Use only with permission.</small>
          </div>
        </div>
      </footer>
    </main>
  )
}
