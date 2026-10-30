import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

interface AboutProps {
  onEdit: () => void;
}

export function About({ onEdit }: AboutProps) {
  const { site } = useSite();

  return (
    <section className="section" id="about">
      <div className="wrap">
        <SectionHead id="about" />

        <div className="about">
          <Reveal className="about__text">
            {site.about.map((text) => (
              <p key={text.slice(0, 12)}>{text}</p>
            ))}
          </Reveal>

          <Reveal className="facts" delay={100}>
            <div className="facts__head">
              <span>基本资料</span>
              <button className="mini" type="button" onClick={onEdit}>
                管理
              </button>
            </div>
            {site.facts.map((fact) => (
              <div className="fact" key={fact.label}>
                <span>{fact.label}</span>
                <b>{fact.value}</b>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
