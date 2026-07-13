import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react"

const localeMark = (code) => {
  if (!/^[a-z]{2}$/i.test(code || "")) return ""
  return code.toUpperCase()
}

const groupOptions = (options) => {
  const groups = new Map()

  options.forEach((option) => {
    const group = option.group || "Other"
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(option)
  })

  return Array.from(groups, ([name, items]) => ({ name, items }))
}

export function LocalePicker({
  id,
  label = "Language & region",
  value,
  options,
  onChange,
  placeholder = "Choose a language",
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const dialogRef = useRef(null)
  const searchRef = useRef(null)
  const triggerRef = useRef(null)

  const selected = useMemo(
    () => options.find((option) => option.id === value) || null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return options

    return options.filter((option) => (
      option.label.toLocaleLowerCase().includes(normalized)
      || option.group?.toLocaleLowerCase().includes(normalized)
      || option.countryCode?.toLocaleLowerCase().includes(normalized)
    ))
  }, [options, query])

  const groupedOptions = useMemo(() => groupOptions(filteredOptions), [filteredOptions])

  useEffect(() => {
    if (!disabled) return
    setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!open) return undefined

    const previousActiveElement = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0)
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setQuery("")
        setOpen(false)
        return
      }

      if (event.key !== "Tab" || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener("keydown", handleKeyDown)
      previousActiveElement?.focus?.()
    }
  }, [open])

  const choose = (option) => {
    onChange(option.id)
    setQuery("")
    setOpen(false)
  }

  const close = () => {
    setQuery("")
    setOpen(false)
  }

  return (
    <>
      <div className="locale-picker">
        <span className="locale-picker__label" id={`${id}-label`}>{label}</span>
        <button
          className="locale-picker__trigger"
          id={id}
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}-value`}
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <span className="locale-picker__flag" aria-hidden="true">
            {selected ? localeMark(selected.countryCode) || <Globe2 size={16} /> : <Globe2 size={16} />}
          </span>
          <span className="locale-picker__value">
            <strong id={`${id}-value`}>{selected?.label || placeholder}</strong>
            <small>{selected?.group || `${options.length.toLocaleString()} locales available`}</small>
          </span>
          <ChevronDown className="locale-picker__chevron" size={17} aria-hidden="true" />
        </button>
      </div>

      {open && createPortal(
        <div className="locale-dialog-layer">
          <button
            className="locale-dialog__backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close language selector"
            onClick={close}
          />
          <section
            className="locale-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-dialog-title`}
          >
            <header className="locale-dialog__header">
              <div>
                <p className="eyebrow">Global catalog</p>
                <h2 id={`${id}-dialog-title`}>Choose language & region</h2>
                <p>{options.length.toLocaleString()} localized collections available.</p>
              </div>
              <button className="locale-dialog__close" type="button" onClick={close} aria-label="Close language selector">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <label className="locale-dialog__search" htmlFor={`${id}-search`}>
              <span className="visually-hidden">Search languages and regions</span>
              <Search size={18} aria-hidden="true" />
              <input
                id={`${id}-search`}
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search language, country, or code"
                autoComplete="off"
              />
              <span className="locale-dialog__count">{filteredOptions.length}</span>
            </label>

            <div className="locale-dialog__results" aria-label="Languages and regions">
              {groupedOptions.length ? groupedOptions.map((group, groupIndex) => (
                <section
                  className="locale-dialog__group"
                  key={group.name}
                  role="group"
                  aria-labelledby={`${id}-group-${groupIndex}`}
                >
                  <div className="locale-dialog__group-heading" id={`${id}-group-${groupIndex}`}>
                    <span>{group.name}</span>
                    <small>{group.items.length}</small>
                  </div>
                  <div className="locale-dialog__grid">
                    {group.items.map((option) => {
                      const isSelected = option.id === value
                      const mark = localeMark(option.countryCode)

                      return (
                        <button
                          className={`locale-option${isSelected ? " is-selected" : ""}`}
                          type="button"
                          aria-pressed={isSelected}
                          key={option.id}
                          onClick={() => choose(option)}
                        >
                          <span className="locale-option__flag" aria-hidden="true">
                            {mark || <Globe2 size={16} />}
                          </span>
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.group || "Localized collection"}</small>
                          </span>
                          {isSelected && <Check size={16} aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )) : (
                <div className="locale-dialog__empty">
                  <Globe2 size={24} aria-hidden="true" />
                  <strong>No locale found</strong>
                  <p>Try a language name, country, or two-letter code.</p>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
