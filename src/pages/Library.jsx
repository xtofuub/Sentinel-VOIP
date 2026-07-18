import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  Search,
  Volume2,
} from "@/components/icons"
import { useNavigate } from "react-router-dom"
import { LocalePicker } from "@/components/LocalePicker"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { useApp } from "@/state/AppContext"

const PAGE_SIZE = 40
const ALL_LOCALES_OPTION = { id: "all", label: "All locales", group: "Catalog", countryCode: "" }

export function Library() {
  const { loading, error, locales, scenarios } = useCatalog()
  const { setSelectedScenario } = useApp()
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const [query, setQuery] = useState("")
  const [localeId, setLocaleId] = useState("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [playingId, setPlayingId] = useState(null)
  const [previewError, setPreviewError] = useState("")
  const localeOptions = useMemo(() => [ALL_LOCALES_OPTION, ...locales], [locales])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return scenarios.filter((scenario) => {
      const matchesLocale = localeId === "all" || scenario.localeId === localeId
      const matchesQuery = !normalized
        || scenario.titulo?.toLowerCase().includes(normalized)
        || scenario.desc?.toLowerCase().includes(normalized)
      return matchesLocale && matchesQuery
    })
  }, [localeId, query, scenarios])

  const visibleScenarios = filtered.slice(0, visibleCount)
  const filtersAreActive = query.length > 0 || localeId !== "all"

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [localeId, query])

  useEffect(() => () => {
    audioRef.current?.pause()
  }, [])

  const stopPreview = () => {
    audioRef.current?.pause()
    setPlayingId(null)
  }

  const togglePreview = (scenario) => {
    const audio = audioRef.current
    if (!audio || !scenario.example) return

    setPreviewError("")
    if (playingId === scenario.uniqueId) {
      stopPreview()
      return
    }

    audio.src = scenario.example
    const previewSrc = audio.src
    setPlayingId(scenario.uniqueId)
    audio.play().catch((playError) => {
      if (playError?.name === "AbortError" || audioRef.current?.src !== previewSrc) return
      setPlayingId(null)
      setPreviewError("Audio preview could not be loaded.")
    })
  }

  const resetFilters = () => {
    setQuery("")
    setLocaleId("all")
    setVisibleCount(PAGE_SIZE)
  }

  const chooseScenario = (scenario) => {
    stopPreview()
    setSelectedScenario(scenario)
    navigate("/new")
  }

  return (
    <main className="page product-page">
      <header className="product-hero">
        <div className="product-hero__copy">
          <p className="eyebrow">Scenario archive</p>
          <h1>
            Find the voice.<br />
            <em>Set the scene.</em>
          </h1>
          <p className="product-hero__description">
            Browse every localized scenario, hear the sample, and carry the right
            selection into a new session.
          </p>
        </div>
        <div className="product-hero__meta" aria-label="Catalog summary">
          <span>Live catalog</span>
          <strong>{scenarios.length.toLocaleString()}</strong>
          <small>available scenarios</small>
        </div>
      </header>

      <section className="control-bar" aria-label="Scenario filters">
        <label className="control-field control-field--search" htmlFor="scenario-search">
          <span>Search the archive</span>
          <span className="control-input-wrap">
            <Search aria-hidden="true" size={18} strokeWidth={1.5} />
            <input
              id="scenario-search"
              type="search"
              placeholder="Title or description"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>

        <LocalePicker
          id="locale-filter"
          label="Language & region"
          value={localeId}
          options={localeOptions}
          onChange={setLocaleId}
        />

        <button
          className="button button--quiet"
          type="button"
          onClick={resetFilters}
          disabled={!filtersAreActive}
        >
          <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
          Reset
        </button>
      </section>

      <section className="surface" aria-labelledby="library-results-heading">
        <div className="surface__header">
          <div>
            <p className="eyebrow">Catalog results</p>
            <h2 id="library-results-heading">
              {loading
                ? "Opening the archive"
                : `${filtered.length.toLocaleString()} scenario${filtered.length === 1 ? "" : "s"}`}
            </h2>
          </div>
          {!loading && filtered.length > 0 && (
            <p className="surface__meta">
              Showing {Math.min(visibleCount, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </p>
          )}
        </div>

        <audio
          ref={audioRef}
          className="visually-hidden"
          onEnded={() => setPlayingId(null)}
          onError={() => {
            setPlayingId(null)
            setPreviewError("Audio preview could not be loaded.")
          }}
        />

        {previewError && (
          <div className="notice notice--error" role="alert">
            <Volume2 aria-hidden="true" size={18} strokeWidth={1.5} />
            <div>
              <strong>Preview unavailable</strong>
              <p>{previewError}</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="notice notice--error" role="alert">
            <div>
              <strong>Catalog failed to load</strong>
              <p>{error.message}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-mark" aria-hidden="true" />
            <p>Preparing the scenario archive...</p>
          </div>
        ) : visibleScenarios.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <caption className="visually-hidden">Available call scenarios</caption>
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Locale</th>
                  <th scope="col">Audio</th>
                  <th scope="col"><span className="visually-hidden">Select scenario</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleScenarios.map((scenario) => {
                  const isPlaying = playingId === scenario.uniqueId
                  return (
                    <tr key={scenario.uniqueId}>
                      <td>
                        <div className="scenario-cell">
                          <ScenarioThumbnail src={scenario.image_url} title={scenario.titulo} size="small" />
                          <div className="scenario-copy">
                            <strong>{scenario.titulo}</strong>
                            <p>{scenario.desc || "No description available."}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge--neutral">{scenario.localeLabel}</span>
                      </td>
                      <td>
                        <button
                          className="button button--quiet button--compact"
                          type="button"
                          onClick={() => togglePreview(scenario)}
                          disabled={!scenario.example}
                          aria-label={`${isPlaying ? "Pause" : "Preview"} ${scenario.titulo}`}
                        >
                          {isPlaying
                            ? <Pause aria-hidden="true" size={16} fill="currentColor" />
                            : <Play aria-hidden="true" size={16} fill="currentColor" />}
                          {scenario.example ? (isPlaying ? "Pause" : "Preview") : "Unavailable"}
                        </button>
                      </td>
                      <td className="data-table__action">
                        <button
                          className="button button--outline button--compact"
                          type="button"
                          onClick={() => chooseScenario(scenario)}
                          aria-label={`Select ${scenario.titulo}`}
                        >
                          Select
                          <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state__number" aria-hidden="true"><Search size={30} /></span>
            <div>
              <h2>No scenarios found</h2>
              <p>No scenarios match the current filters. Reset the archive to begin again.</p>
              <button className="button button--outline" type="button" onClick={resetFilters}>
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
                Reset filters
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="surface__footer">
            {visibleCount < filtered.length && (
              <button
                className="button button--primary"
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Reveal {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                className="button button--quiet"
                type="button"
                onClick={() => setVisibleCount(PAGE_SIZE)}
              >
                Show first {PAGE_SIZE}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
