import { useEffect, useMemo, useRef, useState } from "react";
import { useSite } from "../context/SiteContext";
import type { Deliverable, DeliverableAction } from "../data/deliverables";
import type { JourneyItem, LocalPathItem, ProjectItem, SkillItem, StatItem } from "../data/site";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TABS = [
  { key: "profile", label: "基本资料" },
  { key: "hero", label: "首屏文案" },
  { key: "stats", label: "数据条" },
  { key: "about", label: "关于我" },
  { key: "skills", label: "技能栈" },
  { key: "projects", label: "项目作品" },
  { key: "journey", label: "实训历程" },
  { key: "deliverables", label: "成果入口" },
  { key: "locals", label: "本地路径" },
  { key: "heads", label: "栏目标题" },
  { key: "contact", label: "联系区" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="afield">
      <span>
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {textarea ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ListEditor<T>({
  items,
  onChange,
  blank,
  render,
  titleOf,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  titleOf: (item: T) => string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="list-editor">
      {items.map((item, index) => (
        <div className="list-editor__item" key={index}>
          <div className="list-editor__head">
            <b>
              {index + 1}. {titleOf(item) || "（未命名）"}
            </b>
            <div className="list-editor__ops">
              <button type="button" className="mini" onClick={() => move(index, index - 1)} disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                className="mini"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="mini mini--danger"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                删除
              </button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it))))}
        </div>
      ))}
      <button type="button" className="mini mini--add" onClick={() => onChange([...items, blank()])}>
        + 添加一项
      </button>
    </div>
  );
}

