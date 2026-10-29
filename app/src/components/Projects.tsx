import { projects } from "../data/profile";
import { Reveal } from "./Reveal";

export function Projects() {
  return (
    <section className="section" id="projects">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">03</span>
          <h2 className="section__title">项目作品</h2>
          <span className="section__line" />
          <span className="section__note">selected works</span>
        </Reveal>

        <div className="projects">
          {projects.map((project, index) => (
            <Reveal
              className={`proj ${project.muted ? "proj--muted" : ""}`.trim()}
              as="article"
              key={project.title}
              delay={index * 90}
            >
              <div className="proj__top">
                <span className="proj__kind">{project.kind}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.desc}</p>
              <div className="proj__tags">
                {project.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <a className="proj__link" href={project.link} target="_blank" rel="noopener noreferrer">
                {project.linkText}
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
