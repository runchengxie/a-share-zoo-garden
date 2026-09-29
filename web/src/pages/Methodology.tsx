import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { useLocale } from "../i18n";

export default function Methodology() {
  const { locale } = useLocale();
  const english = locale === "en-US";
  return (
    <div className="page-methodology">
      <h2>{english ? "Index construction methodology" : "指数构建方法"}</h2>
      <p>
        {english ? "The Zoo and Garden indices select constituents from the A-share universe when their historical names contain the relevant theme terms, construct equal-weighted NAV series, and compare them with a configurable benchmark (CSI 300 ETF by default)." : "动物园和植物园指数从 A 股全市场里，按股票简称是否包含对应主题词，筛选出成分股，以等权方式构造净值序列，并与可配置基准（默认沪深 300 ETF）对比。"}
      </p>

      <h3>{english ? "Two index variants" : "两种指数"}</h3>
      <ul>
        <li>{english ? "Strict: match explicit theme terms only, with fewer false positives." : "严格版本：仅匹配明确的主题词，误匹配较少。"}</li>
        <li>{english ? "Extended: add broader terms beyond the strict vocabulary for wider coverage and more noise." : "扩展版本：在严格词表之外加入更宽泛的主题词，覆盖更广，但噪声也更高。"}</li>
      </ul>

      <h3>{english ? "Vocabulary and exclusions" : "规则词表与排除项"}</h3>
      <p>
        {english ? "Matching uses names as known at each historical point. rules.yml maintains strict keywords, extended keywords, and exclusions. Exclusions filter place names, brands, or industry terms that contain a theme term without matching the research concept. Force-include and force-exclude lists by ts_code provide manual corrections." : "匹配基于股票简称的历史时点名称。规则文件 rules.yml 维护三类配置：严格关键词、扩展关键词、排除项。排除项用于过滤名称中包含主题词、但与主题无关的地名、品牌或行业词。另提供按 ts_code 的强制纳入与强制剔除名单，用于人工纠偏。"}
      </p>
      <TaxonomyDisclosure theme="animal" />
      <TaxonomyDisclosure theme="plant" />

      <h3>{english ? "Adjusted prices and returns" : "复权与收益"}</h3>
      <p>
        {english ? "Daily returns use close and previous close prices adjusted by corporate-action factors so dividends and splits do not create artificial jumps. Constituents are equal-weighted each day." : "每日收益以收盘价与前收价为基础，并按复权因子调整，处理分红送转带来的跳变，使净值连续可比。成分按等权计算，即每个成分每日权重相同。"}
      </p>

      <h3>{english ? "Benchmark" : "基准"}</h3>
      <p>
        {english ? "The default benchmark is the CSI 300 ETF (510300.SH), and the runtime can use the CSI 300 index or another A-share. Benchmark NAV is adjusted under the same convention." : "基准默认取沪深 300 ETF（510300.SH），也可在运行时改为沪深 300 指数或某只 A 股。基准净值同样经过复权处理，确保与主题指数口径一致。"}
      </p>

      <h3>{english ? "Missing-price handling" : "缺失行情处理"}</h3>
      <p>
        {english ? "When a confirmed suspension has no quote, the constituent weight is retained and valued at the last known price. Other missing prices do not redistribute weight to the remaining constituents. New strict-variant calculations stop when a delisted holding lacks both quotes and a verifiable settlement event." : "确认停牌但缺行情时，保留成分权重并以前一已知价格保持估值。其他缺价不会把权重重新分摊给剩余成分。严格版退市持仓缺少行情和可核实结算事件时，新计算会停止，相关日期后的收益不能视作已核实结果。"}
      </p>
      <p>
        {english ? "The continuous Zoo series on the home page uses a research proxy: when verifiable cash settlement is unavailable, it uses the last valid adjusted price before delisting, records zero return on the delisting date, and removes the constituent. This series is for research observation and does not represent formal tradable performance." : "首页当前展示的动物园连续曲线属于研究代理版：缺少可核实现金结算时，使用退市前最后有效复权价格，退市日计为零收益并移除成分。该序列用于观察研究，不代表正式可交易业绩。"}
      </p>
      <p>{english ? "The home page delisting audit lists the last observable date, proxy settlement date, and strict status for each event." : "每个退市事件的最后可观测日、代理结算日和严格版状态见首页的退市事件审计表。"}</p>
    </div>
  );
}
