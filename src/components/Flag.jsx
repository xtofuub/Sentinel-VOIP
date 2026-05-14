import { useState } from "react";

const FLAG_PATTERNS = {
  US: ["linear-gradient(180deg,#b22 0 15%,#fff 15% 31%,#b22 31% 46%,#fff 46% 62%,#b22 62% 77%,#fff 77% 92%,#b22 92%)", "linear-gradient(45deg,#23386b 0 38%,transparent 38%)"],
  GB: ["#1a3a8a", "linear-gradient(45deg,transparent 45%,#fff 45% 55%,transparent 55%),linear-gradient(-45deg,transparent 45%,#fff 45% 55%,transparent 55%),linear-gradient(90deg,transparent 40%,#fff 40% 60%,transparent 60%),linear-gradient(0deg,transparent 40%,#fff 40% 60%,transparent 60%),linear-gradient(90deg,transparent 45%,#c8102e 45% 55%,transparent 55%),linear-gradient(0deg,transparent 45%,#c8102e 45% 55%,transparent 55%)"],
  CA: ["linear-gradient(90deg,#d52b1e 0 25%,#fff 25% 75%,#d52b1e 75%)", ""],
  AU: ["#012169", "linear-gradient(45deg,transparent 45%,#fff 45% 55%,transparent 55%)"],
  IE: ["linear-gradient(90deg,#169b62 0 33%,#fff 33% 67%,#ff883e 67%)", ""],
  ZA: ["linear-gradient(180deg,#007749 0 33%,#000 33% 66%,#de3831 66%)", ""],
  FR: ["linear-gradient(90deg,#002654 0 33%,#fff 33% 67%,#ce1126 67%)", ""],
  DE: ["linear-gradient(180deg,#000 0 33%,#dd0000 33% 66%,#ffce00 66%)", ""],
  AT: ["linear-gradient(180deg,#ed2939 0 33%,#fff 33% 66%,#ed2939 66%)", ""],
  CH: ["#d52b1e", "linear-gradient(90deg,transparent 40%,#fff 40% 60%,transparent 60%),linear-gradient(0deg,transparent 40%,#fff 40% 60%,transparent 60%)"],
  ES: ["linear-gradient(180deg,#aa151b 0 25%,#f1bf00 25% 75%,#aa151b 75%)", ""],
  MX: ["linear-gradient(90deg,#006847 0 33%,#fff 33% 67%,#ce1126 67%)", ""],
  AR: ["linear-gradient(180deg,#74acdf 0 33%,#fff 33% 66%,#74acdf 66%)", ""],
  CO: ["linear-gradient(180deg,#fcd116 0 50%,#003893 50% 75%,#ce1126 75%)", ""],
  BR: ["#009c3b", "radial-gradient(circle at 50% 50%,#ffdf00 25%,transparent 26%),radial-gradient(circle at 50% 50%,#002776 12%,transparent 13%)"],
  PT: ["linear-gradient(90deg,#006600 0 40%,#ff0000 40%)", ""],
  IT: ["linear-gradient(90deg,#009246 0 33%,#fff 33% 67%,#ce2b37 67%)", ""],
  NL: ["linear-gradient(180deg,#ae1c28 0 33%,#fff 33% 66%,#21468b 66%)", ""],
  BE: ["linear-gradient(90deg,#000 0 33%,#fdda24 33% 67%,#ef3340 67%)", ""],
  SE: ["#006aa7", "linear-gradient(90deg,transparent 30%,#fecc00 30% 40%,transparent 40%),linear-gradient(0deg,transparent 40%,#fecc00 40% 60%,transparent 60%)"],
  NO: ["#ba0c2f", "linear-gradient(90deg,transparent 30%,#fff 30% 45%,transparent 45%),linear-gradient(0deg,transparent 40%,#fff 40% 60%,transparent 60%),linear-gradient(90deg,transparent 33%,#00205b 33% 42%,transparent 42%),linear-gradient(0deg,transparent 43%,#00205b 43% 57%,transparent 57%)"],
  DK: ["#c8102e", "linear-gradient(90deg,transparent 30%,#fff 30% 40%,transparent 40%),linear-gradient(0deg,transparent 40%,#fff 40% 60%,transparent 60%)"],
  FI: ["#fff", "linear-gradient(90deg,transparent 30%,#003580 30% 40%,transparent 40%),linear-gradient(0deg,transparent 40%,#003580 40% 60%,transparent 60%)"],
  PL: ["linear-gradient(180deg,#fff 0 50%,#dc143c 50%)", ""],
  CZ: ["linear-gradient(180deg,#fff 0 50%,#d7141a 50%)", "linear-gradient(45deg,#11457e 0 50%,transparent 50%)"],
  SK: ["linear-gradient(180deg,#fff 0 33%,#0b4ea2 33% 66%,#ee1c25 66%)", ""],
  HU: ["linear-gradient(180deg,#ce2939 0 33%,#fff 33% 66%,#477050 66%)", ""],
  RO: ["linear-gradient(90deg,#002b7f 0 33%,#fcd116 33% 67%,#ce1126 67%)", ""],
  GR: ["linear-gradient(180deg,#0d5eaf 0 11%,#fff 11% 22%,#0d5eaf 22% 33%,#fff 33% 44%,#0d5eaf 44% 55%,#fff 55% 66%,#0d5eaf 66% 77%,#fff 77% 88%,#0d5eaf 88%)", ""],
  TR: ["#e30a17", "radial-gradient(circle at 35% 50%,#fff 13%,transparent 14%),radial-gradient(circle at 40% 50%,#e30a17 11%,transparent 12%)"],
  RU: ["linear-gradient(180deg,#fff 0 33%,#0039a6 33% 66%,#d52b1e 66%)", ""],
  UA: ["linear-gradient(180deg,#0057b7 0 50%,#ffd700 50%)", ""],
  SA: ["#006c35", ""],
  IL: ["#fff", "linear-gradient(180deg,transparent 15%,#0038b8 15% 25%,transparent 25% 75%,#0038b8 75% 85%,transparent 85%)"],
  IN: ["linear-gradient(180deg,#ff9933 0 33%,#fff 33% 66%,#138808 66%)", ""],
  JP: ["#fff", "radial-gradient(circle at 50% 50%,#bc002d 18%,transparent 19%)"],
  KR: ["#fff", "radial-gradient(circle at 50% 50%,#cd2e3a 18%,transparent 19%)"],
  CN: ["#de2910", ""],
  TW: ["#fe0000", "linear-gradient(45deg,#000095 0 50%,transparent 50%)"],
  TH: ["linear-gradient(180deg,#a51931 0 17%,#f4f5f8 17% 33%,#2d2a4a 33% 67%,#f4f5f8 67% 83%,#a51931 83%)", ""],
  VN: ["#da251d", "radial-gradient(circle at 50% 50%,#ffff00 18%,transparent 19%)"],
  ID: ["linear-gradient(180deg,#ce1126 0 50%,#fff 50%)", ""],
};

const CODE_ALIASES = {
  UK: "GB",
  EL: "GR",
};

const toFlagCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "UN";
  const fromLocale = /-([a-z]{2})$/i.exec(raw)?.[1];
  const code = (fromLocale || raw).slice(0, 2).toUpperCase();
  return CODE_ALIASES[code] || code;
};

const Flag = ({ code, size = 18 }) => {
  const [failed, setFailed] = useState(false);
  const key = toFlagCode(code);
  const p = FLAG_PATTERNS[key];
  const bg = p ? (p[1] ? `${p[1]}, ${p[0]}` : p[0]) : "var(--bg-3)";
  const imageCode = key.toLowerCase();
  return (
    <span
      className="flag flag-img-wrap"
      style={{ width: size, height: Math.round(size * 0.72), background: bg, backgroundSize: "100% 100%" }}
      title={key}
      aria-label={`${key || "Unknown"} flag`}
    >
      {!failed && key !== "UN" ? (
        <img src={`https://flagcdn.com/w40/${imageCode}.png`} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="flag-code">{key.slice(0, 2) || "??"}</span>
      )}
    </span>
  );
};

export default Flag;
