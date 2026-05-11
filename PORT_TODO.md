# Sentinel-VOIP — Juas Design Port · Handoff

Goal: port the `juas/` design into this Vite project (`Sentinel-VOIP/`) and
wire the real backend so calls actually launch. Also fix any overlapping /
clipped text introduced by the juas layouts on narrow viewports.

## Status

- [x] Read all juas source files (`juas/*.jsx`, `styles.css`, `data.js`)
- [ ] Everything else (see checklist below)

## Reference files (do not edit — they are the design source)

- `../juas/app.jsx` — router + tweaks panel (tweaks panel can be dropped, it targets a host protocol that does not exist here)
- `../juas/components.jsx` — Icon, Flag, LogoMark, Wordmark, NavBar, NavLink, Footer, SectionHeader, AudioPlayer, CountUp, StatusPill, RouterContext, useRouter, Link, useReveal
- `../juas/data.js` — LOCALES (~45 codes), SCENARIOS (22 mock), ACTIVITY (seed log)
- `../juas/page-home.jsx` — Hero, LogoStrip, ProductPanel + ConsoleMock, FeatureGrid, CatalogPreview, ApiBlock, HowItWorks, Testimonials, CTABanner
- `../juas/page-catalog.jsx` — Catalog, CatalogCard, ScenarioArtwork, Dropdown
- `../juas/page-dashboard.jsx` — Dashboard, ScenarioCard, LocaleSelect, ActivityList
- `../juas/page-pricing.jsx` — Pricing (tiers, runs calculator, comparison, FAQ, CTA)
- `../juas/styles.css` — design tokens + component utilities (OKLCH, Inter / Inter Tight / JetBrains Mono)
- `../juas/tweaks-panel.jsx` — ignore, host-protocol specific
- `sentinel_ui.py.bak` — the original Python backend client; has the exact backend payloads

## Backend (already proxied)

`vite.config.js` already proxies `/api/*` to `https://master.appha.es/lua/bromapp/user`
and injects spoofed iOS headers. Use `/api/<endpoint>` from the browser.

Endpoints (all POST JSON):

- `POST /api/create.lua`
  body: `{ did, dtype:"uid", route:"jl_azul", tags:{ c, l, v:"6.7", r:"16.2", mf:"Apple" }, timezone }`
- `POST /api/get_user.lua`
  body: `{ did, uid }` — `uid === did` (uppercased UUID)
- `POST /api/get_dialplan_ios.lua`
  body: `{ c: "<country lowercase>", uid }` — returns array of `{ _id, titulo, ... }`
- `POST /api/create_task_ios.lua`
  body: `{ _id, c, dial, dst, f, real_f, nombre, titulo, uid }`
  - `_id` = random 18-char `[A-Za-z0-9]`
  - `c` = country lowercase (e.g. `"fi"`, `"us"`, `"es"`)
  - `dial` = selected scenario `_id` from the dial plan
  - `dst` = destination number E.164 without the leading `+` (e.g. `358442006284`)
  - `f` and `real_f` = current timestamp `dd-MM-yyyyTHH:mm:ss`
  - `nombre` = victim / subject name
  - `titulo` = selected scenario `titulo`
  - `uid` = the `did` from create.lua

Success: response JSON contains `{ "res": "OK", ... }`.

### Locale code → country code mapping

`get_dialplan_ios.lua` and `create_task_ios.lua` use lowercase ISO country
codes (e.g. `fi`, `es`, `us`, `de`). The locale codes in `LOCALES` are like
`"en-US"`, `"fi-FI"`, `"es-MX"`. Map with:

```js
export const localeToCountry = (code) => {
  const m = /-([A-Z]{2})$/.exec(code);
  return (m ? m[1] : code).toLowerCase();
};
export const localeToLanguage = (code) => code.replace("-", "_"); // "fi_FI"
```

## Target directory structure

