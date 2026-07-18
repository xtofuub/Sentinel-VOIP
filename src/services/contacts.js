import { supabase } from "@/lib/supabase"

const contactColumns = "id,user_id,name,phone_number,last_used_at,created_at,updated_at"

export const normalizeContactPhone = (value) => {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""

  const normalized = trimmed
    .replace(/[\s().-]/g, "")
    .replace(/(?!^)\+/g, "")

  return normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized
}

export const isValidContactPhone = (value) => /^\+[1-9][0-9]{7,14}$/.test(normalizeContactPhone(value))

const requireClient = () => {
  if (!supabase) throw new Error("Contacts are unavailable until Supabase is configured.")
  return supabase
}

export async function listContacts(userId) {
  if (!userId) return []

  const { data, error } = await requireClient()
    .from("contacts")
    .select(contactColumns)
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveContact({ id, userId, name, phoneNumber }) {
  const cleanName = String(name || "").trim()
  const cleanPhone = normalizeContactPhone(phoneNumber)

  if (!userId || !cleanName || !isValidContactPhone(cleanPhone)) {
    throw new Error("Add a name and a full international phone number.")
  }

  const client = requireClient()

  if (id) {
    const { data, error } = await client
      .from("contacts")
      .update({ name: cleanName, phone_number: cleanPhone })
      .eq("id", id)
      .eq("user_id", userId)
      .select(contactColumns)
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await client
    .from("contacts")
    .upsert(
      { user_id: userId, name: cleanName, phone_number: cleanPhone },
      { onConflict: "user_id,phone_number" },
    )
    .select(contactColumns)
    .single()

  if (error) throw error
  return data
}

export async function rememberContact({ userId, name, phoneNumber }) {
  const cleanName = String(name || "").trim()
  const cleanPhone = normalizeContactPhone(phoneNumber)

  if (!userId || !cleanName || !isValidContactPhone(cleanPhone)) return null

  const { data, error } = await requireClient()
    .from("contacts")
    .upsert(
      {
        user_id: userId,
        name: cleanName,
        phone_number: cleanPhone,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,phone_number" },
    )
    .select(contactColumns)
    .single()

  if (error) throw error
  return data
}

export async function deleteContact({ id, userId }) {
  const { error } = await requireClient()
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw error
}
