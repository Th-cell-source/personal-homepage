import { profile, stats } from "../data/profile";
import { Reveal } from "./Reveal";

const terminalLines: Array<{ cmd: string; flag?: string; out: string[] }> = [
  { cmd: "whoami", out: ["田昊 / Tian Hao"] },
  { cmd: "cat", flag: "edu.txt", out: ["大连民族大学 · 物联网工程 · 2024 级"] },
  {
    cmd: "stack",
    flag: "--list",
    out: ["Python · FastAPI · PyTorch", "React · TypeScript · Vue3", "C / 单片机 · Proteus · MySQL"],
  },
  { cmd: "now", flag: "--working-on", out: ["智语 Chat：自建 175 万参数中文小模型"] },
];

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero__grid">
          <Reveal>
            <div className="eyebrow">
              <i />
              AVAILABLE FOR INTERNSHIP · 2026
            </div>
            <h1>
              {profile.heroTitleTop}
              <br />
              <em>{profile.heroTitleBottom}</em>
              {profile.heroTitleTail}
            </h1>
            <p className="hero__role">
              <b>{profile.name}</b> · {profile.major} · {profile.role}
            </p>
            <p className="hero__desc">
              {profile.heroDescBefore}
              <b>{profile.heroDescStrong}</b>
              {profile.heroDescAfter}
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
              <a className="btn btn--ghost" href={profile.github} target="_blank" rel="noopener noreferrer">
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
              {terminalLines.map((line) => (
                <div key={line.cmd}>
                  <div>
                    <span className="p">$</span> <span className="c">{line.cmd}</span>
                    {line.flag ? <span className="k"> {line.flag}</span> : null}
                  </div>
                  {line.out.map((text) => (
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
