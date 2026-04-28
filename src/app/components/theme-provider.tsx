"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Exclude<Theme, "system">;
  themes: Theme[];
  systemTheme: Exclude<Theme, "system">;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const getSystemTheme = (): Exclude<Theme, "system"> => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("theme");
  return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
};

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => getStoredTheme() || defaultTheme);

  const resolvedTheme = theme === "system" && enableSystem ? getSystemTheme() : (theme === "system" ? "light" : theme);

  React.useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (nextTheme: Theme) => {
      const nextResolved = nextTheme === "system" && enableSystem ? getSystemTheme() : nextTheme === "system" ? "light" : nextTheme;

      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(nextResolved);
      } else {
        root.setAttribute(attribute, nextResolved);
      }

      if (disableTransitionOnChange) {
        root.style.transition = "none";
        requestAnimationFrame(() => {
          root.style.transition = "";
        });
      }
    };

    applyTheme(theme);
    window.localStorage.setItem("theme", theme);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "theme" && (event.newValue === "light" || event.newValue === "dark" || event.newValue === "system")) {
        setThemeState(event.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [attribute, disableTransitionOnChange, enableSystem, theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      resolvedTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
      systemTheme: getSystemTheme(),
    }),
    [enableSystem, resolvedTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