```
Sentinel-VOIP/
  index.html              <- rewrite: drop Tailwind CDN, load Inter/InterTight/JetBrainsMono, point to /src/main.jsx
  src/
    main.jsx              <- entrypoint: ReactDOM.createRoot(document.getElementById('root')).render(<App/>)
    App.jsx               <- RouterContext.Provider + NavBar + <Page/> + Footer (+ reveal observer)
    styles.css            <- copy juas/styles.css verbatim + responsive additions (see below)
    lib/
      data.js             <- export LOCALES, SCENARIOS, ACTIVITY (copy from juas/data.js but as ESM)
      api.js              <- real backend (see skeleton below)
      session.js          <- singleton session (did/uid) used by Dashboard
    context/
      RouterContext.jsx   <- createContext({path,navigate}) + useRouter hook + Link
    components/
      Icon.jsx            <- from juas components.jsx
      Flag.jsx            <- FLAG_PATTERNS + Flag
      LogoMark.jsx        <- LogoMark + Wordmark
      NavBar.jsx          <- NavBar + NavLink
      Footer.jsx
      SectionHeader.jsx
      AudioPlayer.jsx
      StatusPill.jsx
      CountUp.jsx
    pages/
      Home.jsx
      Catalog.jsx
      Dashboard.jsx       <- WIRED to real API (see Dashboard section below)
      Pricing.jsx
```

## Conversion rules (from juas Babel-standalone to ESM)

The juas files rely on globals (`React`, `ReactDOM`, `window.Home`, etc.).
When porting:

1. Replace `const { useState, useEffect, ... } = React;` with
   `import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";`
2. Remove every `window.X = X` footer and every `window.SCENARIOS` / `window.LOCALES` / `window.ACTIVITY` read. Replace with proper `import`.
3. Replace `window.Home`, `window.Catalog`, `window.Dashboard`, `window.Pricing` page dispatch with a plain `switch(path)` in `App.jsx`.
4. Drop the tweaks panel and `applyAccent`/`useTweaks` — they exist for an external host that isn't here. Keep the router, reveal observer, and page dispatch.

## Step-by-step checklist

Do these in order. Each step is small and testable.

### 1. index.html (5 min)

Drop the Tailwind CDN and Juas Mojave tailwind config. Load Inter + Inter
Tight + JetBrains Mono from Google Fonts. Content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1a1515" />
    <meta name="description" content="Sentinel-VOIP — operator-grade scenario routing." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>Sentinel-VOIP — Operator-grade scenario routing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 2. src/styles.css

Copy `juas/styles.css` verbatim. Then APPEND the responsive block below to
collapse grids on narrow viewports and patch a few overflow risks:

```css
/* ── Responsive additions (original juas design is desktop-first) ─── */

/* All multi-col grids collapse to 1 col on phone */
@media (max-width: 880px) {
  .cols-2, .cols-3, .cols-4 { grid-template-columns: 1fr !important; }
  .cols-asym { grid-template-columns: 1fr !important; gap: 32px !important; }
  .nav-hide-mobile { display: none !important; }
}

@media (max-width: 1100px) {
  .cols-4 { grid-template-columns: repeat(2, 1fr) !important; }
  .cols-3 { grid-template-columns: repeat(2, 1fr) !important; }
}

/* dashboard: sidebar stops being sticky and goes full width */
@media (max-width: 960px) {
  .dash-cols { grid-template-columns: 1fr !important; }
  .dash-configure { position: static !important; }
}

/* console mock inside ProductPanel */
@media (max-width: 820px) {
  .console-mock { grid-template-columns: 1fr !important; }
}

/* catalog toolbar stacks on narrow */
@media (max-width: 900px) {
  .catalog-toolbar { grid-template-columns: 1fr !important; }
  .catalog-toolbar > * { width: 100% !important; }
}

/* catalog list view scrolls horizontally rather than crushing columns */
.catalog-list-wrap { overflow-x: auto; }
.catalog-list-row,
.catalog-list-head { min-width: 1180px; }

/* activity list same treatment */
.activity-wrap { overflow-x: auto; }
.activity-row,
.activity-head { min-width: 980px; }

/* pricing tiers -> 1 col phone, stack rec banner below */
@media (max-width: 960px) {
  .pricing-tiers { grid-template-columns: 1fr !important; }
  .pricing-calc { grid-template-columns: 1fr !important; gap: 24px !important; }
  .pricing-compare-row { grid-template-columns: 1.2fr repeat(3, 1fr) !important; font-size: 12px; }
}

/* CTA banners padding reduction */
@media (max-width: 720px) {
  .cta-banner { padding: 32px 24px !important; }
}

/* prevent truncated children from exploding flex parents */
.truncate-parent { min-width: 0; }
.truncate { min-width: 0; }
```

