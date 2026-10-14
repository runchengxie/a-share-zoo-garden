import { useLocale } from "../i18n";

export default function About() {
  const { copy } = useLocale();
  return (
    <div className="page-about">
      <h2>{copy.about.heading}</h2>
      <p>{copy.about.intro}</p>
      <p>{copy.about.calculation}</p>
      <h3>{copy.about.disclaimerHeading}</h3>
      <p>{copy.about.disclaimer}</p>
    </div>
  );
}
