import { useSite } from "../context/SiteContext";

export function Footer() {
  const { site } = useSite();
  const { profile } = site;

  return (
    <div className="wrap">
      <footer className="foot">
        <div className="foot__mono">
          © 2026 {profile.name} · {profile.school}
          {profile.major}
        </div>
        <div>本站为《软件开发综合实践》课程作业 · React + TypeScript 实现</div>
      </footer>
    </div>
  );
}
