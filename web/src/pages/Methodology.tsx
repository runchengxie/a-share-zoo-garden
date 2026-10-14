import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { useLocale } from "../i18n";

export default function Methodology() {
  const { copy } = useLocale();
  const text = copy.methodology;
  return (
    <div className="page-methodology">
      <h2>{text.heading}</h2>
      <p>{text.intro}</p>

      <h3>{text.variants}</h3>
      <ul>
        <li>{text.strict}</li>
        <li>{text.extended}</li>
      </ul>

      <h3>{text.vocabulary}</h3>
      <p>{text.vocabularyText}</p>
      <TaxonomyDisclosure theme="animal" />
      <TaxonomyDisclosure theme="plant" />

      <h3>{text.adjusted}</h3>
      <p>{text.adjustedText}</p>

      <h3>{text.benchmark}</h3>
      <p>{text.benchmarkText}</p>

      <h3>{text.missingPrices}</h3>
      <p>{text.missingPricesText}</p>
      <p>{text.proxySeries}</p>
      <p>{text.delistingAudit}</p>
    </div>
  );
}
