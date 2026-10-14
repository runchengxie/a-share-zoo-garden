import type { IndexTheme } from "../api";
import { formatCopy, useLocale } from "../i18n";

const FIRST_KNOWN_RULE_DATE: Record<IndexTheme, string> = {
  animal: "2025-12-22",
  plant: "2026-09-05",
};

export default function TaxonomyDisclosure({ theme }: { theme: IndexTheme }) {
  const { copy } = useLocale();
  const date = FIRST_KNOWN_RULE_DATE[theme];
  return (
    <p className="muted" role="note">
      {formatCopy(copy.taxonomy[theme], { date })}
    </p>
  );
}
