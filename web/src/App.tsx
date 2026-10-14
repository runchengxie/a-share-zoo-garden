import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { fetchMetadata } from "./api";
import About from "./pages/About";
import Changes from "./pages/Changes";
import Constituents from "./pages/Constituents";
import History from "./pages/History";
import Home from "./pages/Home";
import Methodology from "./pages/Methodology";
import ThemeToggle from "./components/ThemeToggle";
import { initialLocale, LocaleContext, useLocale, type Locale } from "./i18n";

export default function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  return <LocaleContext.Provider value={{ locale, setLocale }}><AppContent /></LocaleContext.Provider>;
}

function AppContent() {
  const [updated, setUpdated] = useState<string>("");
  useEffect(() => {
    fetchMetadata()
      .then((metadata) => setUpdated(metadata.updated))
      .catch(() => undefined);
  }, []);

  const { copy, locale, setLocale } = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = copy.documentTitle;
  }, [copy.documentTitle, locale]);

  const switchLocale = () => {
    const next = locale === "en-US" ? "zh-CN" : "en-US";
    try { window.localStorage.setItem("a-share-zoo-locale", next); } catch { /* storage is optional */ }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
    setLocale(next);
  };
  return (
    <div className="app">
      <header className="site-header">
        <div className="site-masthead">
          <div>
            <div className="brand-kicker">{copy.brandKicker}</div>
            <h1>{copy.title}</h1>
            <p className="site-deck">{copy.deck}</p>
          </div>
          <div className="site-meta" aria-label={copy.shell.dataUpdate}>
            <span>{copy.index}</span>
            <strong>{updated || copy.waiting}</strong>
          </div>
        </div>
        <nav className="site-nav" aria-label={copy.shell.primaryNavigation}>
          <NavLink to="/">{copy.nav[0]}</NavLink>
          <NavLink to="/methodology">{copy.nav[1]}</NavLink>
          <NavLink to="/constituents">{copy.nav[2]}</NavLink>
          <NavLink to="/history">{copy.nav[3]}</NavLink>
          <NavLink to="/changes">{copy.nav[4]}</NavLink>
          <NavLink to="/about">{copy.nav[5]}</NavLink>
          <button className="locale-toggle" type="button" onClick={switchLocale} aria-label={copy.shell.switchToLanguage.replace("{language}", copy.switchTo)}>{copy.switchTo}</button>
          <ThemeToggle />
        </nav>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/constituents" element={<Constituents />} />
          <Route path="/history" element={<History />} />
          <Route path="/changes" element={<Changes />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>{copy.footer[0]}</span>
        <span>{copy.footer[1]}</span>
      </footer>
    </div>
  );
}
