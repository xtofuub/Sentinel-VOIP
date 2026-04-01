import React from "react";
import { Link, NavLink } from "react-router-dom";

export const TopNavBar = () => {
  const prefetchCollection = () => {
    import("@/pages/Catalog");
    import("@/services/mock_data");
  };

  const handleAccountClick = () => {
    window.dispatchEvent(new CustomEvent("sentinel:open-api-panel"));
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl grid grid-cols-[auto_1fr_auto] items-center px-8 h-20 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
      {/* Left: Brand */}
      <div className="flex items-center">
        <Link to="/" className="text-xl font-black tracking-tighter text-[#ff4a8e] uppercase">
          Juas Mojave
        </Link>
      </div>

      {/* Middle: Nav buttons */}
      <div className="hidden md:flex items-center justify-center">
        <div className="flex items-center gap-12 font-['Inter'] tracking-tight font-medium">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-[10px] font-black uppercase tracking-[0.2em] transition-colors pb-1 ${
                isActive ? "text-[#ffb1c5] border-b-2 border-[#ff4a8e]" : "text-[#e2e2e2] hover:text-[#ffb1c5]"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `text-[10px] font-black uppercase tracking-[0.2em] transition-colors pb-1 ${
                isActive ? "text-[#ffb1c5] border-b-2 border-[#ff4a8e]" : "text-[#e2e2e2] hover:text-[#ffb1c5]"
              }`
            }
          >
            Pricing
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-[10px] font-black uppercase tracking-[0.2em] transition-colors pb-1 ${
                isActive ? "text-[#ffb1c5] border-b-2 border-[#ff4a8e]" : "text-[#e2e2e2] hover:text-[#ffb1c5]"
              }`
            }
          >
            Make a Call
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              `text-[10px] font-black uppercase tracking-[0.2em] transition-colors pb-1 ${
                isActive ? "text-[#ffb1c5] border-b-2 border-[#ff4a8e]" : "text-[#e2e2e2] hover:text-[#ffb1c5]"
              }`
            }
            onMouseEnter={prefetchCollection}
            onFocus={prefetchCollection}
          >
            Collection
          </NavLink>
        </div>
      </div>

      {/* Right: Account icon */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleAccountClick}
          title="Open API Debug"
          className="material-symbols-outlined text-[#FFB1C5] p-2 hover:bg-[#2A2A2A] rounded-lg transition-all duration-300 active:scale-95"
        >
          account_circle
        </button>
      </div>
    </nav>
  );
};
