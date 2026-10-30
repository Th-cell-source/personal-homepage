import { useSite } from "../context/SiteContext";
import { Reveal } from "./Reveal";

/** 统一的栏目标题：编号 / 标题 / 右侧注释，都可在管理后台修改 */
export function SectionHead({ id }: { id: string }) {
  const { site } = useSite();
  const head = site.heads[id] ?? { idx: "", title: "", note: "" };

  return (
    <Reveal className="section__head" as="header">
      <span className="section__idx">{head.idx}</span>
      <h2 className="section__title">{head.title}</h2>
      <span className="section__line" />
      <span className="section__note">{head.note}</span>
    </Reveal>
  );
}