**IMPORTANT:** in the ported Catalog list view, there is a typo in the juas
source (`className2="truncate"` on the description span). Change it to
`className="truncate"` and also add `min-width: 0` on the row grid cell so
the truncation actually works.

### 3. src/lib/data.js (copy, ESM)

```js
export const SCENARIOS = [ /* copy array from juas/data.js verbatim */ ];
export const LOCALES   = [ /* copy */ ];
export const ACTIVITY  = [ /* copy */ ];

export const localeToCountry = (code) => {
  const m = /-([A-Z]{2})$/.exec(code);
  return (m ? m[1] : code).toLowerCase();
};
export const localeToLanguage = (code) => code.replace("-", "_");
```

### 4. src/lib/api.js (new — real backend)

```js
const BASE = "/api"; // Vite proxy handles the rest

const rand = (len = 18) => {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = ""; for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};
const uuidUpper = () => (crypto.randomUUID ? crypto.randomUUID() : rand(36)).toUpperCase();
const fmtStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "*/*" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  // Server sometimes prefixes responses with "0day:"; strip it defensively.
  const clean = text.replace(/^0day:\s*/, "");
  try { return JSON.parse(clean); } catch { return { raw: clean }; }
}

export async function createSession({ country = "fi", language = "fi_FI", timezone = "Europe/Helsinki" } = {}) {
  const did = uuidUpper();
  const uid = did;
  await post("create.lua", {
    did, dtype: "uid", route: "jl_azul",
    tags: { c: country.toUpperCase(), l: language, v: "6.7", r: "16.2", mf: "Apple" },
    timezone,
  });
  await post("get_user.lua", { did, uid });
  return { did, uid };
}

export async function getDialplan({ country, uid }) {
  const res = await post("get_dialplan_ios.lua", { c: country, uid });
  return Array.isArray(res) ? res : (res?.dialplan || []);
}

export async function createTask({ uid, country, scenario, subject, phone }) {
  const stamp = fmtStamp();
  const payload = {
    _id: rand(18),
    c: country,
    dial: scenario._id,
    dst: phone.replace(/^\+/, "").replace(/\D/g, ""),
    f: stamp, real_f: stamp,
    nombre: subject,
    titulo: scenario.titulo,
    uid,
  };
  const res = await post("create_task_ios.lua", payload);
  return { payload, res };
}
```

### 5. src/context/RouterContext.jsx

Lift `RouterContext`, `useRouter`, `Link` out of `juas/components.jsx`
unchanged (convert to ESM imports + `export`).

### 6. src/components/*.jsx

Split `juas/components.jsx` into one file per component. Each file:

- imports React hooks it uses from `react`
- imports `RouterContext`, `Link` etc. from `../context/RouterContext`
- imports `Icon` / `Flag` from their sibling files
- `export default` the component

In `NavBar.jsx`, add `className="nav-hide-mobile"` to the Docs and Changelog
NavLinks so the header doesn't overflow on phones.

### 7. src/pages/Home.jsx

Port `juas/page-home.jsx`. Replace `window.SCENARIOS` / `window.ACTIVITY`
with ESM imports from `../lib/data`. Replace the inline
`gridTemplateColumns` on the big grids with `className="cols-3 ..."` (or
keep inline but also add the class) so the responsive CSS from step 2 kicks
in. Specifically:

- ProductPanel inner grid → add `className="console-mock"`
- FeatureGrid → add `className="cols-3"`
- CatalogPreview outer grid → add `className="cols-asym"`, inner card grid `cols-2`
- ApiBlock outer grid → `className="cols-asym"`
- HowItWorks grid → `className="cols-4"`
- Testimonials grid → `className="cols-2"`
- CTABanner wrapper → `className="cta-banner"`

### 8. src/pages/Catalog.jsx

Port `juas/page-catalog.jsx`. Changes:

1. Import `SCENARIOS` from `../lib/data`
2. **Fix the typo**: `className2="truncate"` → `className="truncate"` in the
   list row description cell
3. Wrap the list view in `<div className="catalog-list-wrap">` and add
   `className="catalog-list-head"` / `"catalog-list-row"` to the header and
   each row so they scroll instead of crushing
