import { useState, useEffect, useRef } from "react";

const CountUp = ({ value, duration = 1400, format = (v) => v.toLocaleString(), decimals = 0 }) => {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        obs.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          setN(value * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const display = decimals > 0 ? parseFloat(n.toFixed(decimals)) : Math.round(n);
  return <span ref={ref} className="reveal">{format(display)}</span>;
};

export default CountUp;
