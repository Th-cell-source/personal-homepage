import { skills } from "../data/profile";
import { Reveal } from "./Reveal";

export function Skills() {
  return (
    <section className="section" id="skills">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">02</span>
          <h2 className="section__title">技能栈</h2>
          <span className="section__line" />
          <span className="section__note">tech stack</span>
        </Reveal>

        <div className="skills">
          {skills.map((skill, index) => (
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
