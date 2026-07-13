const PRIMARY_LANGUAGE_GROUPS = new Set(["English", "Español", "Français", "Português"])

const COUNTRY_CODES = {
  Danmark: "dk", Deutsch: "de", Eesti: "ee", English: "gb", Español: "es", Français: "fr",
  Hrvatska: "hr", Indonesia: "id", Italiano: "it", Latvija: "lv", Lietuva: "lt", Magyarország: "hu",
  Malaysia: "my", Malta: "mt", Moldova: "md", Nederlands: "nl", Norge: "no", Polska: "pl",
  Português: "pt", România: "ro", Slovenija: "si", Slovensko: "sk", Suomi: "fi", Sverige: "se",
  Türkiye: "tr", Українська: "ua", "Việt Nam": "vn", Ísland: "is", Česko: "cz", Ελλάδα: "gr",
  Κύπρος: "cy", България: "bg", Русский: "ru", ישראל: "il", پاکستان: "pk", भारत: "in",
  বাংলাদেশ: "bd", ประเทศไทย: "th", 中国: "cn", 台灣: "tw", 日本: "jp", 대한민국: "kr",
  مصر: "eg", 香港: "hk", Australia: "au", Canada: "ca", Ireland: "ie", "New Zealand": "nz",
  Singapore: "sg", "South Africa": "za", "United Kingdom": "gb", "United States": "us",
  España: "es", México: "mx", Colombia: "co", Argentina: "ar", Chile: "cl", "Costa Rica": "cr",
  Paraguay: "py", Perú: "pe", "Puerto Rico": "pr", Venezuela: "ve", Belgique: "be", France: "fr",
  Lëtzebuerg: "lu", Suisse: "ch", Brasil: "br", Portugal: "pt", Română: "ro", عربي: "eg",
}

const cleanLocaleLabel = (label) => String(label || "").replace(/\uFFFD+/g, "").trim()

export const resolveCountryCode = (label, fallback = "fi") => {
  const cleanLabel = cleanLocaleLabel(label)
  if (/країн/i.test(cleanLabel)) return "ua"
  if (cleanLabel.includes("香港")) return "hk"
  return COUNTRY_CODES[cleanLabel] || fallback
}

export function normalizeCatalog(data) {
  const locales = []
  const scenarios = []

  Object.entries(data || {}).forEach(([groupName, value]) => {
    if (Array.isArray(value)) {
      const label = cleanLocaleLabel(groupName)
      const locale = {
        id: `flat:${groupName}`,
        label,
        group: "Other",
        countryCode: resolveCountryCode(label),
      }
      locales.push(locale)
      value.forEach((scenario) => scenarios.push({
        ...scenario,
        uniqueId: `${locale.id}:${scenario._id}`,
        localeId: locale.id,
        localeLabel: locale.label,
        countryCode: locale.countryCode,
      }))
      return
    }

    Object.entries(value || {}).forEach(([subRegion, list]) => {
      if (!Array.isArray(list)) return
      const label = cleanLocaleLabel(PRIMARY_LANGUAGE_GROUPS.has(groupName) ? subRegion : groupName)
      const locale = {
        id: `nested:${groupName}:${subRegion}`,
        label,
        group: PRIMARY_LANGUAGE_GROUPS.has(groupName) ? groupName : "Other",
        countryCode: resolveCountryCode(label, resolveCountryCode(subRegion)),
      }
      locales.push(locale)
      list.forEach((scenario) => scenarios.push({
        ...scenario,
        uniqueId: `${locale.id}:${scenario._id}`,
        localeId: locale.id,
        localeLabel: locale.label,
        countryCode: locale.countryCode,
      }))
    })
  })

  const uniqueLocales = Array.from(new Map(locales.map((locale) => [locale.id, locale])).values())
    .sort((a, b) => a.label.localeCompare(b.label))
  scenarios.sort((a, b) => a.localeLabel.localeCompare(b.localeLabel) || (a.order || 999) - (b.order || 999))

  return { locales: uniqueLocales, scenarios }
}
