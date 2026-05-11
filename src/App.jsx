import { useEffect } from "react";
import { useRouter, RouterContext } from "./context/RouterContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import "./styles.css";

export default function App() {
  const { path, navigate } = useRouter();

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    const id = requestAnimationFrame(() => {
      document.querySelectorAll(".reveal:not(.in), .reveal-stagger:not(.in)").forEach((el) => io.observe(el));
    });
    return () => { cancelAnimationFrame(id); io.disconnect(); };
  }, [path]);

  let Page = Home;
  if (path === "/catalog") Page = Catalog;
  else if (path === "/dashboard") Page = Dashboard;
  else if (path === "/pricing") Page = Pricing;

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <NavBar />
        <div style={{ flex: 1, position: "relative" }}>
          <Page key={path} />
        </div>
        <Footer />
      </div>
    </RouterContext.Provider>
  );
}
