import { createContext, useContext, useState, useEffect, useCallback } from "react";

export const RouterContext = createContext({ path: "/", navigate: () => {} });

export function useRouter() {
  const [path, setPath] = useState(() => window.location.hash.replace(/^#/, "") || "/");
  useEffect(() => {
    const onHash = () => setPath(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = useCallback((to) => {
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return { path, navigate };
}

export const Link = ({ to, className = "", children, ...rest }) => {
  const { navigate, path } = useContext(RouterContext);
  const active = path === to;
  return (
    <a
      href={`#${to}`}
      onClick={(e) => { e.preventDefault(); navigate(to); }}
      className={className}
      data-active={active ? "true" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
};
