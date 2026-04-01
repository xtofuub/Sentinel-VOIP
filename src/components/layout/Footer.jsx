import React from "react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-surface-container-lowest mt-32 py-16 px-8 border-t border-outline-variant/10 w-full z-10 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <div className="text-2xl font-black tracking-tighter text-[#FF0080] uppercase mb-4">Juas Mojave</div>
          <p className="text-on-surface-variant text-sm max-w-sm font-['Inter']">
            The premier platform for high-fidelity conversational AI scenarios.
          </p>
        </div>
        <div className="flex gap-8 text-sm text-on-surface-variant font-medium tracking-tight font-['Inter']">
          <Link className="hover:text-primary transition-colors" to="#">Terms</Link>
          <Link className="hover:text-primary transition-colors" to="#">Privacy</Link>
          <Link className="hover:text-primary transition-colors" to="#">Ethics Policy</Link>
        </div>
      </div>
    </footer>
  );
};
