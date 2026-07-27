import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.110.2"

const upstreamBaseUrl = "https://master.appha.es/lua/bromapp/user"
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-sentinel-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
}

type CallSession = {
  id: string
  user_id: string
  scenario_id: string
  scenario_title: string
  locale_code: string
  recipient_name: string
  recipient_phone: string
  scheduled_for: string
  time_zone: string
  attempt_count: number
  upstream_did: string | null
  upstream_uid: string | null
  upstream_task_id: string | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

class RetryableUpstreamError extends Error {}
class PermanentUpstreamError extends Error {}

const tryParseJson = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const extractJson = (raw: string) => {
  const text = raw.trim().replace(/^\uFEFF/, "")
  const direct = tryParseJson(text)
  if (direct !== undefined) return direct

  const marker = text.match(/0day:\s*/i)
  if (marker?.index !== undefined) {
    const marked = tryParseJson(text.slice(marker.index + marker[0].length).trim())
    if (marked !== undefined) return marked
  }

  for (let start = 0; start < text.length; start += 1) {
    const opening = text[start]
    if (opening !== "{" && opening !== "[") continue
    const closing = opening === "{" ? "}" : "]"
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < text.length; index += 1) {
      const character = text[index]
      if (inString) {
        if (escaped) escaped = false
        else if (character === "\\") escaped = true
        else if (character === '"') inString = false
        continue
      }
      if (character === '"') inString = true
      else if (character === opening) depth += 1
      else if (character === closing) {
        depth -= 1
        if (depth === 0) {
          const parsed = tryParseJson(text.slice(start, index + 1))
          if (parsed !== undefined) return parsed
          break
        }
      }
    }
  }

  throw new Error(`Malformed upstream response: ${text.slice(0, 120)}`)
}

const getUpstreamError = (payload: Record<string, unknown>) => {
  if (typeof payload.content === "string") return payload.content
  if (payload.content && typeof payload.content === "object") {
    const content = payload.content as Record<string, unknown>
    if (typeof content.et === "string") {
      const nested = tryParseJson(content.et)
      if (nested && typeof nested === "object") {
        const detail = nested as Record<string, unknown>
        return String(detail.et || detail.ec || detail.res || content.et)
      }
      return content.et
    }
  }
  return String(payload.msg || payload.error || "Upstream API refused the request")
}

