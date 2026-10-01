import { createContext, useContext } from "react";

export type Locale = "en-US" | "zh-CN";

const COPY = {
  "en-US": {
    brandKicker: "A-share zoo & garden · rule-based research",
    title: "A-share Zoo & Garden",
    documentTitle: "A-share Zoo & Garden · Rule-based research",
    deck: "Turn a seemingly arbitrary stock-name classification into a public, daily-updated, reproducible index experiment.",
    index: "Research index",
    waiting: "Waiting for data",
    nav: ["Home", "Methodology", "Constituents", "History", "Changes", "About"],
    footer: ["Updated after each daily close · rules public · research only", "Not investment advice"],
    switchTo: "中文",
  },
  "zh-CN": {
    brandKicker: "A 股动物园与植物园 · 规则化研究",
    title: "A 股动物园与植物园",
    documentTitle: "A 股动物园与植物园 · 规则化研究",
    deck: "把一个看似荒谬的股票分类，做成公开规则、每日更新、可以复查的指数实验。",
    index: "研究指数",
    waiting: "等待数据",
    nav: ["首页", "方法", "成分", "历史", "调仓", "关于"],
    footer: ["数据每日收盘后更新 · 规则公开 · 仅供研究", "不构成投资建议"],
    switchTo: "English",
  },
} as const;

export const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "en-US",
  setLocale: () => undefined,
});

export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, copy: COPY[locale], setLocale };
}

export function initialLocale(): Locale {
  try {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested === "en-US" || requested === "zh-CN") return requested;
    return window.localStorage.getItem("a-share-zoo-locale") === "zh-CN" ? "zh-CN" : "en-US";
  } catch {
    return "en-US";
  }
}
