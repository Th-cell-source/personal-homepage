import { profile } from "../data/profile";
import { Reveal } from "./Reveal";

export function Contact() {
  return (
    <section className="section" id="contact">
      <div className="wrap">
        <Reveal className="contact">
          <div>
            <h2>想聊聊项目，或者一起做点什么？</h2>
            <p>课程作业、实习机会、技术问题都欢迎。代码基本都在 GitHub 上，插件与主页可以直接在线访问。</p>
            <div className="contact__links">
              <a className="btn btn--primary" href={profile.github} target="_blank" rel="noopener noreferrer">
                去 GitHub 看看 →
              </a>
              <a className="btn btn--ghost" href={profile.pluginSite} target="_blank" rel="noopener noreferrer">
                插件官网
              </a>
            </div>
          </div>

          <div className="contact__list">
            <a className="clink" href={profile.github} target="_blank" rel="noopener noreferrer">
              GitHub<span>Th-cell-source</span>
            </a>
            <a className="clink" href={profile.homepage} target="_blank" rel="noopener noreferrer">
              个人主页<span>pages</span>
            </a>
            <div className="clink">
              学校<span>{profile.school}</span>
            </div>
            <div className="clink">
              专业 / 年级<span>{profile.major} · {profile.grade}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
