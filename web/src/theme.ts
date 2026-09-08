export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "zoo-garden-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The visual preference still applies when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}
