const BASE = "/api";

const rand = (len = 18) => {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

const uuidUpper = () =>
  (crypto.randomUUID ? crypto.randomUUID() : rand(36)).toUpperCase();

const fmtStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "*/*" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const clean = text.replace(/^0day:\s*/, "");
  try {
    return JSON.parse(clean);
  } catch {
    return { raw: clean };
  }
}

export async function createSession({ country = "fi", language = "fi_FI", timezone = "Europe/Helsinki" } = {}) {
  const did = uuidUpper();
  const uid = did;
  await post("create.lua", {
    did,
    dtype: "uid",
    route: "jl_azul",
    tags: { c: country.toUpperCase(), l: language, v: "6.7", r: "16.2", mf: "Apple" },
    timezone,
  });
  await post("get_user.lua", { did, uid });
  return { did, uid };
}

export async function getDialplan({ country, uid }) {
  const res = await post("get_dialplan_ios.lua", { c: country, uid });
  return Array.isArray(res) ? res : res?.dialplan || [];
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
  return { payload, res };
}
