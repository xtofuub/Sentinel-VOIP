import React, { useEffect, useState, useMemo, useRef } from "react";

// Comprehensive mapping of the 64 unique locales to FlagCDN ISO codes
const REGION_MAP = {
  // Primary/Flat Regions
  "Danmark": "dk",
  "Deutsch": "de",
  "Eesti": "ee",
  "English": "gb",
  "Español": "es",
  "Français": "fr",
  "Hrvatska": "hr",
  "Indonesia": "id",
  "Italiano": "it",
  "Latvija": "lv",
  "Lietuva": "lt",
  "Magyarország": "hu",
  "Malaysia": "my",
  "Malta": "mt",
  "Moldova": "md",
  "Nederlands": "nl",
  "Norge": "no",
  "Polska": "pl",
  "Português": "pt",
  "România": "ro",
  "Slovenija": "si",
  "Slovensko": "sk",
  "Suomi": "fi",
  "Sverige": "se",
  "Türkiye": "tr",
  "Yкраїнська": "ua",
  "Việt Nam": "vn",
  "Ísland": "is",
  "Česko": "cz",
  "Ελλάδα": "gr",
  "Κύπρος": "cy",
  "България": "bg",
  "Русский": "ru",
  "ישראל": "il",
  "پاکستان": "pk",
  "भारत": "in",
  "বাংলাদেশ": "bd",
  "ประเทศไทย": "th",
  "中国": "cn",
  "台灣": "tw",
  "日本": "jp",
  "대한민국": "kr",
  "مصر": "eg",
  "香港": "hk",
  "Hong Kong": "hk",

  // Sub-regions
  "Australia": "au",
  "Canada": "ca",
  "Ireland": "ie",
  "New Zealand": "nz",
  "Singapore": "sg",
  "South Africa": "za",
  "United Kingdom": "gb",
  "United States": "us",
  "España": "es",
  "México": "mx",
  "Colombia": "co",
  "Argentina": "ar",
  "Chile": "cl",
  "Costa Rica": "cr",
  "Paraguay": "py",
  "Perú": "pe",
  "Puerto Rico": "pr",
  "Venezuela": "ve",
  "Belgique": "be",
  "France": "fr",
  "Lëtzebuerg": "lu",
  "Suisse": "ch",
  "Brasil": "br",
  "Portugal": "pt",
  "Română": "ro",
  "عربي": "eg"
};

const getFlagUrl = (regionName) => {
  if (!regionName) return "https://flagcdn.com/w40/un.png";
  if (regionName.includes("香港") || regionName === " ") return "https://flagcdn.com/w40/hk.png";
  const code = REGION_MAP[regionName] || "un";
  return `https://flagcdn.com/w40/${code}.png`;
};

const formatRegionName = (name) => {
  if (name.includes("香港")) return "Hong Kong";
  return name;
};

