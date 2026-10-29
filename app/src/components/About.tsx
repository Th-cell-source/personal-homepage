import { aboutParagraphs, facts } from "../data/profile";
import { Reveal } from "./Reveal";

export function About() {
  return (
    <section className="section" id="about">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">01</span>
          <h2 className="section__title">关于我</h2>
          <span className="section__line" />
          <span className="section__note">who am i</span>
        </Reveal>

        <div className="about">
          <Reveal className="about__text">
            {aboutParagraphs.map((text) => (
              <p key={text.slice(0, 12)}>{text}</p>
            ))}
          </Reveal>

          <Reveal className="facts" delay={100}>
            {facts.map((fact) => (
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
