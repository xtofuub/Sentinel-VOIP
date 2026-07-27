import { supabase } from "@/lib/supabase"

const unwrapRow = (data) => (Array.isArray(data) ? data[0] : data)

export async function createCallSession({ requestId, scenarioId, scenarioTitle, localeCode, recipientName, recipientPhone, scheduledFor, timeZone }) {
  if (!supabase) throw new Error("Supabase is not configured.")

  const { data, error } = await supabase.rpc("create_call_session", {
    p_request_id: requestId,
    p_scenario_id: String(scenarioId),
    p_scenario_title: scenarioTitle.trim(),
    p_locale_code: localeCode.toLowerCase(),
    p_recipient_name: recipientName.trim(),
    p_recipient_phone: recipientPhone,
    p_scheduled_for: scheduledFor,
    p_time_zone: timeZone,
  })

  if (error) throw error
  return unwrapRow(data)
}

export async function dispatchCallSession(sessionId) {
  if (!supabase) throw new Error("Supabase is not configured.")
  const { data, error } = await supabase.functions.invoke("dispatch-calls", {
    body: { sessionId },
  })
  if (error) throw error
  const result = data?.results?.find((item) => item?.id === sessionId)
  if (data?.claimed !== 1 || !result) {
    throw new Error("The call was saved but could not be claimed for dispatch.")
  }
  if (result.status !== "running") {
    throw new Error("The call could not be sent to the provider. It will retry automatically.")
  }
  return result
}

export async function listCallSessions(userId) {
  if (!userId || !supabase) return []
  const { data, error } = await supabase.from("call_sessions").select("id,user_id,scenario_id,scenario_title,locale_code,recipient_name,recipient_phone,scheduled_for,status,attempt_count,upstream_did,upstream_uid,upstream_task_id,failure_reason,launched_at,created_at,updated_at").eq("user_id", userId).order("scheduled_for", { ascending: false }).limit(250)

  if (error) throw error
  return data || []
}

export async function cancelCallSession(sessionId) {
  if (!supabase) throw new Error("Supabase is not configured.")
  const { data, error } = await supabase.rpc("cancel_call_session", {
    p_session_id: sessionId,
  })
  if (error) throw error
  return unwrapRow(data)
}

export function callSessionToActivity(session) {
  const scheduledAt = new Date(session.scheduled_for)
  return {
    _id: session.id,
    uid: `scheduled:${session.id}`,
    accountDid: session.upstream_did || "",
    cou: String(session.locale_code || "fi")
      .toLowerCase()
      .slice(0, 2),
    dial: session.scenario_id,
    titulo: session.scenario_title,
    targetName: session.recipient_name,
    targetPhone: session.recipient_phone,
    timestamp: Number.isNaN(scheduledAt.getTime()) ? 0 : scheduledAt.getTime(),
    timeLabel: session.scheduled_for,
    status: session.status,
    isPlayable: false,
    isScheduledSession: true,
    sessionId: session.id,
    upstreamTaskId: session.upstream_task_id,
    failureReason: session.failure_reason,
  }
}
