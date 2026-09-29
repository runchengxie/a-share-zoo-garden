import { Latest, formatNav, formatPercent } from "../api";
import { useLocale } from "../i18n";

interface NavMetricProps {
  title: string;
  nav: number;
  daily: number;
  detail: string;
  variant: "strict" | "extended" | "benchmark";
}

function NavMetric({ title, nav, daily, detail, variant }: NavMetricProps) {
  const { locale } = useLocale();
  const direction = daily >= 0 ? "up" : "down";
  return (
    <article className={`metric-cell metric-cell-${variant}`}>
      <div className="metric-label">{title}</div>
      <div className="metric-value">{formatNav(nav)}</div>
      <div className={`metric-change ${direction}`}>
        {locale === "en-US" ? `Today ${formatPercent(daily)}` : `当日 ${formatPercent(daily)}`}
      </div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function CountMetric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <article className="metric-cell metric-cell-count">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

interface Props {
  latest: Latest;
  strictCount: number;
  extendedCount: number;
  themeLabel?: string;
}

export default function NavCards({ latest, strictCount, extendedCount, themeLabel = "动物园" }: Props) {
  const { locale } = useLocale();
  const english = locale === "en-US";
  return (
    <div className="metric-strip">
      <NavMetric
        title={english ? `Strict ${themeLabel}` : `严格${themeLabel}`}
        nav={latest.zoo_strict_nav}
        daily={latest.zoo_strict_daily}
        detail={english ? `vs. benchmark ${formatPercent(latest.zoo_strict_excess)}` : `相对基准 ${formatPercent(latest.zoo_strict_excess)}`}
        variant="strict"
      />
      <NavMetric
        title={english ? `Extended ${themeLabel}` : `扩展${themeLabel}`}
        nav={latest.zoo_extended_nav}
        daily={latest.zoo_extended_daily}
        detail={english ? `vs. benchmark ${formatPercent(latest.zoo_extended_excess)}` : `相对基准 ${formatPercent(latest.zoo_extended_excess)}`}
        variant="extended"
      />
      <NavMetric
        title={latest.benchmark_label}
        nav={latest.benchmark_nav}
        daily={latest.benchmark_daily}
        detail={latest.benchmark_code}
        variant="benchmark"
      />
      <CountMetric title={english ? `Strict ${themeLabel} constituents` : `严格${themeLabel}成分`} value={strictCount} detail={english ? "Current stocks" : "当前股票数"} />
      <CountMetric title={english ? `Extended ${themeLabel} constituents` : `扩展${themeLabel}成分`} value={extendedCount} detail={english ? "Current stocks" : "当前股票数"} />
    </div>
  );
}
