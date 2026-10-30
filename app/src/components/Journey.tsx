import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Journey() {
  const { site } = useSite();

  return (
    <section className="section" id="journey">
      <div className="wrap">
        <SectionHead id="journey" />

        <div className="timeline">
          {site.journey.map((item, index) => (
            <Reveal className="tl" key={`${item.date}-${item.title}`} delay={index * 40}>
              <div className="tl__date">{item.date}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
