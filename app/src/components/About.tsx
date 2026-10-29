import { useProfile } from "../context/ProfileContext";
import { aboutParagraphs } from "../data/profile";
import { Reveal } from "./Reveal";

interface AboutProps {
  onEdit: () => void;
}

export function About({ onEdit }: AboutProps) {
  const { profile, isCustom } = useProfile();

  const facts = [
    { label: "姓名", value: profile.name },
    { label: "学校", value: profile.school },
    { label: "专业", value: profile.major },
    { label: "年级 / 学号", value: `${profile.grade} · ${profile.studentId}` },
    { label: "指导教师", value: profile.teacher },
    { label: "方向", value: profile.role },
  ];
  if (profile.email) facts.push({ label: "邮箱", value: profile.email });

  return (
    <section className="section" id="about">
      <div className="wrap">
        <Reveal className="section__head" as="header">
          <span className="section__idx">01</span>
          <h2 className="section__title">关于我</h2>
          <span className="section__line" />
          <span className="section__note">who am i</span>
        </Reveal>

        <div className="about">
          <Reveal className="about__text">
            {aboutParagraphs.map((text) => (
              <p key={text.slice(0, 12)}>{text}</p>
            ))}
          </Reveal>

          <Reveal className="facts" delay={100}>
            <div className="facts__head">
              <span>基本资料{isCustom ? " · 已本地修改" : ""}</span>
              <button className="mini" type="button" onClick={onEdit}>
                编辑
              </button>
            </div>
            {facts.map((fact) => (
              <div className="fact" key={fact.label}>
                <span>{fact.label}</span>
                <b>{fact.value}</b>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
