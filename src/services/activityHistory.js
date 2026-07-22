import { supabase } from "@/lib/supabase"

const ACTIVE_ACCOUNTS_KEY = "activeAccounts"
const RECORDING_TARGET_MEMORY_KEY = "recordingTargetMemory"
const HIDDEN_ACTIVITY_KEY = "sentinel-hidden-activity"
const HISTORY_LIMIT = 1000
const migratedUsers = new Set()

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const cleanCode = (value) => {
  const code = String(value || "").trim().toLowerCase()
  return /^[a-z]{2}$/.test(code) ? code : "fi"
}

const cleanDate = (value) => {
  const date = new Date(value || Date.now())
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export const readLocalActivitySources = () => readArray(ACTIVE_ACCOUNTS_KEY)
  .map((source) => ({
    did: String(source?.did || source?.uid || "").trim(),
    uid: String(source?.uid || "").trim(),
    country: cleanCode(source?.country),
    at: Number(source?.at) || 0,
  }))
  .filter((source) => source.did)

export const readLocalActivityLaunches = () => readArray(RECORDING_TARGET_MEMORY_KEY)
  .map((launch) => ({
    uid: String(launch?.uid || "").trim(),
    dial: String(launch?.dial || "").trim(),
    targetName: String(launch?.targetName || "").trim(),
    targetPhone: String(launch?.targetPhone || "").trim(),
    taskId: String(launch?.taskId || "").trim(),
    at: Number(launch?.at) || 0,
  }))
  .filter((launch) => launch.uid && launch.dial)

export const readLocalHiddenActivity = () => new Set(
  readArray(HIDDEN_ACTIVITY_KEY).filter((key) => typeof key === "string"),
)

export const mergeActivitySources = (...groups) => {
  const byDid = new Map()
  groups.flat().forEach((source) => {
    const did = String(source?.did || source?.uid || "").trim()
    if (!did) return
    byDid.set(did, {
      ...source,
      did,
      country: cleanCode(source?.country),
      at: Number(source?.at) || 0,
    })
  })
  return Array.from(byDid.values()).sort((a, b) => b.at - a.at)
}

export const mergeActivityLaunches = (...groups) => {
  const byTask = new Map()
  groups.flat().forEach((launch) => {
    const uid = String(launch?.uid || "").trim()
    const dial = String(launch?.dial || "").trim()
    if (!uid || !dial) return
    const taskId = String(launch?.taskId || "").trim()
    const key = taskId || `${uid}|${dial}|${Number(launch?.at) || 0}`
    byTask.set(key, {
      ...launch,
      uid,
      dial,
      taskId,
      at: Number(launch?.at) || 0,
    })
  })
  return Array.from(byTask.values()).sort((a, b) => b.at - a.at)
}

const mapCloudSource = (row) => ({
  did: row.did,
  uid: row.upstream_uid || "",
  country: cleanCode(row.country_code),
  at: new Date(row.last_used_at).getTime() || 0,
})

const mapCloudLaunch = (row) => ({
  uid: row.did,
  dial: row.scenario_id,
  targetName: row.recipient_name || "",
  targetPhone: row.recipient_phone || "",
  taskId: row.task_id,
  at: new Date(row.launched_at).getTime() || 0,
})

export async function loadActivityHistory(userId) {
  const localSources = readLocalActivitySources()
  const localLaunches = readLocalActivityLaunches()
  const localHidden = readLocalHiddenActivity()

  if (!userId || !supabase) {
    return { sources: localSources, launches: localLaunches, hidden: localHidden }
  }

  const [sourcesResult, launchesResult, hiddenResult] = await Promise.all([
    supabase
      .from("activity_sources")
      .select("did,upstream_uid,country_code,last_used_at")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_launches")
      .select("did,task_id,scenario_id,recipient_name,recipient_phone,launched_at")
      .eq("user_id", userId)
      .order("launched_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("hidden_activity_records")
      .select("row_key")
      .eq("user_id", userId)
      .limit(HISTORY_LIMIT),
  ])

  const error = sourcesResult.error || launchesResult.error || hiddenResult.error
  if (error) throw error

  return {
    sources: mergeActivitySources(localSources, (sourcesResult.data || []).map(mapCloudSource)),
    launches: mergeActivityLaunches(localLaunches, (launchesResult.data || []).map(mapCloudLaunch)),
    hidden: new Set([
      ...localHidden,
      ...(hiddenResult.data || []).map((row) => row.row_key),
    ]),
  }
}

export async function migrateLocalActivityToCloud(userId) {
  if (!userId || !supabase || migratedUsers.has(userId)) return

  const sources = readLocalActivitySources()
  const launches = readLocalActivityLaunches()
  const sourceByDid = new Map(sources.map((source) => [source.did, source]))

  launches.forEach((launch) => {
    if (!sourceByDid.has(launch.uid)) {
      sourceByDid.set(launch.uid, { did: launch.uid, uid: "", country: "fi", at: launch.at })
    }
  })

  const sourceRows = Array.from(sourceByDid.values()).map((source) => ({
    user_id: userId,
    did: source.did,
    upstream_uid: source.uid || null,
    country_code: cleanCode(source.country),
    last_used_at: cleanDate(source.at),
  }))

  if (sourceRows.length) {
    const { error } = await supabase
      .from("activity_sources")
      .upsert(sourceRows, { onConflict: "user_id,did" })
    if (error) throw error
  }

  const launchRows = launches
    .filter((launch) => launch.taskId)
    .map((launch) => ({
      user_id: userId,
      did: launch.uid,
      task_id: launch.taskId,
      scenario_id: launch.dial,
      recipient_name: launch.targetName || null,
      recipient_phone: launch.targetPhone || null,
      launched_at: cleanDate(launch.at),
    }))

  if (launchRows.length) {
    const { error } = await supabase
      .from("activity_launches")
      .upsert(launchRows, { onConflict: "user_id,task_id" })
    if (error) throw error
  }

  const hiddenRows = Array.from(readLocalHiddenActivity()).map((rowKey) => ({
    user_id: userId,
    row_key: rowKey,
  }))

  if (hiddenRows.length) {
    const { error } = await supabase
      .from("hidden_activity_records")
      .upsert(hiddenRows, { onConflict: "user_id,row_key", ignoreDuplicates: true })
    if (error) throw error
  }

  migratedUsers.add(userId)
}

export async function saveActivityLaunch({
  userId,
  did,
  upstreamUid,
  countryCode,
  taskId,
  scenarioId,
  scenarioTitle,
  recipientName,
  recipientPhone,
  launchedAt = new Date(),
}) {
  if (!userId || !supabase) throw new Error("Sign in is required to sync Activity.")

  const timestamp = cleanDate(launchedAt)
  const { error: sourceError } = await supabase
    .from("activity_sources")
    .upsert({
      user_id: userId,
      did: String(did),
      upstream_uid: upstreamUid ? String(upstreamUid) : null,
      country_code: cleanCode(countryCode),
      last_used_at: timestamp,
    }, { onConflict: "user_id,did" })

  if (sourceError) throw sourceError

  const { error: launchError } = await supabase
    .from("activity_launches")
    .upsert({
      user_id: userId,
      did: String(did),
      task_id: String(taskId),
      scenario_id: String(scenarioId),
      scenario_title: scenarioTitle?.trim() || null,
      recipient_name: recipientName?.trim() || null,
      recipient_phone: recipientPhone?.trim() || null,
      launched_at: timestamp,
    }, { onConflict: "user_id,task_id" })

  if (launchError) throw launchError
}

export async function hideActivityRecord(userId, rowKey) {
  if (!userId || !supabase) return
  const { error } = await supabase
    .from("hidden_activity_records")
    .upsert({ user_id: userId, row_key: rowKey }, {
      onConflict: "user_id,row_key",
      ignoreDuplicates: true,
    })
  if (error) throw error
}

export function subscribeToActivityHistory(userId, onChange) {
  if (!userId || !supabase) return () => {}

  const channel = supabase.channel(`activity-history:${userId}`)
  ;["activity_sources", "activity_launches", "hidden_activity_records"].forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      onChange,
    )
  })
  channel.subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

