import { useProfile } from "../context/ProfileContext";
import { stats } from "../data/profile";
import { Reveal } from "./Reveal";

const terminalLines: Array<{ cmd: string; flag?: string; out: (p: { major: string; grade: string; studentId: string; name: string }) => string[] }> = [
  { cmd: "whoami", out: (p) => [`${p.name} / Tian Hao`] },
  { cmd: "cat", flag: "edu.txt", out: (p) => [`大连民族大学 · ${p.major} · ${p.grade}`] },
  {
    cmd: "stack",
    flag: "--list",
    out: () => ["Python · FastAPI · PyTorch", "React · TypeScript · Vue3", "C / 单片机 · Proteus · MySQL"],
  },
  { cmd: "now", flag: "--working-on", out: () => ["智语 Chat：自建 175 万参数中文小模型"] },
];

export function Hero() {
  const { profile } = useProfile();

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
              把想法做成
              <br />
              <em>能跑起来</em>
              的东西
            </h1>
            <p className="hero__role">
              <b>{profile.name}</b> · {profile.major} · {profile.role}
            </p>
            <p className="hero__desc">
              {profile.school}
              <b>
                {profile.major} {profile.grade}
              </b>
              。平时写 Python、Java 和前端，也焊过板子、调过单片机；最近在做的事情是从零训练一个中文小模型，再把它接进一套能用的对话系统里。
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
              {terminalLines.map((line) => (
                <div key={line.cmd}>
                  <div>
                    <span className="p">$</span> <span className="c">{line.cmd}</span>
                    {line.flag ? <span className="k"> {line.flag}</span> : null}
                  </div>
                  {line.out(profile).map((text) => (
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
