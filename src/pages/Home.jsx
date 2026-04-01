import React from "react";
import { Link } from "react-router-dom";

export const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[921px] flex items-center justify-center overflow-hidden px-8">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-container/5 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10 max-w-5xl text-center space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/15 text-xs font-label uppercase tracking-[0.2em] text-primary">
            The Midnight Editorial Experience
          </div>
          <h1 className="text-6xl md:text-8xl font-headline font-black tracking-tighter leading-[0.9] text-glow">
            MAKE THEM <br /> <span className="text-transparent bg-clip-text bg-signature-gradient">BELIEVE.</span>
          </h1>
          <p className="max-w-xl mx-auto text-lg md:text-xl text-on-surface-variant leading-relaxed">
            Ultra-realistic AI voice pranks designed for the cinematic prankster. Not just a call, but a performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Link to="/catalog">
              <button className="bg-[#ff4a8e] text-white font-black uppercase tracking-widest px-10 py-5 rounded-xl text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,74,142,0.3)]">
                Start Pranking
              </button>
            </Link>
            <Link to="/pricing">
              <button className="px-10 py-5 rounded-xl text-lg font-black uppercase tracking-widest bg-[#1a1a1a] text-[#e5bcc5] border border-white/10 hover:border-[#ff4a8e]/40 transition-all">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Bento Grid Features */}
      <section className="max-w-[1600px] mx-auto px-8 py-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          {/* Large Feature */}
          <div className="md:col-span-8 md:row-span-2 bg-surface-container-low rounded-xl overflow-hidden relative group border border-outline-variant/10">
            <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity grayscale group-hover:grayscale-0">
              <img className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" data-alt="close-up of futuristic audio mixing console with glowing pink neon lights and high tech interface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNKKMnk_ZlrnlJKVY0vvp_Dt-bgEhW-b-VdzZ0Uj4zHWRwcQzoUOiYkygTIyyYHkle39sjgXWEQXzB79QQZMYCHY49xwVXln2dSRmCoM87H5zidpSvOoDWzOrsejdua2PueifKrdt9aDmVloiV6Me_ycTpSIxVuo8LnNLmELn3u5lncv4tkKt1QXIM-MvF_GW38ARXoQxlkCpvOHjeVf0IPlYrUmfmcmMVVY_qUzsfaUi1KIbZM7iy10VWCfd0EjZ_gTlzJPQVvNEp" alt="audio console" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
            <div className="absolute bottom-0 p-10 space-y-4">
              <h3 className="text-4xl font-headline font-black tracking-tighter uppercase leading-none">AI Voice <br />Synthesis</h3>
              <p className="max-w-md text-on-surface-variant text-sm">Our deep-learning engine replicates human emotion, breathing, and hesitation for 100% believability.</p>
            </div>
          </div>
          {/* Secondary Feature */}
          <div className="md:col-span-4 bg-surface-container rounded-xl p-8 flex flex-col justify-between border-b border-outline-variant/15">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined" data-icon="security">security</span>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Ghost Mode</h4>
              <p className="text-sm text-on-surface-variant">Untraceable origin points and encrypted connections keep your identity in the shadows.</p>
            </div>
          </div>
          {/* Small Feature */}
          <div className="md:col-span-4 bg-surface-container-high rounded-xl p-8 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined" data-icon="schedule">schedule</span>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Timed Strikes</h4>
              <p className="text-sm text-on-surface-variant">Schedule your pranks for the perfect midnight moment.</p>
            </div>
          </div>
          {/* Highlight Section */}
          <div className="md:col-span-12 h-[200px] bg-signature-gradient rounded-xl p-0.5 flex items-center shadow-2xl">
            <div className="bg-surface-container-lowest w-full h-full rounded-[calc(var(--radius-xl)-2px)] flex items-center justify-around px-12 overflow-hidden">
              <div className="text-center">
                <span className="block text-4xl font-black text-primary">2.4M</span>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Calls Made</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-outline-variant/20"></div>
              <div className="text-center">
                <span className="block text-4xl font-black text-primary">99.2%</span>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Believability Rate</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-outline-variant/20"></div>
              <div className="text-center">
                <span className="block text-4xl font-black text-primary">150+</span>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">AI Personas</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Social Proof Editorial */}
      <section className="bg-surface-container-low py-32 px-8 overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="w-full md:w-1/2 space-y-12">
              <h2 className="text-5xl font-headline font-black tracking-tighter leading-none uppercase">Voices of the <br /><span className="text-primary">Underground</span></h2>
              <div className="space-y-8">
                <blockquote className="relative pl-8 border-l-2 border-primary">
                  <p className="text-2xl font-light italic text-on-surface leading-snug">"The level of detail in the AI interaction is terrifyingly good. It's not just a prank app; it's a social engineering masterpiece."</p>
                  <footer className="mt-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-bright"></div>
                    <span className="font-bold tracking-tight">Marcus V. — Pro User</span>
                  </footer>
                </blockquote>
                <blockquote className="relative pl-8 border-l-2 border-outline-variant/30">
                  <p className="text-xl font-light text-on-surface-variant">"Mojave changed the game. The response handling is so natural, my friends still don't believe it was a bot."</p>
                  <footer className="mt-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-bright"></div>
                    <span className="font-bold tracking-tight text-on-surface-variant">Elena R. — Content Creator</span>
                  </footer>
                </blockquote>
              </div>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
              <div className="aspect-[3/4] rounded-xl bg-surface overflow-hidden">
                <img className="w-full h-full object-cover" data-alt="aesthetic urban dark alleyway with pink neon sign reflection in a puddle at night" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJtDt_tnM7JHBVgMo-0qGDAMXkWIgszo6anlOzSU-y5U4YTutE0FJIlfBJb_KsbB-KEzeJuJENUT1C0c-4vMecPb1TKm_uEAdlpeMJB8hxGu7KnyljcR7ToBIZlaZkVLcbd0heVQO61_WRP6Zp9o8qACMSDRlg9w2fyyxfZfFqYFfqmBZJMqs6nvfJ1KI8gTilSHYdTcpDznkOLGSBgTvqtaH1idIjyDIep3YJE5bzm4mnh_HFxjQgKKAL6i2HtmIImilPvyVVL9Bu" alt="aesthetic alleyway" />
              </div>
              <div className="aspect-[3/4] rounded-xl bg-surface overflow-hidden mt-12">
                <img className="w-full h-full object-cover" data-alt="cinematic close up of a person laughing in low light with dramatic shadows and pink backlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCb3eb8H3_qX5hiohhgyH4SFngAyyx4Pr5VvGtGcyyu36k5Q936vsNQGDbd2Nr7E-LhO7ipVrqNv4TPIsw9hvEC4oD2luA1WoClmITk7HcrKaesREdr9n-X53cZleqrm05advnvLRHS_P8LzB8Rk5hlBrPuVKvBY3bHHhdNPwt-57rznzS2vcSlwGFOYNaxT9Bckyk7Wgz0UDcZgb5AJCrWxmPr48FillmUGLlQPBqOE0DIuyN1HxuBgjihnNxxkAn4NVe_IJRxtLoQ" alt="person laughing" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-32 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="max-w-3xl mx-auto space-y-10 relative z-10">
          <h2 className="text-6xl md:text-7xl font-headline font-black tracking-tighter uppercase leading-none">Ready for the <br /><span className="text-transparent bg-clip-text bg-signature-gradient">Midnight Strike?</span></h2>
          <p className="text-xl text-on-surface-variant">Join thousands of users defining the new era of digital pranks.</p>
          <div className="flex flex-col items-center gap-4">
            <Link to="/catalog">
              <button className="bg-[#ff4a8e] text-white font-black uppercase tracking-widest px-12 py-6 rounded-xl text-xl hover:scale-105 transition-transform active:scale-95 shadow-2xl">
                Start Pranking Now
              </button>
            </Link>
            <span className="text-[10px] uppercase tracking-[0.3em] text-outline">No credit card required for first strike.</span>
          </div>
        </div>
      </section>
    </>
  );
};
