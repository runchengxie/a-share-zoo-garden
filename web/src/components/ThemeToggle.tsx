import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, Theme } from "../theme";
import { useLocale } from "../i18n";

export default function ThemeToggle() {
  const { copy } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const nextTheme = theme === "light" ? "dark" : "light";

  const toggleTheme = () => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={copy.themeToggle.switchTo.replace("{theme}", nextTheme === "dark" ? copy.themeToggle.dark : copy.themeToggle.light)}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {theme === "light" ? copy.themeToggle.dark : copy.themeToggle.light}
    </button>
  );
}