/** 管理后台：站点上所有可见内容都能改，改完存本机 localStorage */
export function AdminPanel({ open, onClose, onSaved }: AdminPanelProps) {
  const { site, patch, reset, exportJson, importJson } = useSite();
  const [tab, setTab] = useState<TabKey>("profile");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!note) return undefined;
    const timer = window.setTimeout(() => setNote(""), 2200);
    return () => window.clearTimeout(timer);
  }, [note]);

  const heads = site.heads;
  const headEntries = useMemo(() => Object.entries(heads), [heads]);

  if (!open) return null;

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-content.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setNote("已导出 site-content.json");
  };

  const upload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJson(String(reader.result ?? ""));
      setNote(ok ? "内容已导入" : "导入失败：不是合法的 JSON");
    };
    reader.readAsText(file);
  };

  return (
    <div className="admin" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <button className="modal__backdrop" aria-label="关闭" onClick={onClose} />
      <div className="admin__panel">
        <header className="admin__head">
          <div>
            <h2 id="admin-title">管理后台</h2>
            <p>站点上的文字、列表、链接都能在这里改；保存后立即生效，存在本机浏览器。</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin__body">
          <nav className="admin__tabs" aria-label="内容分类">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={tab === item.key ? "is-active" : ""}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="admin__content">
            {tab === "profile" && (
              <div className="agrid">
                <Field label="姓名" value={site.profile.name} onChange={(v) => patch("profile", { ...site.profile, name: v })} />
                <Field label="英文名" value={site.profile.latin} onChange={(v) => patch("profile", { ...site.profile, latin: v })} />
                <Field label="方向" value={site.profile.role} onChange={(v) => patch("profile", { ...site.profile, role: v })} />
                <Field label="学校" value={site.profile.school} onChange={(v) => patch("profile", { ...site.profile, school: v })} />
                <Field label="专业" value={site.profile.major} onChange={(v) => patch("profile", { ...site.profile, major: v })} />
                <Field label="年级" value={site.profile.grade} onChange={(v) => patch("profile", { ...site.profile, grade: v })} />
                <Field label="学号" value={site.profile.studentId} onChange={(v) => patch("profile", { ...site.profile, studentId: v })} />
                <Field label="指导教师" value={site.profile.teacher} onChange={(v) => patch("profile", { ...site.profile, teacher: v })} />
                <Field label="邮箱（可空）" value={site.profile.email} onChange={(v) => patch("profile", { ...site.profile, email: v })} />
              </div>
            )}

            {tab === "hero" && (
              <div className="agrid">
                <Field label="顶部小标签" value={site.hero.eyebrow} onChange={(v) => patch("hero", { ...site.hero, eyebrow: v })} />
                <Field label="标题第一行" value={site.hero.titleTop} onChange={(v) => patch("hero", { ...site.hero, titleTop: v })} />
                <Field label="标题高亮词" value={site.hero.titleBottom} onChange={(v) => patch("hero", { ...site.hero, titleBottom: v })} />
                <Field label="标题结尾" value={site.hero.titleTail} onChange={(v) => patch("hero", { ...site.hero, titleTail: v })} />
                <Field label="简介开头" value={site.hero.descPrefix} onChange={(v) => patch("hero", { ...site.hero, descPrefix: v })} />
                <Field label="简介加粗部分" value={site.hero.descStrong} onChange={(v) => patch("hero", { ...site.hero, descStrong: v })} />
                <Field
                  label="简介剩余部分"
                  textarea
                  value={site.hero.descSuffix}
                  onChange={(v) => patch("hero", { ...site.hero, descSuffix: v })}
                />
              </div>
            )}

            {tab === "stats" && (
              <ListEditor<StatItem>
                items={site.stats}
                onChange={(next) => patch("stats", next)}
                blank={() => ({ value: "0", unit: "个", label: "新指标" })}
                titleOf={(item) => item.label}
                render={(item, update) => (
                  <div className="agrid agrid--3">
                    <Field label="数值" value={item.value} onChange={(v) => update({ value: v })} />
                    <Field label="单位" value={item.unit} onChange={(v) => update({ unit: v })} />
                    <Field label="说明" value={item.label} onChange={(v) => update({ label: v })} />
                  </div>
                )}
              />
            )}

            {tab === "about" && (
              <div className="astack">
                <Field
                  label="关于我（空行分段）"
                  textarea
                  value={site.about.join("\n\n")}
                  onChange={(v) => patch("about", v.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean))}
                />
                <h4 className="admin__sub">资料卡</h4>
                <ListEditor
                  items={site.facts}
                  onChange={(next) => patch("facts", next)}
                  blank={() => ({ label: "新项", value: "" })}
                  titleOf={(item) => item.label}
                  render={(item, update) => (
                    <div className="agrid">
                      <Field label="项目名" value={item.label} onChange={(v) => update({ label: v })} />
                      <Field label="内容" value={item.value} onChange={(v) => update({ value: v })} />
                    </div>
                  )}
                />
              </div>
            )}

            {tab === "skills" && (
              <ListEditor<SkillItem>
                items={site.skills}
                onChange={(next) => patch("skills", next)}
                blank={() => ({ icon: "◆", title: "新技术", desc: "", tags: [], hot: [] })}
                titleOf={(item) => item.title}
                render={(item, update) => (
                  <div className="agrid">
                    <Field label="图标字符" value={item.icon} onChange={(v) => update({ icon: v })} />
                    <Field label="分组名" value={item.title} onChange={(v) => update({ title: v })} />
                    <Field label="说明" value={item.desc} onChange={(v) => update({ desc: v })} />
                    <Field
                      label="标签（逗号分隔）"
                      value={item.tags.join(", ")}
                      onChange={(v) => update({ tags: v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                    />
                    <Field
                      label="高亮标签"
                      value={item.hot.join(", ")}
                      onChange={(v) => update({ hot: v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                )}
              />
            )}

            {tab === "projects" && (
              <ListEditor<ProjectItem>
                items={site.projects}
                onChange={(next) => patch("projects", next)}
                blank={() => ({ kind: "NEW · 项目", title: "新项目", desc: "", tags: [], link: "", linkText: "查看 →" })}
                titleOf={(item) => item.title}
                render={(item, update) => (
                  <div className="agrid">
                    <Field label="类型标签" value={item.kind} onChange={(v) => update({ kind: v })} />
                    <Field label="标题" value={item.title} onChange={(v) => update({ title: v })} />
                    <Field label="描述" textarea value={item.desc} onChange={(v) => update({ desc: v })} />
                    <Field
                      label="技术标签（逗号分隔）"
                      value={item.tags.join(", ")}
                      onChange={(v) => update({ tags: v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                    />
                    <Field label="链接地址" value={item.link} onChange={(v) => update({ link: v })} />
                    <Field label="链接文案" value={item.linkText} onChange={(v) => update({ linkText: v })} />
                  </div>
                )}
              />
            )}

            {tab === "journey" && (
              <ListEditor<JourneyItem>
                items={site.journey}
                onChange={(next) => patch("journey", next)}
                blank={() => ({ date: "10-30", title: "新的一天", desc: "" })}
                titleOf={(item) => `${item.date} ${item.title}`}
                render={(item, update) => (
                  <div className="agrid">
                    <Field label="日期" value={item.date} onChange={(v) => update({ date: v })} />
                    <Field label="标题" value={item.title} onChange={(v) => update({ title: v })} />
                    <Field label="说明" textarea value={item.desc} onChange={(v) => update({ desc: v })} />
                  </div>
                )}
              />
            )}

            {tab === "deliverables" && (
              <ListEditor<Deliverable>
                items={site.deliverables}
                onChange={(next) => patch("deliverables", next)}
                blank={() => ({
                  index: "06",
                  title: "新成果",
                  kind: "项目",
                  status: "pending",
                  statusText: "待补齐",
                  desc: "",
                  path: "",
                  actions: [{ label: "查看", href: "" }],
                })}
                titleOf={(item) => item.title}
                render={(item, update) => (
                  <div className="agrid">
                    <Field label="序号" value={item.index} onChange={(v) => update({ index: v })} />
                    <Field label="标题" value={item.title} onChange={(v) => update({ title: v })} />
                    <Field label="类型" value={item.kind} onChange={(v) => update({ kind: v })} />
                    <Field label="描述" textarea value={item.desc} onChange={(v) => update({ desc: v })} />
                    <label className="afield">
                      <span>状态</span>
                      <select
                        value={item.status}
                        onChange={(e) => update({ status: e.target.value as Deliverable["status"] })}
                      >
                        <option value="live">已上线</option>
                        <option value="local">本机运行</option>
                        <option value="pending">待补齐</option>
                      </select>
                    </label>
                    <Field label="状态文案" value={item.statusText} onChange={(v) => update({ statusText: v })} />
                    <Field
                      label="本机路径（可空）"
                      value={item.path ?? ""}
                      onChange={(v) => update({ path: v })}
                      hint="显示在卡片底部，可一键复制"
                    />
                    <Field
                      label="按钮（每行：文案|链接）"
                      textarea
                      value={item.actions.map((a: DeliverableAction) => `${a.label}|${a.href ?? ""}`).join("\n")}
                      onChange={(v) =>
                        update({
                          actions: v
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [label, href] = line.split("|");
                              return { label: (label ?? "").trim(), href: (href ?? "").trim() };
                            }),
                        })
                      }
                    />
                  </div>
                )}
              />
            )}

            {tab === "locals" && (
              <ListEditor<LocalPathItem>
                items={site.locals}
                onChange={(next) => patch("locals", next)}
                blank={() => ({ label: "新路径", path: "D:\\", note: "", kind: "folder" })}
                titleOf={(item) => item.label}
                render={(item, update) => (
                  <div className="agrid">
                    <Field label="名称" value={item.label} onChange={(v) => update({ label: v })} />
                    <Field label="说明" value={item.note} onChange={(v) => update({ note: v })} />
                    <Field label="完整路径" value={item.path} onChange={(v) => update({ path: v })} />
                    <label className="afield">
                      <span>类型</span>
                      <select value={item.kind} onChange={(e) => update({ kind: e.target.value as "folder" | "file" })}>
                        <option value="folder">文件夹</option>
                        <option value="file">文件</option>
                      </select>
                    </label>
                  </div>
                )}
              />
            )}

            {tab === "heads" && (
              <div className="astack">
                {headEntries.map(([key, head]) => (
                  <div className="list-editor__item" key={key}>
                    <div className="list-editor__head">
                      <b>{key}</b>
                    </div>
                    <div className="agrid agrid--3">
                      <Field label="编号" value={head.idx} onChange={(v) => patch("heads", { ...heads, [key]: { ...head, idx: v } })} />
                      <Field label="标题" value={head.title} onChange={(v) => patch("heads", { ...heads, [key]: { ...head, title: v } })} />
                      <Field
                        label="右侧注释"
                        value={head.note}
                        onChange={(v) => patch("heads", { ...heads, [key]: { ...head, note: v } })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "contact" && (
              <div className="agrid">
                <Field label="标题" value={site.contact.title} onChange={(v) => patch("contact", { ...site.contact, title: v })} />
                <Field
                  label="描述"
                  textarea
                  value={site.contact.desc}
                  onChange={(v) => patch("contact", { ...site.contact, desc: v })}
                />
              </div>
            )}
          </div>
        </div>

        <footer className="admin__foot">
          <div className="admin__foot-left">
            <button type="button" className="btn btn--ghost" onClick={download}>
              导出内容
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              导入内容
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (window.confirm("确定把所有内容恢复成默认值吗？本机修改会被清除。")) {
                  reset();
                  setNote("已恢复默认内容");
                }
              }}
            >
              恢复默认
            </button>
          </div>
          <div className="admin__foot-right">
            <span className={`admin__note ${note ? "is-on" : ""}`}>{note}</span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onSaved();
                onClose();
              }}
            >
              完成
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
