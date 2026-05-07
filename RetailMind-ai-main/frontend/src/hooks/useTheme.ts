import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("rm-theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("rm-theme", theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")),
    setTheme,
  };
}
