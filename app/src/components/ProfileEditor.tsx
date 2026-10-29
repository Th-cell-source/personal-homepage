import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE, useProfile, type ProfileState } from "../context/ProfileContext";

interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onChangePassword: () => void;
}

const LABELS: Array<{ key: keyof ProfileState; label: string; placeholder: string; hint?: string }> = [
  { key: "name", label: "姓名", placeholder: "田昊" },
  { key: "role", label: "方向", placeholder: "全栈开发 / 嵌入式 / 大模型应用" },
  { key: "school", label: "学校", placeholder: "大连民族大学" },
  { key: "major", label: "专业", placeholder: "物联网工程" },
  { key: "grade", label: "年级", placeholder: "2024 级" },
  { key: "studentId", label: "学号", placeholder: "2023250718", hint: "6~14 位数字" },
  { key: "teacher", label: "指导教师", placeholder: "兰艳" },
  { key: "email", label: "邮箱（可选）", placeholder: "you@example.com", hint: "留空则不显示" },
];

/** 个人信息编辑弹窗：改完存到 localStorage，刷新页面仍然生效 */
export function ProfileEditor({ open, onClose, onSaved, onChangePassword }: ProfileEditorProps) {
  const { profile, save, reset } = useProfile();
  const [draft, setDraft] = useState<ProfileState>(profile);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(profile);
      setError("");
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, profile]);

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

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("姓名不能为空");
      return;
    }
    if (draft.studentId && !/^\d{6,14}$/.test(draft.studentId.trim())) {
      setError("学号应为 6~14 位数字");
      return;
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setError("邮箱格式不正确");
      return;
    }
    const isDefault = (Object.keys(DEFAULT_PROFILE) as Array<keyof ProfileState>).every(
      (key) => (draft[key] ?? "") === DEFAULT_PROFILE[key],
    );
    if (isDefault) {
      reset();
    } else {
      save(draft);
    }
    onSaved();
    onClose();
  };

  const restore = () => {
    setDraft(DEFAULT_PROFILE);
    setError("");
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
      <button className="modal__backdrop" aria-label="关闭" onClick={onClose} />
      <form className="modal__panel" onSubmit={submit}>
        <header className="modal__head">
          <div>
            <h2 id="profile-editor-title">编辑个人信息</h2>
            <p>修改后立即生效，保存在本机浏览器里，刷新页面不会丢。</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="form">
          {LABELS.map((field, index) => (
            <label className="form__row" key={field.key}>
              <span>
                {field.label}
                {field.hint ? <em>{field.hint}</em> : null}
              </span>
              <input
                ref={index === 0 ? firstFieldRef : undefined}
                type={field.key === "email" ? "email" : "text"}
                value={draft[field.key]}
                placeholder={field.placeholder}
                maxLength={40}
                onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
              />
            </label>
          ))}
        </div>

        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="modal__foot">
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={restore}>
              恢复默认
            </button>
            <button type="button" className="btn btn--ghost" onClick={onChangePassword}>
              修改登录口令
            </button>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn--primary">
              保存
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