4. Add `className="catalog-toolbar"` to the search row grid

### 9. src/pages/Dashboard.jsx (real backend wiring — the big one)

Port from `juas/page-dashboard.jsx` with these changes:

- Remove `const [activity, setActivity] = useState(() => [...window.ACTIVITY]);` initial; start with `useState([])` (real runs only).
- Replace the "simulate routing→recorded" `useEffect` with nothing (real backend controls status).
- Add session + dial-plan loading:

```jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, localeToCountry, localeToLanguage } from "../lib/data";
import { createSession, getDialplan, createTask } from "../lib/api";

// inside Dashboard()
const [session, setSession]   = useState(null); // { did, uid }
const [dialplan, setDialplan] = useState([]);   // [{ _id, titulo, ... }]
const [status, setStatus]     = useState("initialising"); // initialising | ready | error
const [loadingPlan, setLoadingPlan] = useState(false);
const [launching, setLaunching] = useState(false);

// 1. One-shot session init when the page mounts
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const localeObj = LOCALES.find(l => l.code === locale);
      const s = await createSession({
        country:  localeToCountry(locale),
        language: localeToLanguage(locale),
      });
      if (cancelled) return;
      setSession(s);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setToast({ type: "error", msg: "Failed to initialise session" });
    }
  })();
  return () => { cancelled = true; };
}, []); // intentionally once

// 2. Fetch dial plan whenever locale OR session changes
useEffect(() => {
  if (!session) return;
  let cancelled = false;
  setLoadingPlan(true);
  (async () => {
    try {
      const plan = await getDialplan({ country: localeToCountry(locale), uid: session.uid });
      if (cancelled) return;
      setDialplan(plan);
      // auto-select first scenario in the new plan
      if (plan.length && !plan.find(p => p._id === scenarioId)) setScenarioId(plan[0]._id);
    } catch (e) {
      if (!cancelled) setToast({ type: "error", msg: "Failed to load dial plan" });
    } finally {
      if (!cancelled) setLoadingPlan(false);
    }
  })();
  return () => { cancelled = true; };
}, [locale, session]);

// 3. Real initiate()
const initiate = async () => {
  if (!subject.trim() || !number.trim()) {
    setToast({ type: "error", msg: "Subject and destination are required." });
    return;
  }
  const scenario = dialplan.find(p => p._id === scenarioId) || dialplan[0];
  if (!scenario) { setToast({ type: "error", msg: "No scenario selected." }); return; }
  if (!session) { setToast({ type: "error", msg: "Session not ready." }); return; }

  setLaunching(true);
  const localeObj = LOCALES.find(l => l.code === locale);
  const rowId = "evt_" + Date.now().toString(36);
  const row = {
    id: rowId,
    scenario: scenario.titulo,
    subject,
    number: `${dialPrefix} ${number}`,
    locale,
    flag: localeObj?.flag || "US",
    status: "routing",
    duration: 0,
    started: new Date().toISOString(),
  };
  setActivity(prev => [row, ...prev]);
  setSelectedLogId(rowId);

  try {
    const { res } = await createTask({
      uid: session.uid,
      country: localeToCountry(locale),
      scenario,
      subject,
      phone: `${dialPrefix}${number}`,
    });
    const ok = res?.res === "OK" || res?.ok === true;
    setActivity(prev => prev.map(a => a.id === rowId
      ? { ...a, status: ok ? "recorded" : "failed", duration: ok ? scenario.duracion || 120 : 0 }
      : a
    ));
    setToast({ type: ok ? "success" : "error", msg: ok ? `Call queued — ${scenario.titulo}` : `Rejected: ${res?.res || "unknown"}` });
  } catch (e) {
    setActivity(prev => prev.map(a => a.id === rowId ? { ...a, status: "failed" } : a));
    setToast({ type: "error", msg: "Network error" });
  } finally {
    setLaunching(false);
  }
};
```

- In the vault area, replace `vaultScenarios` calculation (which filtered
  `window.SCENARIOS` by locale) with filtering `dialplan` by `titulo` /
  description matching the search query. The dialplan items have shape
  roughly `{ _id, titulo, c, ... }`; display what you get.

- Selected-scenario summary: use the dialplan item you selected
  (`titulo` instead of `title`, `_id` instead of `id`, etc.). Keep field
  names backwards-compatible by mapping once:

