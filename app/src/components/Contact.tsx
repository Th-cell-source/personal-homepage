import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Contact() {
  const { site } = useSite();
  const { profile, contact } = site;

  return (
    <section className="section" id="contact">
      <div className="wrap">
        <SectionHead id="contact" />

        <Reveal className="contact">
          <div>
            <h2>{contact.title}</h2>
            <p>{contact.desc}</p>
            <div className="contact__links">
              <a className="btn btn--primary" href="https://github.com/Th-cell-source" target="_blank" rel="noopener noreferrer">
                去 GitHub 看看 →
              </a>
              <a
                className="btn btn--ghost"
                href="https://th-cell-source.github.io/ecom-img-downloader/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                插件官网
              </a>
            </div>
          </div>

          <div className="contact__list">
            <a className="clink" href="https://github.com/Th-cell-source" target="_blank" rel="noopener noreferrer">
              GitHub<span>Th-cell-source</span>
            </a>
            <a
              className="clink"
              href="https://th-cell-source.github.io/personal-homepage/"
              target="_blank"
              rel="noopener noreferrer"
            >
              个人主页<span>pages</span>
            </a>
            <div className="clink">
              学校<span>{profile.school}</span>
            </div>
            <div className="clink">
              专业 / 年级<span>{profile.major} · {profile.grade}</span>
            </div>
            {profile.email ? (
              <a className="clink" href={`mailto:${profile.email}`}>
                邮箱<span>{profile.email}</span>
              </a>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
