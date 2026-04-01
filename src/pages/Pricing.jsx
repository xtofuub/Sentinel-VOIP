import React from "react";

export const Pricing = () => {
  return (
    <main className="pt-32 pb-24 px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <header className="text-center mb-24">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-on-surface mb-6 uppercase">
          Pricing <span className="text-primary">&amp;</span> Plans
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
          Elevate your midnight experience with precision credits. Choose your intensity and command the Mojave.
        </p>
      </header>
      
      {/* Pricing Bento-ish Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-32">
        {/* Starter Plan */}
        <div className="surface-container-low bg-surface-container-low p-8 rounded-xl flex flex-col justify-between border border-outline-variant/15 hover:bg-surface-container transition-all duration-500 group">
          <div>
            <div className="mb-8">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-4 block">Basic Entry</span>
              <h3 className="text-3xl font-bold text-on-surface">Starter</h3>
            </div>
            <div className="mb-10">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-on-surface">$19</span>
                <span className="text-on-surface-variant ml-2 text-sm">/ one-time</span>
              </div>
              <p className="text-primary-container font-medium mt-2">10 Credits Included</p>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Standard Prank Access
              </li>
              <li className="flex items-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Basic Support
              </li>
              <li className="flex items-center text-on-surface-variant/50 text-sm italic">
                <span className="material-symbols-outlined text-outline text-lg mr-3">cancel</span>
                No Priority Queue
              </li>
            </ul>
          </div>
          <button className="w-full bg-[#1a1a1a] text-[#e5bcc5] border border-white/10 py-4 rounded-lg font-black tracking-[0.2em] uppercase text-[10px] hover:border-[#ff4a8e]/40 transition-all duration-300 neon-glow active:scale-95">
            Buy Now
          </button>
        </div>
        
        {/* Standard Plan (Featured) */}
        <div className="bg-surface-container-high p-8 rounded-xl flex flex-col justify-between border-2 border-primary/30 relative overflow-hidden transform md:-translate-y-4 shadow-2xl transition-all duration-500">
          <div className="absolute top-0 right-0 bg-primary px-4 py-1 rounded-bl-lg z-20">
            <span className="text-[10px] font-black text-on-primary uppercase tracking-widest">Most Popular</span>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
          <div>
            <div className="mb-8">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-4 block">Recommended</span>
              <h3 className="text-3xl font-bold text-on-surface">Standard</h3>
            </div>
            <div className="mb-10">
              <div className="flex items-baseline">
                <span className="text-5xl font-black text-on-surface">$49</span>
                <span className="text-on-surface-variant ml-2 text-sm">/ one-time</span>
              </div>
              <p className="text-primary-container font-medium mt-2">50 Credits Included</p>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center text-on-surface text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Full Prank Library
              </li>
              <li className="flex items-center text-on-surface text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Premium Voice Effects
              </li>
              <li className="flex items-center text-on-surface text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Priority Email Support
              </li>
            </ul>
          </div>
          <button className="w-full bg-[#ff4a8e] text-white py-5 rounded-lg font-black tracking-[0.2em] uppercase text-[10px] transition-all duration-300 neon-glow active:scale-95 shadow-lg shadow-primary/20">
            Buy Now
          </button>
        </div>
        
        {/* Ultimate Plan */}
        <div className="surface-container-low bg-surface-container-low p-8 rounded-xl flex flex-col justify-between border border-outline-variant/15 hover:bg-surface-container transition-all duration-500 group">
          <div>
            <div className="mb-8">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-4 block">The Elite Choice</span>
              <h3 className="text-3xl font-bold text-on-surface">Ultimate</h3>
            </div>
            <div className="mb-10">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-on-surface">$99</span>
                <span className="text-on-surface-variant ml-2 text-sm">/ month</span>
              </div>
              <p className="text-primary-container font-medium mt-2">Unlimited Credits</p>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Unlimited Everything
              </li>
              <li className="flex items-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                24/7 VIP Concierge
              </li>
              <li className="flex items-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-lg mr-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Beta Access to Tools
              </li>
            </ul>
          </div>
          <button className="w-full bg-[#1a1a1a] text-[#e5bcc5] border border-white/10 py-4 rounded-lg font-black tracking-[0.2em] uppercase text-[10px] hover:border-[#ff4a8e]/40 transition-all duration-300 neon-glow active:scale-95">
            Buy Now
          </button>
        </div>
      </div>
      
      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-on-surface mb-4 uppercase tracking-tighter">Frequently Asked</h2>
          <div className="h-1 w-20 bg-primary-container mx-auto"></div>
        </div>
        <div className="space-y-6">
          <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
            <h4 className="text-lg font-bold text-primary mb-2">How do credits work?</h4>
            <p className="text-on-surface-variant leading-relaxed">Each credit entitles you to one standard execution within the Juas Mojave platform. Credits never expire on Standard and Starter packages.</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
            <h4 className="text-lg font-bold text-primary mb-2">Can I upgrade later?</h4>
            <p className="text-on-surface-variant leading-relaxed">Absolutely. You can add more credits or move to an Ultimate subscription at any time from your account dashboard.</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
            <h4 className="text-lg font-bold text-primary mb-2">What is the "Midnight Guarantee"?</h4>
            <p className="text-on-surface-variant leading-relaxed">We guarantee 99.9% uptime for all operations conducted between 10 PM and 4 AM. Our systems are optimized for the dark.</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
            <h4 className="text-lg font-bold text-primary mb-2">Is payment secure?</h4>
            <p className="text-on-surface-variant leading-relaxed">All transactions are encrypted with military-grade protocols. We don't store your sensitive payment data on our servers.</p>
          </div>
        </div>
      </section>
      
      {/* Brand Visual Accent */}
      <div className="mt-32 rounded-3xl overflow-hidden relative h-96 group">
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
        <img alt="The Mojave Atmosphere" className="w-full h-full object-cover filter grayscale opacity-40 group-hover:scale-105 transition-transform duration-[3s]" data-alt="cinematic night scene of a dark desert road under a vast starry sky with deep purples and high contrast shadows" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNsBJjorctxreBAkIQq6PsphX3dQtKdk6KHlJzFuyW6m3nKbbgcI5ocG4Bpv2wmOr0L8krTNaqA9EBU86VLrzVahI6__Ex3z8EixCpgDWdyqjLD01IWyBcTR94trSZSJLx5U8DXEpT01IQ9wh4bn4MnuK8FMf39iqY4OUwuzHTKadYdICbtn-QWrXB_ei_jyvZCo-YbQ6RpsHdORUwzB256vfUPrYrXN6K_fS5ntSQrkXX-se-tcq4eH9aiCz4ZfhlemaEHkYmbLpT" />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center px-4">
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">Own the Night.</h2>
          <p className="text-primary-fixed-dim tracking-[0.3em] font-medium uppercase text-sm">Experience the Unseen</p>
        </div>
      </div>
    </main>
  );
};
