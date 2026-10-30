import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Skills() {
  const { site } = useSite();

  return (
    <section className="section" id="skills">
      <div className="wrap">
        <SectionHead id="skills" />

        <div className="skills">
          {site.skills.map((skill, index) => (
            <Reveal className="skill" as="article" key={skill.title} delay={index * 80}>
              <div className="skill__head">
                <span className="skill__icon">{skill.icon}</span>
                <h3>{skill.title}</h3>
              </div>
              <p>{skill.desc}</p>
              <div className="tags">
                {skill.hot.map((tag) => (
                  <span className="tag tag--hot" key={tag}>
                    {tag}
                  </span>
                ))}
                {skill.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
