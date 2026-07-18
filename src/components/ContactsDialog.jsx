import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Pencil,
  PhoneCall,
  Search,
  Trash2,
  UserRound,
  UserRoundCheck,
  X,
} from "@/components/icons"
import {
  deleteContact,
  isValidContactPhone,
  listContacts,
  normalizeContactPhone,
  saveContact,
} from "@/services/contacts"

const emptyDraft = { id: null, name: "", phoneNumber: "" }

const contactErrorMessage = (error) => {
  if (error?.code === "23505") return "That phone number is already saved."
  return error?.message || "Contacts could not be updated."
}

export function ContactsDialog({ open, onClose, onChoose, userId }) {
  const dialogRef = useRef(null)
  const searchRef = useRef(null)
  const nameRef = useRef(null)
  const dialogStateRef = useRef({ deleting: false, draft: null, onClose, saving: false })
  const [contacts, setContacts] = useState([])
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")
  const editorOpen = draft !== null

  useEffect(() => {
    dialogStateRef.current = { deleting, draft, onClose, saving }
  }, [deleting, draft, onClose, saving])

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return contacts
    return contacts.filter((contact) => (
      contact.name.toLocaleLowerCase().includes(normalized)
      || contact.phone_number.includes(normalized)
    ))
  }, [contacts, query])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setContacts(await listContacts(userId))
    } catch (loadError) {
      setError(contactErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!open || !userId) return
    setQuery("")
    setDraft(null)
    setConfirmDelete(false)
    refresh()
  }, [open, refresh, userId])

  useEffect(() => {
    if (!open) return undefined

    const previousActiveElement = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0)
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event) => {
      const currentState = dialogStateRef.current

      if (event.key === "Escape" && !currentState.saving && !currentState.deleting) {
        if (currentState.draft) {
          setDraft(null)
          setConfirmDelete(false)
          setError("")
        } else {
          currentState.onClose()
        }
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

  useEffect(() => {
    if (!editorOpen) return
    const focusTimer = window.setTimeout(() => nameRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [draft?.id, editorOpen])

  if (!open) return null

  const startAdd = () => {
    setDraft(emptyDraft)
    setConfirmDelete(false)
    setError("")
  }

  const startEdit = (contact) => {
    setDraft({ id: contact.id, name: contact.name, phoneNumber: contact.phone_number })
    setConfirmDelete(false)
    setError("")
  }

  const cancelEdit = () => {
    setDraft(null)
    setConfirmDelete(false)
    setError("")
    window.setTimeout(() => searchRef.current?.focus(), 0)
  }

  const submitContact = async (event) => {
    event.preventDefault()
    if (!draft || saving) return

    if (!draft.name.trim() || !isValidContactPhone(draft.phoneNumber)) {
      setError("Use a name and a full number with country code, such as +14155550123.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await saveContact({
        id: draft.id,
        userId,
        name: draft.name,
        phoneNumber: draft.phoneNumber,
      })
      setDraft(null)
      setConfirmDelete(false)
      await refresh()
    } catch (saveError) {
      setError(contactErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const removeContact = async () => {
    if (!draft?.id || deleting) return
    setDeleting(true)
    setError("")
    try {
      await deleteContact({ id: draft.id, userId })
      setDraft(null)
      setConfirmDelete(false)
      await refresh()
    } catch (deleteError) {
      setError(contactErrorMessage(deleteError))
    } finally {
      setDeleting(false)
    }
  }

  const choose = (contact) => {
    onChoose({ name: contact.name, phoneNumber: contact.phone_number })
    onClose()
  }

  return createPortal(
    <div className="contacts-dialog-layer">
      <button
        className="contacts-dialog__backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Close contacts"
        disabled={saving || deleting}
        onClick={onClose}
      />
      <section
        className="contacts-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacts-dialog-title"
      >
        <header className="contacts-dialog__header">
          <div>
            <p className="eyebrow">Private phonebook</p>
            <h2 id="contacts-dialog-title">Contacts</h2>
            <p>Choose a saved recipient or add someone new.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving || deleting} aria-label="Close contacts">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {draft ? (
          <form className="contact-editor" onSubmit={submitContact}>
            <div className="contact-editor__title">
              <span aria-hidden="true"><UserRoundCheck size={18} /></span>
              <div>
                <strong>{draft.id ? "Edit contact" : "New contact"}</strong>
                <small>Stored only in your account.</small>
              </div>
            </div>

            <div className="contact-editor__fields">
              <label className="recipient-field" htmlFor="contact-name">
                <span>Name</span>
                <div className="recipient-field__control">
                  <UserRound size={16} aria-hidden="true" />
                  <input
                    id="contact-name"
                    ref={nameRef}
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Their name"
                    autoComplete="off"
                    disabled={saving || deleting}
                  />
                </div>
              </label>

              <label className="recipient-field" htmlFor="contact-phone">
                <span>Phone</span>
                <div className="recipient-field__control">
                  <PhoneCall size={16} aria-hidden="true" />
                  <input
                    id="contact-phone"
                    value={draft.phoneNumber}
                    onChange={(event) => setDraft((current) => ({ ...current, phoneNumber: event.target.value }))}
                    onBlur={(event) => {
                      const value = normalizeContactPhone(event.target.value)
                      setDraft((current) => ({ ...current, phoneNumber: value }))
                    }}
                    placeholder="+14155550123"
                    type="tel"
                    autoComplete="tel"
                    disabled={saving || deleting}
                  />
                </div>
              </label>
            </div>

            {error && (
              <div className="contact-editor__error" role="alert">
                <CircleAlert size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <footer className="contact-editor__actions">
              {draft.id && (
                confirmDelete ? (
                  <div className="contact-editor__confirm">
                    <span>Remove this contact?</span>
                    <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Keep</button>
                    <button type="button" onClick={removeContact} disabled={deleting}>
                      {deleting ? "Removing" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button className="contact-editor__remove" type="button" onClick={() => setConfirmDelete(true)} disabled={saving}>
                    <Trash2 size={15} aria-hidden="true" /> Remove
                  </button>
                )
              )}
              <div>
                <button className="button button--quiet button--compact" type="button" onClick={cancelEdit} disabled={saving || deleting}>Cancel</button>
                <button className="button button--primary button--compact" type="submit" disabled={saving || deleting}>
                  {saving ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
                  {saving ? "Saving" : "Save contact"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <>
            <div className="contacts-dialog__toolbar">
              <label className="contacts-dialog__search" htmlFor="contacts-search">
                <span className="visually-hidden">Search contacts</span>
                <Search size={17} aria-hidden="true" />
                <input
                  id="contacts-search"
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or number"
                  autoComplete="off"
                />
              </label>
              <button className="button button--quiet button--compact" type="button" onClick={startAdd}>
                New contact
              </button>
            </div>

            <div className="contacts-dialog__results" aria-live="polite">
              {loading ? (
                <div className="contacts-dialog__empty" role="status">
                  <LoaderCircle className="spin" size={22} aria-hidden="true" />
                  <strong>Loading contacts</strong>
                </div>
              ) : error ? (
                <div className="contacts-dialog__empty is-error" role="alert">
                  <CircleAlert size={22} aria-hidden="true" />
                  <strong>Contacts unavailable</strong>
                  <p>{error}</p>
                  <button className="button button--quiet button--compact" type="button" onClick={refresh}>Try again</button>
                </div>
              ) : filteredContacts.length ? (
                <div className="contact-list">
                  {filteredContacts.map((contact) => (
                    <article className="contact-row" key={contact.id}>
                      <button className="contact-row__choose" type="button" onClick={() => choose(contact)}>
                        <span className="contact-row__avatar" aria-hidden="true">
                          {contact.name.slice(0, 1).toLocaleUpperCase()}
                        </span>
                        <span className="contact-row__copy">
                          <strong>{contact.name}</strong>
                          <small>{contact.phone_number}</small>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                      <button className="contact-row__edit" type="button" onClick={() => startEdit(contact)} aria-label={`Edit ${contact.name}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="contacts-dialog__empty">
                  <UserRound size={23} aria-hidden="true" />
                  <strong>{query ? "No contact found" : "No contacts yet"}</strong>
                  <p>{query ? "Try another name or number." : "Add a number here, or place a call and Sentinel will save it."}</p>
                  {!query && <button className="button button--quiet button--compact" type="button" onClick={startAdd}>Add first contact</button>}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}
