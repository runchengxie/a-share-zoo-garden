import type { IndexTheme } from "../api";
import { useLocale } from "../i18n";

const FIRST_KNOWN_RULE_DATE: Record<IndexTheme, string> = {
  animal: "2025-12-22",
  plant: "2026-09-05",
};

export default function TaxonomyDisclosure({ theme }: { theme: IndexTheme }) {
  const { locale } = useLocale();
  const date = FIRST_KNOWN_RULE_DATE[theme];
  return (
    <p className="muted" role="note">
      {locale === "en-US" ? `${theme === "animal" ? "Zoo" : "Garden"} vocabulary has a first verifiable effective date of ${date}. Earlier NAV uses the later vocabulary replay and is a retrospective classification experiment, not an executable strategy history.` : `${theme === "animal" ? "动物园" : "植物园"}词表最早可核实的生效日为 ${date}。此前的净值使用后来确定的词表回放，属于事后分类实验，不能视为当时可执行的策略历史。`}
    </p>
  );
}