```js
const toCard = (p) => ({
  id: p._id,
  title: p.titulo,
  desc: p.descripcion || p.titulo,
  duration: p.duracion || 120,
  flag: LOCALES.find(l => l.code === locale)?.flag || "US",
  locale,
  category: p.categoria || "Scenario",
});
```

  and render using those field names — all of the existing card JSX still
  works.

- Add a small "status chip" near the page header showing session state:

```jsx
<div className="surface-flat" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", height: 34 }}>
  <span style={{ width: 6, height: 6, borderRadius: 99,
    background: status === "ready" ? "var(--ok)" : status === "error" ? "var(--bad)" : "var(--warn)",
  }} />
  <span className="micro mono" style={{ color: "var(--ink-3)" }}>
    {status === "ready" ? `uid ${session?.uid.slice(0,8)}…` : status === "error" ? "offline" : "connecting…"}
  </span>
</div>
```

- Disable the big "Initiate mischief" button while `launching || status !== "ready" || !dialplan.length`.

- Wrap the top configure/vault grid with `className="dash-cols"`, sticky
  sidebar with `className="dash-configure"`, and the activity list inner
  with `<div className="activity-wrap">` containing rows with
  `className="activity-row"` and header with `className="activity-head"`.

### 10. src/pages/Pricing.jsx

Port `juas/page-pricing.jsx`. Add classes:

- Tiers grid: `className="pricing-tiers"`
- Runs calculator inner grid: `className="pricing-calc"`
- Comparison table rows: `className="pricing-compare-row"`
- Final CTA wrapper: `className="cta-banner"`

### 11. src/App.jsx + src/main.jsx

```jsx
// src/App.jsx
import { useEffect } from "react";
import { useRouter, RouterContext } from "./context/RouterContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import "./styles.css";

export default function App() {
  const { path, navigate } = useRouter();

  // Reveal-on-scroll global observer, re-runs per route change
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    const id = requestAnimationFrame(() => {
      document.querySelectorAll(".reveal:not(.in), .reveal-stagger:not(.in)").forEach((el) => io.observe(el));
    });
    return () => { cancelAnimationFrame(id); io.disconnect(); };
  }, [path]);

  let Page = Home;
  if (path === "/catalog") Page = Catalog;
  else if (path === "/dashboard") Page = Dashboard;
  else if (path === "/pricing") Page = Pricing;

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <NavBar />
        <div style={{ flex: 1, position: "relative" }}>
          <Page key={path} />
        </div>
        <Footer />
      </div>
    </RouterContext.Provider>
  );
}
```

```jsx
// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

### 12. Verify

```
npm run build
npm run dev
```

Smoke test:
- `/` home renders, no horizontal scroll at 375px / 768px / 1440px
- `/catalog` grid and list both render, list scrolls horizontally on narrow
- `/dashboard` shows "connecting…" briefly, then "uid ABC12345…". The vault
  populates with real titles from `get_dialplan_ios.lua`. Changing locale
  triggers another dial-plan fetch. Filling subject + number and clicking
  "Initiate mischief" POSTs `create_task_ios.lua` and the activity row
  settles to `recorded` or `failed` based on the response.
- `/pricing` renders, slider works, FAQ opens.

## Known / watch-out items

1. `className2` typo in juas catalog list — do not copy the typo. Fix to `className`.
2. Juas NavBar has 5 links; on mobile it overflows. Use `nav-hide-mobile` on Docs + Changelog.
3. Dashboard activity grid is 8 cols; will overflow below ~1000px. Use `activity-wrap` + min-width.
4. The backend spoof headers (User-Agent, Accept-Language) are set by the Vite proxy — do not add them in `fetch()` from the browser, they'll be blocked.
5. The backend sometimes returns `0day:` prefix; `api.js` strips it.
6. `crypto.randomUUID` exists in all modern browsers served by Vite; no polyfill needed.
7. Once deployed to Vercel, the `/api` proxy from `vite.config.js` does NOT apply — you'll need a matching rewrite in `vercel.json` OR a serverless function. For local dev this works.

## Quick start to resume

```
cd C:\Users\SB1\Desktop\VOIP\Sentinel-VOIP
# then work through the checklist above in order
```

When done, delete this file.
