import { createElement, useEffect, useMemo } from "react"
import { Activity, ArrowRight, BookOpen, FileText, Headphones, PhoneCall } from "@/components/icons"
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
            <div className="reference-hero__buttons">
              <Link className="reference-hero__cta reference-hero__cta--primary" to="/new">
                Start a prank
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link className="reference-hero__cta reference-hero__cta--secondary" to="/library">
                Browse {scenarioLabel} scenarios
              </Link>
            </div>
            <p className="reference-hero__access">Browse freely. Sign in only when you are ready to place the call.</p>
          </div>
        </div>
      </section>

      <section className="reference-steps-stage" aria-label="How Sentinel works">
        <div className="reference-shell">
          <ol className="reference-steps reference-reveal">
            {journey.map(({ detail, icon, title }, index) => (
              <li key={title}>
                <span className="reference-steps__index">0{index + 1}</span>
                <span className="reference-steps__icon" aria-hidden="true">
                  {createElement(icon, { size: 19, strokeWidth: 1.7 })}
                </span>
                <span className="reference-steps__copy">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                {index < journey.length - 1 && <ArrowRight className="reference-steps__arrow" size={16} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="reference-mission" aria-labelledby="reference-mission-title">
        <div className="reference-shell">
          <div className="reference-mission__copy reference-reveal">
            <h2 id="reference-mission-title">Everything stays in one place.</h2>
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
                  <span className="reference-card__index">
                    {loading ? "Loading catalog" : `${scenarioLabel} scenarios`}
                  </span>
                </div>
                <div className="reference-card__copy">
                  <p>Scenario library</p>
                  <h3>Find the prank.<br />Hear it first.</h3>
                  <p>Browse localized scenarios and preview the audio before choosing the call.</p>
                  <Link to="/library">Browse scenarios <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <span className="reference-card__rule" />
              </article>
            </div>

            <div className="reference-card-path reference-card-path--up">
              <article className="reference-card reference-card--dark reference-reveal reference-delay-short-1">
                <div className="reference-card__topline">
                  <span className="reference-card__icon" aria-hidden="true"><Activity size={23} /></span>
                  <span className="reference-card__index">Private history</span>
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

      <section className="reference-final" aria-labelledby="reference-final-title">
        <div className="reference-final__hand" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="lazy" />
        </div>
        <div className="reference-shell reference-final__inner reference-reveal">
          <p>Ready when the timing is right.</p>
          <h2 id="reference-final-title">Choose the prank.<br />Keep the reaction.</h2>
          <div className="reference-final__actions">
            <Link className="reference-final__button" to="/new">
              Start a prank
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="reference-final__browse" to="/library">Explore the scenario library</Link>
          </div>
        </div>
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