export const Catalog = () => {
  const [mockData, setMockData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRegionId, setActiveRegionId] = useState("all");
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    document.title = "Juas Mojave | Prank Catalog";
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    import("@/services/mock_data")
      .then((mod) => {
        if (cancelled) return;
        setMockData(mod.MOCK_PRANKS_BY_LANGUAGE);
      })
      .finally(() => {
        if (cancelled) return;
        setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const PRIMARY_LANGUAGES = ["English", "Español", "Français", "Português"];

  // Grouped structure for the filter UI
  const regionGroups = useMemo(() => {
    if (!mockData) return {};
    const groups = {
      English: [],
      Español: [],
      Français: [],
      Português: [],
      Other: []
    };

    Object.entries(mockData).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        groups.Other.push({ label: key, key, subKey: null, id: `flat-${key}` });
      } else {
        const groupName = PRIMARY_LANGUAGES.includes(key) ? key : "Other";
        Object.keys(val).forEach((sub) => {
          const labelName = PRIMARY_LANGUAGES.includes(key) ? sub : key;
          groups[groupName].push({ label: labelName, key, subKey: sub, id: `${key}-${sub}` });
        });
      }
    });

    groups.Other.sort((a, b) => a.label.localeCompare(b.label));
    return groups;
  }, [mockData]);

  // Flattened pranks for easy filtering
  const allPranks = useMemo(() => {
    if (!mockData) return [];
    let flattened = [];
    Object.entries(mockData).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((prank) => {
          flattened.push({
            ...prank,
            regionId: `flat-${key}`,
            regionDisplay: key,
            uniqueId: `${key}-${prank._id}`
          });
        });
      } else {
        Object.entries(val).forEach(([subKey, subPranks]) => {
          subPranks.forEach((prank) => {
            const labelName = PRIMARY_LANGUAGES.includes(key) ? subKey : key;
            flattened.push({
              ...prank,
              regionId: `${key}-${subKey}`,
              regionDisplay: labelName,
              uniqueId: `${key}-${subKey}-${prank._id}`
            });
          });
        });
      }
    });
    return flattened.sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [mockData]);

  const filteredPranks = useMemo(() => {
    return allPranks.filter((prank) => {
      const matchesSearch = 
        (prank.titulo && prank.titulo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (prank.desc && prank.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRegion = activeRegionId === "all" || prank.regionId === activeRegionId;
      
      return matchesSearch && matchesRegion;
    });
  }, [allPranks, searchQuery, activeRegionId]);

  const togglePlay = (audioUrl, prankId) => {
    if (currentlyPlaying === prankId) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setCurrentlyPlaying(prankId);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white font-['Inter'] pb-20">
      <div className="max-w-[1600px] mx-auto px-6 md:px-20 pt-32 pb-12">
        {/* Hero Header Section */}
        <header className="mb-20">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 uppercase prank-library-title leading-[0.9] py-2">
            Prank Library
          </h1>
          <p className="max-w-2xl text-xl text-on-surface-variant leading-relaxed">
            Choose from over 500 hand-crafted vocal scenarios. Immersive, high-quality scripts tailored for global impact.
          </p>
        </header>

        {/* Region Selector / Filters */}
        <section className="mb-16 flex flex-wrap gap-4 scrollbar-hide">
          <button
            onClick={() => setActiveRegionId("all")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all shadow-lg ${
              activeRegionId === "all"
                ? "bg-[#ffb1c5] text-[#3f001b] shadow-[0_4px_20px_rgba(255,177,197,0.3)]"
                : "bg-surface-container-high text-on-surface hover:bg-surface-bright border border-white/5"
            }`}
          >
            All Regions
          </button>

          {Object.entries(regionGroups)
            .filter(([_, regs]) => regs.length > 0)
            .flatMap(([_, regions]) =>
              regions.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setActiveRegionId(reg.id)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all flex items-center gap-2 group/btn ${
                    activeRegionId === reg.id
                      ? "bg-[#ffb1c5] text-[#3f001b] shadow-[0_4px_20px_rgba(255,177,197,0.3)]"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-bright border border-white/5"
                  }`}
                >
                  <img src={getFlagUrl(reg.label)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                  {formatRegionName(reg.label)}
                </button>
              ))
            )}
        </section>

        {/* Search Bar */}
        <div className="mt-6 mb-2">
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              type="text"
              placeholder="Search scenarios..."
              className="w-full bg-surface-container-high/90 backdrop-blur-xl border border-primary/25 focus:border-primary/70 focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60 py-4 pl-14 pr-12 rounded-2xl transition-all shadow-[0_12px_40px_rgba(0,0,0,0.45)] focus:shadow-[0_0_0_1px_rgba(255,134,179,0.35),0_0_35px_rgba(255,134,179,0.08),0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-outline hover:text-primary transition-colors"
                aria-label="Clear search"
                title="Clear"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-outline/80">
            Tip: search by title or description
          </p>
        </div>

        {/* Results Info */}
        <div className="mb-8 mt-8 flex items-center justify-between bg-white/5 rounded-2xl px-6 py-4 border border-white/5">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
            Catalog Database / <span className="text-white">{filteredPranks.length}</span> Results found
          </p>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff4a8e]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Prank Grids by Language */}
        {dataLoading ? (
          <div className="mt-10 mb-8 ds-glass ds-ghost-border rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-container/10 rounded-full blur-[120px]" />
            <div className="relative flex items-center justify-between gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-outline mb-3">Loading Collection</div>
                <div className="text-xl font-black tracking-tight text-on-surface">Indexing scenarios…</div>
                <div className="text-sm text-on-surface-variant mt-2 max-w-xl">
                  Bringing in your library. This is only slow the first time.
                </div>
              </div>
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/20 grid place-items-center">
                <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
              </div>
            </div>

            {/* Skeleton grid */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 opacity-60">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-1">
                  <div className="aspect-video rounded-lg bg-surface-container-highest animate-pulse" />
                  <div className="px-5 pb-6 pt-5 space-y-3">
                    <div className="h-4 w-3/4 bg-surface-container-highest rounded animate-pulse" />
                    <div className="h-3 w-full bg-surface-container-highest rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-surface-container-highest rounded animate-pulse" />
                    <div className="pt-4 flex items-center justify-between">
                      <div className="h-3 w-24 bg-surface-container-highest rounded animate-pulse" />
                      <div className="h-8 w-8 bg-surface-container-highest rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-32">
          {Object.entries(regionGroups)
            .filter(([_, regs]) => regs.some((r) => filteredPranks.some((p) => p.regionId === r.id)))
            .map(([groupName, regions]) => {
              const groupPranks = filteredPranks.filter((p) => regions.some((r) => r.id === p.regionId));
              if (groupPranks.length === 0) return null;

              // Don't show a generic "Other" header; show each locale/country name instead.
              if (groupName === "Other") {
                return regions
                  .filter((r) => filteredPranks.some((p) => p.regionId === r.id))
                  .map((r) => {
                    const regionPranks = filteredPranks.filter((p) => p.regionId === r.id);
                    if (regionPranks.length === 0) return null;

                    return (
                      <section key={r.id} className="scroll-mt-32">
                        <div className="flex items-baseline justify-between mb-12">
                          <div className="flex items-center gap-6">
                            <h2 className="text-4xl font-black tracking-tighter uppercase border-l-[6px] border-[#ff4a8e] pl-6 py-2">
                              {formatRegionName(r.label)}
                            </h2>
                            <div className="h-px w-24 bg-gradient-to-r from-[#ff4a8e]/40 to-transparent hidden md:block" />
                          </div>
                          <span className="text-sm font-bold tracking-[0.2em] uppercase text-[#ffb1c5]/60 pr-2">
                            {regionPranks.length} {regionPranks.length === 1 ? "Scenario" : "Scenarios"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                          {regionPranks.map((prank, idx) => {
                            const isPopular = (prank.order ?? idx + 1) <= 2;
                            return (
                            <div
                              key={prank.uniqueId}
                              className="group relative overflow-hidden bg-surface-container-low rounded-xl border-outline-variant/20 border p-1 transition-all duration-500 hover:bg-surface-container-high hover:border-[#ff4a8e]/30 flex flex-col h-[400px]"
                            >
                              <div className="aspect-video mb-5 overflow-hidden rounded-lg bg-surface-container-highest relative shrink-0">
                                <img
                                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                  src={prank.image_url}
                                  alt={prank.titulo}
                                  loading="lazy"
                                />

                                {/* Region Badge */}
                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-md border border-white/10 flex items-center gap-2 z-10 shadow-2xl">
                                  <img src={getFlagUrl(prank.regionDisplay)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                                  <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white">
                                    {prank.regionDisplay}
                                  </span>
                                </div>

                                {/* Progress Bar for playing audio */}
                                {currentlyPlaying === prank.uniqueId && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-10">
                                    <div className="h-full bg-[#ffb1c5] animate-[progress_20s_linear]" />
                                  </div>
                                )}
                              </div>

                              <div className="px-5 pb-6 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-3 gap-3">
                                  <h3
                                    className="text-xl font-bold text-on-surface line-clamp-1 group-hover:text-[#ffb1c5] transition-colors"
                                    title={prank.titulo}
                                  >
                                    {prank.titulo}
                                  </h3>
                                  {isPopular && (
                                    <span className="text-[9px] shrink-0 font-black uppercase text-[#ff4a8e] border border-[#ff4a8e]/40 px-2 py-1 rounded lg bg-[#ff4a8e]/5">
                                      Popular
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm text-on-surface-variant mb-6 leading-relaxed line-clamp-2 opacity-80">
                                  {prank.desc}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                  <button
                                    onClick={() => togglePlay(prank.example, prank.uniqueId)}
                                    className={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase group/btn transition-all ${
                                      currentlyPlaying === prank.uniqueId ? "text-[#ff4a8e]" : "text-[#ffb1c5] hover:text-[#ff4a8e]"
                                    }`}
                                  >
                                    <span
                                      className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform"
                                      style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                      {currentlyPlaying === prank.uniqueId ? "pause_circle" : "play_circle"}
                                    </span>
                                    {currentlyPlaying === prank.uniqueId ? "Pause" : "Preview"}
                                  </button>

                                  <button
                                    className="p-2.5 rounded-xl bg-surface-container-high text-on-surface hover:text-[#ff4a8e] hover:bg-surface-bright transition-all shadow-md active:scale-95"
                                    title="Add to My Pranks"
                                  >
                                    <span className="material-symbols-outlined text-xl">add</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </section>
                    );
                  });
              }

              return (
                <section key={groupName} className="scroll-mt-32">
                  <div className="flex items-baseline justify-between mb-12">
                    <div className="flex items-center gap-6">
                      <h2 className="text-4xl font-black tracking-tighter uppercase border-l-[6px] border-[#ff4a8e] pl-6 py-2">
                        {groupName}
                      </h2>
                      <div className="h-px w-24 bg-gradient-to-r from-[#ff4a8e]/40 to-transparent hidden md:block" />
                    </div>
                    <span className="text-sm font-bold tracking-[0.2em] uppercase text-[#ffb1c5]/60 pr-2">
                      {groupPranks.length} {groupPranks.length === 1 ? "Scenario" : "Scenarios"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    {groupPranks.map((prank, idx) => {
                      const isPopular = (prank.order ?? idx + 1) <= 2;
                      return (
                      <div
                        key={prank.uniqueId}
                        className="group relative overflow-hidden bg-surface-container-low rounded-xl border-outline-variant/20 border p-1 transition-all duration-500 hover:bg-surface-container-high hover:border-[#ff4a8e]/30 flex flex-col h-[400px]"
                      >
                        <div className="aspect-video mb-5 overflow-hidden rounded-lg bg-surface-container-highest relative shrink-0">
                          <img
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                            src={prank.image_url}
                            alt={prank.titulo}
                            loading="lazy"
                          />

                          {/* Region Badge */}
                          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-md border border-white/10 flex items-center gap-2 z-10 shadow-2xl">
                            <img src={getFlagUrl(prank.regionDisplay)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                            <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white">
                              {prank.regionDisplay}
                            </span>
                          </div>

                          {/* Progress Bar for playing audio */}
                          {currentlyPlaying === prank.uniqueId && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-10">
                              <div className="h-full bg-[#ffb1c5] animate-[progress_20s_linear]" />
                            </div>
                          )}
                        </div>

                        <div className="px-5 pb-6 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-3 gap-3">
                            <h3
                              className="text-xl font-bold text-on-surface line-clamp-1 group-hover:text-[#ffb1c5] transition-colors"
                              title={prank.titulo}
                            >
                              {prank.titulo}
                            </h3>
                            {isPopular && (
                              <span className="text-[9px] shrink-0 font-black uppercase text-[#ff4a8e] border border-[#ff4a8e]/40 px-2 py-1 rounded lg bg-[#ff4a8e]/5">
                                Popular
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed line-clamp-2 opacity-80">
                            {prank.desc}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <button
                              onClick={() => togglePlay(prank.example, prank.uniqueId)}
                              className={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase group/btn transition-all ${
                                currentlyPlaying === prank.uniqueId ? "text-[#ff4a8e]" : "text-[#ffb1c5] hover:text-[#ff4a8e]"
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                {currentlyPlaying === prank.uniqueId ? "pause_circle" : "play_circle"}
                              </span>
                              {currentlyPlaying === prank.uniqueId ? "Pause" : "Preview"}
                            </button>

                            <button
                              className="p-2.5 rounded-xl bg-surface-container-high text-on-surface hover:text-[#ff4a8e] hover:bg-surface-bright transition-all shadow-md active:scale-95"
                              title="Add to My Pranks"
                            >
                              <span className="material-symbols-outlined text-xl">add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* No Results State */}
        {!dataLoading && mockData && filteredPranks.length === 0 && (
          <div className="py-32 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-8">
              <span className="material-symbols-outlined text-4xl text-gray-600">search_off</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">No scenarios found</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto mb-8">
              We couldn't find any pranks matching your criteria. Try another region.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveRegionId("all");
              }}
              className="px-8 py-3 bg-[#ff4a8e]/10 text-[#ff4a8e] rounded-xl font-bold hover:bg-[#ff4a8e] hover:text-white transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}

        {currentlyPlaying && (
          <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} className="hidden" />
        )}
      </div>
    </div>
  );
};

export default Catalog;
