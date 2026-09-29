import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, Theme } from "../theme";
import { useLocale } from "../i18n";

export default function ThemeToggle() {
  const { locale } = useLocale();
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
      aria-label={locale === "en-US" ? `Switch to ${nextTheme} theme` : `切换到${nextTheme === "dark" ? "深色" : "浅色"}主题`}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {locale === "en-US" ? (theme === "light" ? "Dark" : "Light") : (theme === "light" ? "深色" : "浅色")}
    </button>
  );
}