const postUpstream = async (path: string, payload: Record<string, unknown>) => {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(`${upstreamBaseUrl}/${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      })
      const text = await response.text()

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "", 10)
        const error = new RetryableUpstreamError(`Upstream ${response.status}: ${text.slice(0, 140)}`)
        ;(error as RetryableUpstreamError & { retryAfter?: number }).retryAfter = retryAfter
        throw error
      }
      if (!response.ok) throw new PermanentUpstreamError(`Upstream ${response.status}: ${text.slice(0, 140)}`)
      const parsed = extractJson(text)
      if (parsed?.res === "KO" || parsed?.res === "ko") throw new PermanentUpstreamError(getUpstreamError(parsed))
      return parsed
    } catch (error) {
      const retryable = error instanceof RetryableUpstreamError || error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError")
      if (!retryable) throw error
      if (attempt === 4) {
        throw new RetryableUpstreamError(error instanceof Error ? error.message : "Temporary upstream failure")
      }
      const retryAfter = error instanceof RetryableUpstreamError ? (error as RetryableUpstreamError & { retryAfter?: number }).retryAfter : undefined
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 500 * 2 ** (attempt - 1))
    }
  }
}

const resolveUid = (...sources: unknown[]) => {
  for (const source of sources) {
    if (typeof source === "string" && source.trim()) return source.trim()
    if (!source || typeof source !== "object") continue
    const record = source as Record<string, unknown>
    if (typeof record.uid === "string" && record.uid.trim()) return record.uid.trim()
    const nested = (record.user_info || record.userInfo || record.user) as Record<string, unknown> | undefined
    if (typeof nested?.uid === "string" && nested.uid.trim()) return nested.uid.trim()
    if (Array.isArray(nested?._id) && nested._id.length && String(nested._id[0]).trim()) {
      return String(nested._id[0]).trim()
    }
  }
  return ""
}

const localeForCountry = (country: string) =>
  ({
    fi: "fi_FI",
    es: "es_ES",
    gb: "en_GB",
    us: "en_US",
    fr: "fr_FR",
    de: "de_DE",
    it: "it_IT",
    pl: "pl_PL",
    pt: "pt_PT",
    br: "pt_BR",
    mx: "es_MX",
    co: "es_CO",
    ar: "es_AR",
  })[country] || `${country}_${country.toUpperCase()}`

const formatTaskTimestamp = (value: string, timeZone: string) => {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || ""
  return `${part("day")}-${part("month")}-${part("year")}T${part("hour")}:${part("minute")}:${part("second")}`
}

const taskIdFromSession = (sessionId: string) => sessionId.replaceAll("-", "").slice(0, 18)

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Dispatcher is not configured" }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: { sessionId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  let sessions: CallSession[] = []
  const cronToken = request.headers.get("x-sentinel-cron")

  if (cronToken) {
    const { data: validToken, error: tokenError } = await admin.rpc("verify_dispatch_token", {
      p_token: cronToken,
    })
    if (tokenError || validToken !== true) return json({ error: "Unauthorized" }, 401)

    const { data, error } = await admin.rpc("claim_due_call_sessions", {
      p_limit: 4,
    })
    if (error) return json({ error: "Could not claim scheduled calls" }, 500)
    sessions = (data || []) as CallSession[]
  } else {
    const authorization = request.headers.get("authorization") || ""
    const accessToken = authorization.replace(/^Bearer\s+/i, "")
    if (!accessToken) return json({ error: "Authentication required" }, 401)

    const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
    if (authError || !authData.user) return json({ error: "Invalid session" }, 401)
    if (!body.sessionId) return json({ error: "A session id is required" }, 400)

    const { data, error } = await admin.rpc("claim_call_session", {
      p_session_id: body.sessionId,
      p_user_id: authData.user.id,
    })
    if (error) return json({ error: "Could not claim call" }, 500)
    if (!data) return json({ error: "Call is not ready for dispatch" }, 409)
    sessions = [data as CallSession]
  }

  const processSession = async (session: CallSession) => {
    const country = session.locale_code.toLowerCase().slice(0, 2)
    const timeZone = session.time_zone || "Europe/Helsinki"
    const did = session.upstream_did || session.id.toUpperCase()
    const taskId = session.upstream_task_id || taskIdFromSession(session.id)

    try {
      await admin.from("call_sessions").update({ upstream_did: did, upstream_task_id: taskId }).eq("id", session.id).eq("status", "queued")

      let upstreamUid = session.upstream_uid || ""
      if (!upstreamUid) {
        let createResponse: unknown
        try {
          createResponse = await postUpstream("create.lua", {
            did,
            dtype: "uid",
            route: "jl_azul",
            tags: {
              c: country.toUpperCase(),
              l: localeForCountry(country),
              v: "6.7",
              r: "17.4",
              mf: "Apple",
            },
            timezone: timeZone,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!/already|exists|registered|duplicate/i.test(message)) throw error
        }

        const identityResponse = await postUpstream("get_user.lua", {
          did,
          uid: did,
        })
        upstreamUid = resolveUid(identityResponse, createResponse)
        if (!upstreamUid) throw new Error("Could not resolve the upstream account")

        await admin.from("call_sessions").update({ upstream_uid: upstreamUid }).eq("id", session.id)
      }

      const taskTimestamp = formatTaskTimestamp(session.scheduled_for, timeZone)
      await postUpstream("create_task_ios.lua", {
        _id: taskId,
        c: country,
        dial: session.scenario_id,
        dst: session.recipient_phone,
        f: taskTimestamp,
        nombre: session.recipient_name,
        real_f: taskTimestamp,
        titulo: session.scenario_title,
        uid: did,
      })

      const { error: completeError } = await admin.rpc("mark_call_session_running", {
        p_session_id: session.id,
        p_did: did,
        p_upstream_uid: upstreamUid,
        p_task_id: taskId,
      })
      if (completeError) throw completeError

      return { id: session.id, status: "running" }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Call dispatch failed"
      const attempt = Number(session.attempt_count || 1)
      const retryMinutes = [1, 5, 15][Math.min(Math.max(attempt - 1, 0), 2)]
      const retryAt = error instanceof RetryableUpstreamError && attempt < 3
        ? new Date(Date.now() + retryMinutes * 60_000).toISOString()
        : null

      await admin.rpc("mark_call_session_failed", {
        p_session_id: session.id,
        p_reason: message,
        p_retry_at: retryAt,
      })
      console.error("Call dispatch failed", {
        sessionId: session.id,
        attempt,
        message,
      })
      return { id: session.id, status: retryAt ? "retrying" : "failed", error: message }
    }
  }

  const results = await Promise.all(sessions.map(processSession))
  return json({ claimed: sessions.length, results })
})
