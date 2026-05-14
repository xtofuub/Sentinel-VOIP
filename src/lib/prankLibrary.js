import { LANGUAGE_METADATA, MOCK_PRANKS_BY_LANGUAGE } from "./mockPranks.js";

const COUNTRY_LOCALE = {
  ar: "es-AR",
  au: "en-AU",
  bd: "bn-BD",
  be: "fr-BE",
  bg: "bg-BG",
  br: "pt-BR",
  ca: "en-CA",
  ch: "fr-CH",
  cl: "es-CL",
  cn: "zh-CN",
  co: "es-CO",
  cr: "es-CR",
  cy: "el-CY",
  cz: "cs-CZ",
  de: "de-DE",
  dk: "da-DK",
  ee: "et-EE",
  eg: "ar-EG",
  es: "es-ES",
  fi: "fi-FI",
  fr: "fr-FR",
  gb: "en-GB",
  gr: "el-GR",
  hk: "zh-HK",
  hr: "hr-HR",
  hu: "hu-HU",
  id: "id-ID",
  ie: "en-IE",
  il: "he-IL",
  in: "hi-IN",
  is: "is-IS",
  it: "it-IT",
  jp: "ja-JP",
  kr: "ko-KR",
  lt: "lt-LT",
  lu: "fr-LU",
  lv: "lv-LV",
  md: "ro-MD",
  mt: "mt-MT",
  mx: "es-MX",
  my: "ms-MY",
  nl: "nl-NL",
  no: "nb-NO",
  nz: "en-NZ",
  pe: "es-PE",
  pk: "ur-PK",
  pl: "pl-PL",
  pr: "es-PR",
  pt: "pt-PT",
  py: "es-PY",
  ro: "ro-RO",
  ru: "ru-RU",
  se: "sv-SE",
  sg: "en-SG",
  si: "sl-SI",
  sk: "sk-SK",
  th: "th-TH",
  tr: "tr-TR",
  tw: "zh-TW",
  ua: "uk-UA",
  us: "en-US",
  ve: "es-VE",
  vn: "vi-VN",
  za: "en-ZA",
};

const toCleanLabel = (value) =>
  String(value || "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const toCode = (value) => String(value || "").trim().toLowerCase();

export const countryToLocale = (country) => {
  const code = toCode(country);
  return COUNTRY_LOCALE[code] || `${code || "us"}-${(code || "us").toUpperCase()}`;
};

const getRawPranksForMeta = (meta) => {
  const group = MOCK_PRANKS_BY_LANGUAGE[meta?.baseLang];
  if (Array.isArray(group)) return group;
  if (!group || typeof group !== "object") return [];
  return group[meta.regionName] || Object.values(group).flat();
};

const firstText = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
};

const durationFor = (item, index) => {
  const explicit = Number(firstText(item, ["duracion", "duration", "seconds", "length"]));
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  return 84 + (index % 8) * 13;
};

const categoryFor = (item) => {
  const text = `${item?.titulo || ""} ${item?.desc || ""}`.toLowerCase();
  if (/(wifi|wi-fi|online|compra|purchase|network|social)/i.test(text)) return "Digital";
  if (/(taxi|pizza|delivery|sofa|parcel|package|flight|vuelo)/i.test(text)) return "Service";
  if (/(fine|ticket|police|multa|speed|car|coche|voiture)/i.test(text)) return "Bureaucratic";
  if (/(dog|perro|neighbor|neighbour|apartment|noise|ruido)/i.test(text)) return "Domestic";
  return "Scenario";
};

export const normalizeLocalPrank = (prank, meta, index = 0) => {
  const country = toCode(meta?.id || "us");
  const id = firstText(prank, ["_id", "id", "dial", "dial_id"]) || `${country}-${index}`;
  const title = firstText(prank, ["titulo", "title", "name", "nombre", "tname"]) || "Untitled scenario";
  const desc = firstText(prank, ["desc", "description", "descripcion", "detalle", "summary"]);
  const imageUrl = firstText(prank, ["image_url", "image", "img", "img_url", "thumbnail"]);
  const previewUrl = firstText(prank, ["example", "preview", "sample", "audio_example", "demo", "audiofile", "audio"]);

  return {
    ...prank,
    _id: `${country}-${id}`,
    dialId: id,
    titulo: title,
    descripcion: desc || title,
    desc: desc || title,
    image_url: imageUrl,
    previewUrl,
    example: previewUrl,
    duracion: durationFor(prank, index),
    categoria: prank?.categoria || prank?.category || categoryFor(prank),
    locale: countryToLocale(country),
    flag: country.toUpperCase(),
    region: country.toUpperCase(),
    country,
    languageLabel: toCleanLabel(meta?.tname) || country.toUpperCase(),
    regionDisplay: meta?.regionName === "Default" ? meta?.baseLang : meta?.regionName,
    source: "local-library",
    order: Number(prank?.order || index + 1),
  };
};

export const LOCAL_LANGUAGE_OPTIONS = LANGUAGE_METADATA.map((meta, index) => {
  const country = toCode(meta.id);
  const count = getRawPranksForMeta(meta).length;
  return {
    code: country,
    country,
    locale: countryToLocale(country),
    flag: country.toUpperCase(),
    label: toCleanLabel(meta.tname) || country.toUpperCase(),
    baseLang: meta.baseLang,
    regionName: meta.regionName,
    count,
    order: Number(meta.order_multi || index + 1),
  };
});

export const getLocalPranksForCountry = (country) => {
  const code = toCode(country);
  const meta = LANGUAGE_METADATA.find((item) => toCode(item.id) === code);
  if (!meta) return getAllLocalPranks();
  return getRawPranksForMeta(meta).map((prank, index) => normalizeLocalPrank(prank, meta, index));
};

export const getAllLocalPranks = () =>
  LANGUAGE_METADATA.flatMap((meta) =>
    getRawPranksForMeta(meta).map((prank, index) => normalizeLocalPrank(prank, meta, index)),
  );
