import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const theme = readFileSync(new URL("./theme.ts", import.meta.url), "utf8");
const themeToggle = readFileSync(new URL("./components/ThemeToggle.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("./pages/Home.tsx", import.meta.url), "utf8");
const methodology = readFileSync(new URL("./pages/Methodology.tsx", import.meta.url), "utf8");
const historyPage = readFileSync(new URL("./pages/History.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const chart = readFileSync(new URL("./components/ZooChart.tsx", import.meta.url), "utf8");
const constituentsTable = readFileSync(new URL("./components/ConstituentsTable.tsx", import.meta.url), "utf8");
const changesList = readFileSync(new URL("./components/ChangesList.tsx", import.meta.url), "utf8");
const changesPage = readFileSync(new URL("./pages/Changes.tsx", import.meta.url), "utf8");
const constituentsPage = readFileSync(new URL("./pages/Constituents.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
const audit = readFileSync(new URL("./components/DelistingAudit.tsx", import.meta.url), "utf8");
const i18n = readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("site shell exposes an editorial masthead and research navigation", () => {
  assert.match(app, /brand-kicker/);
  assert.match(i18n, /title: "A 股动物园与植物园"/);
  assert.match(app, /site-deck/);
  assert.match(app, /site-nav/);
  assert.match(app, /ThemeToggle/);
  assert.match(themeToggle, /theme-toggle/);
});

test("theme state is presentation-only and persists the user preference", () => {
  assert.match(theme, /localStorage/);
  assert.match(theme, /dataset\.theme/);
  assert.match(theme, /themechange/);
});

test("home page leads with a research question and index snapshot", () => {
  assert.match(home, /home-hero/);
  assert.match(i18n, /heroTitle: "名字里的动物和植物/);
  assert.match(home, /index-snapshot/);
  assert.match(home, /fetchThemeConstituents/);
  assert.match(home, /fetchThemeData\("animal"\)/);
  assert.match(home, /fetchThemeData\("plant"\)/);
  assert.match(home, /id=\{`\$\{theme\}-panel`\}/);
  assert.match(home, /research-section/);
  assert.match(i18n, /themePlant: "植物园"/);
});

test("unpriced delisting is disclosed with the historical NAV", () => {
  assert.match(home, /research-alert/);
  assert.match(home, /zooHistoryBeforeUnpricedDelist/);
  assert.match(home, /animalSnapshotBlocked/);
  assert.match(home, /research_proxy/);
  assert.match(home, /fetchThemeMetadata/);
  assert.match(home, /fetchDelistingAudit/);
  assert.match(i18n, /subheading: "代理结算记录"/);
  assert.match(i18n, /heading: "Delisting event audit"/);
  assert.match(i18n, /proxySettlementDate: "Proxy settlement date"/);
  assert.match(i18n, /blocked: "Blocked"/);
  assert.match(audit, /event\.strict_status === "blocked"/);
  const delistingData = readFileSync(new URL("../../published/data/delisting_audit.json", import.meta.url), "utf8");
  assert.match(delistingData, /"strict_status": "blocked"/);
  assert.match(i18n, /strictCutoff: "Strict cutoff"/);
  assert.match(i18n, /strictCutoff: "严格截止版"/);
  assert.match(historyPage, /zooHistoryBeforeUnpricedDelist/);
  assert.match(i18n, /待结算数据重建/);
  assert.match(i18n, /researchProxy: "当前为研究代理版/);
  assert.match(i18n, /退市持仓缺少行情和可核实结算事件/);
  assert.match(i18n, /continuous Zoo series/);
  assert.match(i18n, /home page delisting audit/);
  assert.match(historyPage, /copy\.historyPage\.benchmarkNav/);
  assert.doesNotMatch(methodology, /剩余成分重新等权/);
});

test("English delisting audit shows stable security codes without Chinese issuer names", () => {
  assert.match(audit, /formatCopy\(text\.codeValue/);
  assert.match(i18n, /codeValue: "\{code\}"/);
  assert.match(i18n, /codeValue: "\{code\} \{name\}"/);
});

test("home page lazy-loads the chart without changing its data contract", () => {
  assert.match(home, /lazy/);
  assert.match(home, /Suspense/);
  assert.match(i18n, /loadingChart: "加载图表…"/);
});

test("history page shares the lazy chart boundary", () => {
  assert.match(historyPage, /lazy/);
  assert.match(historyPage, /Suspense/);
  assert.doesNotMatch(historyPage, /import ZooChart from/);
});

test("theme data is loaded from an independent plant snapshot", () => {
  assert.match(i18n, /themePlant: "植物园"/);
  assert.match(api, /plant\//);
});

test("editorial stylesheet uses paper, rules, tabular numerals and mobile safeguards", () => {
  assert.match(styles, /--paper:/);
  assert.match(styles, /--rule:/);
  assert.match(styles, /font-variant-numeric:\s*tabular-nums/);
  assert.match(styles, /--accent:/);
  assert.match(styles, /\[data-theme="dark"\]/);
  assert.doesNotMatch(styles, /background-image:\s*\n\s*linear-gradient/);
  assert.match(styles, /\.metric-strip/);
  assert.match(styles, /@media\s*\(max-width:\s*640px\)/);
  assert.match(styles, /overflow-x:\s*auto/);
});

test("NAV chart follows the low-noise research palette", () => {
  assert.match(chart, /axisPointer/);
  assert.match(chart, /splitLine/);
  assert.match(chart, /getComputedStyle/);
  assert.match(chart, /--chart-strict/);
  assert.match(chart, /--chart-extended/);
  assert.match(chart, /--chart-benchmark/);
  assert.match(styles, /--chart-strict:\s*#76513b/);
  assert.match(styles, /--chart-extended:\s*#4f7772/);
  assert.match(styles, /--chart-benchmark:\s*#85857c/);
  assert.match(styles, /--chart-extended:\s*#8fb8ae/);
  assert.match(chart, /width: 2\.4/);
});

test("NAV chart imports only the ECharts modules it uses", () => {
  assert.match(chart, /from "echarts\/core"/);
  assert.match(chart, /LineChart/);
  assert.match(chart, /DataZoomComponent/);
  assert.match(chart, /CanvasRenderer/);
  assert.doesNotMatch(chart, /import \* as echarts from "echarts"/);
});

test("constituent groups can be collapsed", () => {
  assert.match(constituentsTable, /<details/);
  assert.match(constituentsTable, /<summary/);
});

test("change groups are collapsed by default", () => {
  assert.match(changesList, /<details/);
  assert.match(changesList, /<summary/);
  assert.doesNotMatch(changesList, /<details open/);
});

test("change page loads both themes", () => {
  assert.match(changesPage, /fetchThemeChanges\("animal"\)/);
  assert.match(changesPage, /fetchThemeChanges\("plant"\)/);
  assert.match(i18n, /garden: "植物园"/);
  assert.match(i18n, /动物园与植物园分别展示最近一次成分变化/);
});

test("site titles describe both themes", () => {
  assert.match(i18n, /documentTitle: "A 股动物园与植物园 · 规则化研究"/);
  assert.match(app, /<h1>\{copy\.title\}<\/h1>/);
  assert.match(i18n, /动物园与植物园分别展示最近一次成分变化/);
});

test("site exposes an English-first locale contract with a Chinese switch", () => {
  assert.match(html, /<html lang="en-US">/);
  assert.match(html, /<title>A-share Zoo &amp; Garden · Rule-based research<\/title>/);
  assert.match(i18n, /Locale = "en-US" \| "zh-CN"/);
  assert.match(i18n, /a-share-zoo-locale/);
  assert.match(i18n, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(i18n, /requested === "en-US" \|\| requested === "zh-CN"/);
  assert.match(app, /locale-toggle/);
  assert.match(app, /initialLocale/);
  assert.match(app, /url\.searchParams\.set\("lang", next\)/);
  assert.match(app, /document\.documentElement\.lang = locale/);
  assert.match(app, /document\.title = copy\.documentTitle/);
});

test("constituent page loads both themes", () => {
  assert.match(constituentsPage, /fetchThemeConstituents\("animal"\)/);
  assert.match(constituentsPage, /fetchThemeConstituents\("plant"\)/);
});
