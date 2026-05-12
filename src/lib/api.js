const BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

const rand = (len = 18) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < len; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
};

const uuidUpper = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : rand(36)).toUpperCase();

const fmtStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export class ApiError extends Error {
  constructor(message, { status, code, payload } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

const parsePayload = (text) => {
  const clean = String(text || "").replace(/^0day:\s*/i, "").trim();
  if (!clean) return {};

  try {
    return JSON.parse(clean);
  } catch {
    return { raw: clean };
  }
};

const stringifyReason = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(stringifyReason).filter(Boolean).join(" ");

  const candidates = [
    payload.message,
    payload.msg,
    payload.error,
    payload.reason,
    payload.detail,
    payload.description,
    payload.res,
    payload.status,
    payload.raw,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
};

const responseLooksRejected = (payload) => {
  const reason = stringifyReason(payload).toLowerCase();
  return /\b(error|failed|failure|reject|denied|blocked|invalid|insufficient|unauthorized|forbidden)\b/.test(reason);
};

async function post(endpoint, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = parsePayload(await response.text());
    if (!response.ok) {
      throw new ApiError(stringifyReason(payload) || `Request failed with HTTP ${response.status}`, {
        status: response.status,
        code: "HTTP_ERROR",
        payload,
      });
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError("The API request timed out.", { code: "TIMEOUT" });
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(error?.message || "The API request could not be completed.", { code: "NETWORK_ERROR" });
  } finally {
    window.clearTimeout(timeout);
  }
}

const isProbablyAudioUrl = (key, value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  const lowerKey = key.toLowerCase();
  const lowerValue = value.toLowerCase();
  const looksLikeUrl = /^(https?:|blob:|data:audio\/|\/)/.test(lowerValue);
  const looksLikeAudioKey = /(audio|record|media|file)/.test(lowerKey);
  const looksLikeAudioPath = /\.(mp3|wav|m4a|aac|ogg|oga|webm|flac)([?#].*)?$/.test(lowerValue);

  return looksLikeUrl && (looksLikeAudioKey || looksLikeAudioPath);
};

const findAudioUrl = (payload, depth = 0) => {
  if (!payload || depth > 4) return null;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findAudioUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  for (const [key, value] of Object.entries(payload)) {
    if (isProbablyAudioUrl(key, value)) return value;
  }

  for (const value of Object.values(payload)) {
    const found = findAudioUrl(value, depth + 1);
    if (found) return found;
  }

  return null;
};

const getDuration = (payload) => {
  const keys = ["duration", "duracion", "recordingDuration", "recording_duration", "seconds", "length"];
  for (const key of keys) {
    const value = payload?.[key];
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.round(number);
  }
  return 0;
};

export function normalizeTaskOutcome(payload) {
  const audioUrl = findAudioUrl(payload);
  const duration = getDuration(payload);
  const reason = stringifyReason(payload);
  const normalized = reason.toLowerCase();

  if (audioUrl) {
    return {
      status: "recorded",
      message: reason || "Recording is ready.",
      audioUrl,
      duration,
    };
  }

  if (responseLooksRejected(payload)) {
    return {
      status: "failed",
      message: reason || "The backend rejected the request.",
      audioUrl: null,
      duration: 0,
    };
  }

  if (/\b(recorded|complete|completed|finished|done)\b/.test(normalized)) {
    return {
      status: "no_audio",
      message: "The backend marked the run complete but did not return a playable recording URL.",
      audioUrl: null,
      duration: 0,
    };
  }

  if (payload?.ok === true || /\b(ok|accepted|created|queued|queue|pending|routing|processing|success)\b/.test(normalized)) {
    return {
      status: "queued",
      message: reason || "Accepted by backend. Waiting for recording metadata.",
      audioUrl: null,
      duration: 0,
    };
  }

  return {
    status: "failed",
    message: reason || "Unexpected response from the backend.",
    audioUrl: null,
    duration: 0,
  };
}

export async function createSession({ country = "fi", language = "fi_FI", timezone = "Europe/Helsinki" } = {}) {
  const did = uuidUpper();
  const uid = did;
  const createRes = await post("create.lua", {
    did,
    dtype: "uid",
    route: "jl_azul",
    tags: { c: country.toUpperCase(), l: language, v: "6.7" },
    timezone,
  });

  const userRes = await post("get_user.lua", { did, uid });
  if (responseLooksRejected(createRes) || responseLooksRejected(userRes)) {
    throw new ApiError(stringifyReason(userRes) || stringifyReason(createRes) || "Session rejected by backend.", {
      code: "SESSION_REJECTED",
      payload: { createRes, userRes },
    });
  }

  return { did, uid };
}

export async function getDialplan({ country, uid }) {
  const res = await post("get_dialplan_ios.lua", { c: country, uid });
  if (responseLooksRejected(res)) {
    throw new ApiError(stringifyReason(res) || "Dial plan rejected by backend.", {
      code: "DIALPLAN_REJECTED",
      payload: res,
    });
  }

  return Array.isArray(res) ? res : res?.dialplan || res?.data?.dialplan || [];
}

export async function createTask({ uid, country, scenario, subject, phone }) {
  const stamp = fmtStamp();
  const payload = {
    _id: rand(18),
    c: country,
    dial: scenario._id,
    dst: phone.replace(/^\+/, "").replace(/\D/g, ""),
    f: stamp,
    real_f: stamp,
    nombre: subject,
    titulo: scenario.titulo,
    uid,
  };

  const res = await post("create_task_ios.lua", payload);
  return { payload, res, outcome: normalizeTaskOutcome(res) };
}
