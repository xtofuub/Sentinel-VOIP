import React, { useState, useMemo } from "react";
import { usePrank } from "../context/PrankContext";
import { MOCK_PRANKS_BY_LANGUAGE } from "../services/mock_data";

export const Dashboard = () => {
  const { selectedPrank, setSelectedPrank, credits } = usePrank();
  const [targetName, setTargetName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English (US)");

  // Extract all available languages from mock data
  const availableLanguages = useMemo(() => {
    return Object.keys(MOCK_PRANKS_BY_LANGUAGE).sort();
  }, []);

  // Filter pranks based on selected language
  const pranksForLanguage = useMemo(() => {
    return MOCK_PRANKS_BY_LANGUAGE[selectedLanguage] || [];
  }, [selectedLanguage]);

  const handleStartPrank = () => {
    if (!selectedPrank) {
      alert("Please select a scenario from the vault first!");
      return;
    }
    if (!targetName || !phoneNumber) {
      alert("Please enter the target's name and phone number.");
      return;
    }
    console.log("Initiating call:", {
      prank: selectedPrank.titulo,
      target: targetName,
      phone: phoneNumber,
      language: selectedLanguage
    });
    // In a real app, this would trigger an API call
    alert(`Success! Engaging ${targetName} with the "${selectedPrank.titulo}" scenario.`);
  };

  return (
    <main className="pt-32 pb-24 px-8 max-w-[1600px] mx-auto bg-[#131313] min-h-screen font-['Inter'] selection:bg-[#ff4a8e] selection:text-white">
      <div className="flex flex-col gap-12">

        {/* Top Section: Config Left, Bento Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: Configure Call (Column span 4) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
            <header className="mb-6">
              <div className="h-[1px] w-12 bg-[#ff4a8e] mb-4"></div>
              <h1 className="text-5xl font-black tracking-tighter text-on-surface uppercase italic leading-none">Configure</h1>
              <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] mt-2 opacity-60">Target Details & Logic</p>
            </header>

            <div className="bg-[#1b1b1b] p-8 rounded-3xl border border-outline-variant/10 shadow-2xl space-y-8 relative overflow-hidden group">
              {/* Decorative gradient corner */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ff4a8e]/5 blur-3xl rounded-full group-hover:bg-[#ff4a8e]/15 transition-all duration-700"></div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Target Name</label>
                  <div className="relative">
                    <input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      className="w-full bg-[#131313] border border-outline-variant/10 focus:border-[#ffb1c5] focus:ring-0 text-on-surface placeholder:text-white/40 px-4 py-4 rounded-xl transition-all font-medium"
                      placeholder="Who is the target?"
                      type="text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Phone Number</label>
                  <div className="relative">
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-[#131313] border border-outline-variant/10 focus:border-[#ffb1c5] focus:ring-0 text-on-surface placeholder:text-white/40 px-4 py-4 rounded-xl transition-all font-medium"
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Language</label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full bg-[#131313] border border-outline-variant/10 focus:border-[#ffb1c5] focus:ring-0 text-on-surface px-4 py-4 rounded-xl appearance-none transition-all font-medium"
                    >
                      {availableLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-6">
                <div className="flex items-center justify-between p-5 bg-[#131313] rounded-2xl border border-outline-variant/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff4a8e]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#ff4a8e]">bolt</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest leading-none mb-1">Mischief Balance</p>
                      <p className="text-base font-black text-on-surface leading-none">{credits} Credits</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-black text-[#ffb1c5] hover:text-[#ff4a8e] uppercase tracking-widest transition-colors">Refill</button>
                </div>

                <button
                  onClick={handleStartPrank}
                  className="w-full bg-gradient-to-r from-[#ff4a8e] to-[#ff0080] text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center space-x-3 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(255,74,142,0.2)] hover:shadow-[0_0_60px_rgba(255,74,142,0.35)]"
                >
                  <span>Initiate Mischief</span>
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: Scenarios Vault (Column span 8) */}
          <div className="lg:col-span-8 flex flex-col h-full lg:max-h-[85vh]">
            <header className="mb-6 shrink-0 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <div className="h-[1px] w-16 bg-gradient-to-r from-[#ff4a8e] to-[#ff936a] mb-4"></div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface uppercase italic leading-none">Scenario Vault</h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] opacity-70">Sentinel Voice Arsenal</span>
                  <span className="text-[9px] bg-[#ff4a8e]/20 text-[#ffb1c5] px-2 py-0.5 rounded font-black uppercase border border-[#ff4a8e]/20">
                    {selectedLanguage}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 min-w-[220px]">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Active Catalog</p>
                <p className="text-2xl font-black text-white mt-1 leading-none">{pranksForLanguage.length}</p>
                <p className="text-[10px] text-[#ffb1c5] font-bold uppercase tracking-[0.18em] mt-1">Ready Scenarios</p>
              </div>
            </header>

            {/* SCROLLABLE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pr-4 pb-10 custom-scrollbar content-start">
              {pranksForLanguage.length > 0 ? (
                pranksForLanguage.map((prank, idx) => {
                  return (
                    <div
                      key={prank._id || idx}
                      onClick={() => setSelectedPrank(prank)}
                      className={`
                        group relative flex flex-col overflow-hidden rounded-[1.4rem] cursor-pointer border transition-all duration-300 min-h-[330px]
                        ${selectedPrank?._id === prank._id
                          ? 'border-[#ff4a8e] bg-[#181818] shadow-[0_0_30px_rgba(255,74,142,0.18)]'
                          : 'border-white/10 bg-[#101010] hover:border-white/20 hover:bg-[#151515]'}
                      `}
                    >
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start gap-4">
                          <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#0d0d0d]">
                            <img
                              className="w-full h-full object-cover opacity-90"
                              src={prank.image_url}
                              alt={prank.titulo}
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md border border-white/10 text-white/70 bg-white/5">
                                Script
                              </span>
                              {selectedPrank?._id === prank._id && (
                                <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md border border-[#ff4a8e]/30 text-[#ffb1c5] bg-[#ff4a8e]/10">
                                  Selected
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-white text-lg tracking-tight uppercase leading-tight line-clamp-2">
                              {prank.titulo}
                            </h3>
                          </div>
                        </div>

                        <p className="text-white/60 text-sm mt-4 leading-relaxed line-clamp-4 font-medium flex-1">
                          {prank.desc}
                        </p>

                        <div className="flex items-center justify-between mt-4 pt-5 border-t border-white/10">
                          <button
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-[11px] font-black uppercase tracking-[0.16em]"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("Playing preview for: " + prank.titulo);
                            }}
                          >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                              play_circle
                            </span>
                            Play
                          </button>

                          <span className="text-[10px] text-white/45 font-black uppercase tracking-[0.18em]">Tap Card To Arm</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-[2.5rem] bg-[#1b1b1b] border border-outline-variant/10 flex flex-col items-center justify-center text-on-surface-variant p-20 text-center">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Vault Empty</p>
                  <p className="text-sm opacity-50 mt-2 max-w-[300px]">Initialising more mischief for {selectedLanguage} soon.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: Mischief Log (Column span 12) */}
        <section className="mt-12">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1b1b1b] border border-outline-variant/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ffb1c5] text-2xl">history</span>
              </div>
              <div>
                <h3 className="text-4xl font-black tracking-tighter text-on-surface uppercase italic leading-none mb-2">Mischief Log</h3>
                <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.4em] opacity-40">System Status: Intercepting Channels</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-sm rounded-full animate-pulse"></div>
                <div className="relative w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Satellite Active</span>
            </div>
          </header>

          <div className="bg-[#1b1b1b] rounded-[3rem] border border-outline-variant/10 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant/5">

              {/* Log Item 1 */}
              <div className="p-10 hover:bg-surface-container-low/40 transition-all group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest opacity-50">Capture: T-Minus 2m</p>
                    <h4 className="text-xl font-black text-on-surface uppercase group-hover:text-[#ffb1c5] transition-colors leading-none tracking-tight">Javier Rodriguez</h4>
                    <p className="text-[11px] text-[#ffb1c5] font-black uppercase tracking-widest">Suspicious Order</p>
                  </div>
                  <span className="text-[9px] px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 font-black uppercase tracking-tighter border border-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]">Terminal Success</span>
                </div>

                <div className="flex items-center space-x-6 bg-[#131313] p-5 rounded-2xl border border-outline-variant/5 relative z-10 group-hover:border-[#ff4a8e]/20 transition-all">
                  <button className="w-12 h-12 rounded-full bg-[#ff4a8e] flex items-center justify-center text-white shadow-[0_0_20px_#ff4a8e/30] active:scale-90 transition-all hover:scale-105">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </button>
                  <div className="flex-1 space-y-3">
                    <div className="h-1 bg-outline-variant/5 rounded-full overflow-hidden">
                      <div className="h-full w-[65%] bg-gradient-to-r from-[#ff4a8e] to-[#ff0080] rounded-full relative shadow-[0_0_10px_#ff4a8e/50]"></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-outline font-black opacity-60">
                      <span>01:42</span>
                      <span>02:45</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log Item 2 */}
              <div className="p-10 hover:bg-surface-container-low/40 transition-all group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4a8e]/5 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest opacity-50">Capture: T-Minus 1h</p>
                    <h4 className="text-xl font-black text-on-surface uppercase group-hover:text-[#ffb1c5] transition-colors leading-none tracking-tight">Sara Martinez</h4>
                    <p className="text-[11px] text-[#ffb1c5] font-black uppercase tracking-widest">Lottery Win</p>
                  </div>
                  <span className="text-[9px] px-3 py-1.5 rounded-full bg-[#ff4a8e]/10 text-[#ff4a8e] font-black uppercase tracking-tighter border border-[#ff4a8e]/10 shadow-[0_0_15px_rgba(255,74,142,0.1)]">Target Evaded</span>
                </div>

                <div className="bg-[#131313]/60 p-6 rounded-2xl border border-outline-variant/10 border-dashed relative z-10 group-hover:bg-[#131313]/90 transition-all">
                  <p className="text-xs text-on-surface-variant leading-relaxed font-medium italic">"Subject identified call origin and disconnected during introductory protocol."</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#ff4a8e] text-lg">cancel_presentation</span>
                    <span className="text-[10px] font-black text-[#ff4a8e] uppercase tracking-widest">Connection Terminated</span>
                  </div>
                </div>
              </div>

              {/* Log Item 3 */}
              <div className="p-10 hover:bg-surface-container-low/40 transition-all group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest opacity-50">Capture: T-Minus 4h</p>
                    <h4 className="text-xl font-black text-on-surface uppercase group-hover:text-[#ffb1c5] transition-colors leading-none tracking-tight">Satellite Trace</h4>
                    <p className="text-[11px] text-[#ffb1c5] font-black uppercase tracking-widest">Traffic Fine</p>
                  </div>
                  <span className="text-[9px] px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 font-black uppercase tracking-tighter border border-green-500/10">Archive Success</span>
                </div>

                <div className="flex items-center space-x-6 bg-[#131313] p-5 rounded-2xl border border-outline-variant/5 relative z-10 opacity-40 group-hover:opacity-100 transition-all group-hover:border-[#ff4a8e]/20">
                  <button className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-outline hover:bg-[#ff4a8e] hover:text-white transition-all hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                  </button>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-outline group-hover:text-[#ffb1c5] transition-colors">Decrypting Record</p>
                    <div className="h-[2px] w-full bg-outline-variant/10 rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-outline font-mono font-black">01:12</span>
                </div>
              </div>
            </div>

            <button className="w-full bg-[#131313] py-8 text-[11px] font-black uppercase tracking-[0.5em] text-on-surface-variant hover:text-[#ffb1c5] transition-all border-t border-outline-variant/5 hover:bg-[#1b1b1b]">
              Decrypt Full Archive Vault
            </button>
          </div>
        </section>

      </div>
    </main>
  );
};
