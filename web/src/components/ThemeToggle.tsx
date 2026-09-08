import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, Theme } from "../theme";

export default function ThemeToggle() {
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
      aria-label={`切换到${nextTheme === "dark" ? "深色" : "浅色"}主题`}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {theme === "light" ? "深色" : "浅色"}
    </button>
  );
}
