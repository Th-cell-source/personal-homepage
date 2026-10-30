import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Projects() {
  const { site } = useSite();

  return (
    <section className="section" id="projects">
      <div className="wrap">
        <SectionHead id="projects" />

        <div className="projects">
          {site.projects.map((project, index) => (
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
              {project.link ? (
                <a className="proj__link" href={project.link} target="_blank" rel="noopener noreferrer">
                  {project.linkText}
                </a>
              ) : null}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
