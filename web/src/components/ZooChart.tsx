import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { NavPoint } from "../api";

interface Props {
  history: NavPoint[];
  benchmarkLabel: string;
  themeLabel?: string;
}

function getThemeColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function ZooChart({ history, benchmarkLabel, themeLabel = "动物园" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => setThemeVersion((version) => version + 1);
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const dates = history.map((point) => point.date);
    const strict = history.map((point) => point.zoo_strict_nav);
    const extended = history.map((point) => point.zoo_extended_nav);
    const benchmark = history.map((point) => point.benchmark_nav);
    const strictColor = getThemeColor("--chart-strict", "#76513b");
    const extendedColor = getThemeColor("--chart-extended", "#a77a58");
    const benchmarkColor = getThemeColor("--chart-benchmark", "#77766f");
    const ruleColor = getThemeColor("--rule", "#d9d7d0");
    const mutedColor = getThemeColor("--muted", "#6e7069");
    const chartSurface = getThemeColor("--chart-surface", "#efede7");

    chart.setOption({
      animationDuration: 280,
      backgroundColor: "transparent",
      color: [strictColor, extendedColor, benchmarkColor],
      tooltip: {
        trigger: "axis",
        backgroundColor: "#232a33",
        borderWidth: 0,
        padding: [10, 12],
        textStyle: { color: getThemeColor("--tooltip-text", "#f8f7f2"), fontSize: 12 },
        axisPointer: {
          type: "line",
          lineStyle: { color: mutedColor, type: "dashed", width: 1 },
        },
      },
      legend: {
        data: [`严格${themeLabel}`, `扩展${themeLabel}`, benchmarkLabel],
        top: 0,
        left: 0,
        itemWidth: 18,
        itemHeight: 2,
        textStyle: { color: mutedColor, fontSize: 11 },
      },
      grid: { left: 52, right: 24, top: 44, bottom: 58 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: ruleColor } },
        axisTick: { show: false },
        axisLabel: {
          color: mutedColor,
          fontSize: 10,
          hideOverlap: true,
          formatter: (value: string) => value.slice(0, 7),
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: mutedColor, fontSize: 10 },
        splitLine: { lineStyle: { color: ruleColor, width: 1 } },
      },
      dataZoom: [
        { type: "inside", filterMode: "none" },
        {
          type: "slider",
          height: 14,
          bottom: 12,
          borderColor: "transparent",
          backgroundColor: chartSurface,
          fillerColor: getThemeColor("--chart-filler", "rgba(118, 81, 59, 0.14)"),
          handleSize: "90%",
          showDetail: false,
          moveHandleSize: 4,
          textStyle: { color: mutedColor },
        },
      ],
      series: [
        {
          name: `严格${themeLabel}`,
          type: "line",
          data: strict,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 2.2, color: strictColor },
          emphasis: { focus: "series" },
        },
        {
          name: `扩展${themeLabel}`,
          type: "line",
          data: extended,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 2, color: extendedColor },
          emphasis: { focus: "series" },
        },
        {
          name: benchmarkLabel,
          type: "line",
          data: benchmark,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 1.5, color: benchmarkColor, type: "dashed" },
          emphasis: { focus: "series" },
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [history, benchmarkLabel, themeVersion]);

  return <div ref={ref} className="zoo-chart" role="img" aria-label={`${themeLabel}指数净值走势图`} />;
}
