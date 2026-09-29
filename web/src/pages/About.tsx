import { useLocale } from "../i18n";

export default function About() {
  const { locale } = useLocale();
  const english = locale === "en-US";
  return (
    <div className="page-about">
      <h2>{english ? "About this project" : "关于本项目"}</h2>
      <p>
        {english ? "The A-share Zoo and Garden indices are a research experiment that classifies Chinese stock names: A-shares whose names contain animal or plant terms are combined equal-weighted to study long-run performance relative to a broad-market benchmark." : "A 股动物园和植物园指数是用于研究的中文股票名称分类实验：把名称里带有动物或植物相关字样的 A 股，按等权方式组合成指数，观察它们相对大盘基准的长期表现。"}
      </p>
      <p>
        {english ? "Index calculations run in Python and are published as public JSON. The frontend only presents the results; source credentials remain server-side." : "指数计算在 Python 端完成，结果以公开 JSON 形式发布。前端只负责展示，数据源凭证只在服务端保存。"}
      </p>
      <h3>{english ? "Disclaimer" : "免责声明"}</h3>
      <p>
        {english ? "This project is for research and methodology demonstration only. All indices and returns are historical backtest results and are not investment advice. Use at your own risk." : "本项目仅用于研究与方法演示，所有指数与收益均为历史回测结果，不构成任何投资建议。据此操作风险自负。"}
      </p>
    </div>
  );
}
