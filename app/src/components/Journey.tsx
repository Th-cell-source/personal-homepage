import { journey } from "../data/profile";
import { Reveal } from "./Reveal";

export function Journey() {
  return (
    <section className="section" id="journey">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">04</span>
          <h2 className="section__title">实训历程</h2>
          <span className="section__line" />
          <span className="section__note">10.20 — 10.28</span>
        </Reveal>

        <div className="timeline">
          {journey.map((item, index) => (
            <Reveal className="tl" key={item.date} delay={index * 40}>
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
