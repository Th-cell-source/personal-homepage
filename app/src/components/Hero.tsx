import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";

const terminalCmds = [
  { cmd: "whoami", flag: "", key: "who" },
  { cmd: "cat", flag: "edu.txt", key: "edu" },
  { cmd: "stack", flag: "--list", key: "stack" },
  { cmd: "now", flag: "--working-on", key: "now" },
];

export function Hero() {
  const { site } = useSite();
  const { profile, hero, stats } = site;

  const output = (key: string): string[] => {
    if (key === "who") return [`${profile.name} / ${profile.latin}`];
    if (key === "edu") return [`${profile.school} · ${profile.major} · ${profile.grade}`];
    if (key === "stack") return ["Python · FastAPI · PyTorch", "React · TypeScript · Vue3", "C / 单片机 · Proteus · MySQL"];
    return ["智语 Chat：自建 175 万参数中文小模型"];
  };

  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero__grid">
          <Reveal>
            <div className="eyebrow">
              <i />
              {hero.eyebrow}
            </div>
            <h1>
              {hero.titleTop}
              <br />
              <em>{hero.titleBottom}</em>
              {hero.titleTail}
            </h1>
            <p className="hero__role">
              <b>{profile.name}</b> · {profile.major} · {profile.role}
            </p>
            <p className="hero__desc">
              {hero.descPrefix}
              <b>{hero.descStrong}</b>
              {hero.descSuffix}
            </p>
            <div className="hero__meta">
              <span>
                学校 <b>{profile.school}</b>
              </span>
              <span>
                学号 <b>{profile.studentId}</b>
              </span>
              <span>
                指导教师 <b>{profile.teacher}</b>
              </span>
            </div>
            <div className="cta">
              <a className="btn btn--primary" href="#projects">
                看看我的项目 →
              </a>
              <a className="btn btn--ghost" href="https://github.com/Th-cell-source" target="_blank" rel="noopener noreferrer">
                GitHub 主页
              </a>
            </div>
          </Reveal>

          <Reveal className="term" delay={120} ariaHidden>
            <div className="term__bar">
              <span className="term__dot" />
              <span className="term__dot" />
              <span className="term__dot" />
              <span className="term__file">~/tianhao/profile.sh</span>
            </div>
            <div className="term__body">
              {terminalCmds.map((line) => (
                <div key={line.cmd}>
                  <div>
                    <span className="p">$</span> <span className="c">{line.cmd}</span>
                    {line.flag ? <span className="k"> {line.flag}</span> : null}
                  </div>
                  {output(line.key).map((text) => (
                    <div key={text} className="m">
                      {text}
                    </div>
                  ))}
                </div>
              ))}
              <div>
                <span className="p">$</span> <span className="caret" />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="stats" delay={200}>
          {stats.map((item) => (
            <div className="stat" key={item.label}>
              <b>
                {item.value}
                <span>{item.unit}</span>
              </b>
              <i>{item.label}</i>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
