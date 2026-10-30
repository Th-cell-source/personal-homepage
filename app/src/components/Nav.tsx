import { useState } from "react";
import { useSite } from "../context/SiteContext";

const navItems = [
  { href: "#about", label: "关于" },
  { href: "#skills", label: "技能" },
  { href: "#projects", label: "项目" },
  { href: "#training", label: "训练" },
  { href: "#journey", label: "实训" },
  { href: "#local", label: "本地" },
  { href: "#deliverables", label: "成果" },
  { href: "#contact", label: "联系" },
];

interface NavProps {
  active: string;
  onEdit: () => void;
  onLogout: () => void;
}

export function Nav({ active, onEdit, onLogout }: NavProps) {
  const [open, setOpen] = useState(false);
  const { site } = useSite();
  const { profile } = site;

  return (
    <header className={`nav ${open ? "is-open" : ""}`}>
      <a className="brand" href="#top" onClick={() => setOpen(false)}>
        <span className="brand__mark">{profile.name.slice(0, 1)}</span>
        <span className="brand__text">
          {profile.name}
          <span>{profile.latin}</span>
        </span>
      </a>

      <nav className="nav__links" aria-label="页面导航">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={active === item.href ? "is-active" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}
        <button
          className="nav__edit"
          type="button"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          管理后台
        </button>
        <button className="nav__logout" type="button" onClick={onLogout}>
          退出登录
        </button>
        <a className="nav__gh" href="https://github.com/Th-cell-source" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          GitHub
        </a>
      </nav>

      <button
        className="nav__burger"
        aria-label={open ? "收起菜单" : "打开菜单"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
