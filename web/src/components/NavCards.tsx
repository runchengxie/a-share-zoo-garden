import { Latest, formatNav, formatPercent } from "../api";
import { formatCopy, useLocale } from "../i18n";

interface NavMetricProps {
  title: string;
  nav: number;
  daily: number;
  detail: string;
  variant: "strict" | "extended" | "benchmark";
}

function NavMetric({ title, nav, daily, detail, variant }: NavMetricProps) {
  const { copy } = useLocale();
  const direction = daily >= 0 ? "up" : "down";
  return (
    <article className={`metric-cell metric-cell-${variant}`}>
      <div className="metric-label">{title}</div>
      <div className="metric-value">{formatNav(nav)}</div>
      <div className={`metric-change ${direction}`}>
        {formatCopy(copy.navCards.today, { value: formatPercent(daily) })}
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

export default function NavCards({ latest, strictCount, extendedCount, themeLabel }: Props) {
  const { copy } = useLocale();
  const text = copy.navCards;
  const label = themeLabel ?? copy.home.themeAnimal;
  return (
    <div className="metric-strip">
      <NavMetric
        title={formatCopy(text.strict, { theme: label })}
        nav={latest.zoo_strict_nav}
        daily={latest.zoo_strict_daily}
        detail={formatCopy(text.strictDetail, { value: formatPercent(latest.zoo_strict_excess) })}
        variant="strict"
      />
      <NavMetric
        title={formatCopy(text.extended, { theme: label })}
        nav={latest.zoo_extended_nav}
        daily={latest.zoo_extended_daily}
        detail={formatCopy(text.extendedDetail, { value: formatPercent(latest.zoo_extended_excess) })}
        variant="extended"
      />
      <NavMetric
        title={latest.benchmark_label}
        nav={latest.benchmark_nav}
        daily={latest.benchmark_daily}
        detail={latest.benchmark_code}
        variant="benchmark"
      />
      <CountMetric title={formatCopy(text.strictCount, { theme: label })} value={strictCount} detail={text.currentStocks} />
      <CountMetric title={formatCopy(text.extendedCount, { theme: label })} value={extendedCount} detail={text.currentStocks} />
    </div>
  );
}