const launchMatchKey = (uid, dial) => `${String(uid || "")}|${String(dial || "")}`
const callMatchKey = (call) => `${call.uid || call.accountDid || ""}:${call._id || ""}`

export function enrichRecordedCallsWithHistory(calls, launches) {
  if (!calls.length || !launches.length) return calls

  const launchesByMatch = new Map()
  launches.forEach((launch) => {
    const key = launchMatchKey(launch.uid, launch.dial)
    if (!launchesByMatch.has(key)) launchesByMatch.set(key, [])
    launchesByMatch.get(key).push(launch)
  })

  const assignments = new Map()
  launchesByMatch.forEach((matchingLaunches, key) => {
    const matchingCalls = calls.filter((call) => launchMatchKey(
      call.uid || call.accountDid,
      call.dial,
    ) === key)
    const count = Math.min(matchingLaunches.length, matchingCalls.length)
    for (let index = 0; index < count; index += 1) {
      assignments.set(callMatchKey(matchingCalls[index]), matchingLaunches[index])
    }
  })

  return calls.map((call) => {
    const launch = assignments.get(callMatchKey(call))
    if (!launch) return call
    return {
      ...call,
      targetName: launch.targetName || call.targetName,
      targetPhone: launch.targetPhone || call.targetPhone,
    }
  })
}
