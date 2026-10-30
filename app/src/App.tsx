import { useEffect, useState } from "react";
import { Backdrop } from "./components/Backdrop";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Skills } from "./components/Skills";
import { Projects } from "./components/Projects";
import { TrainingSection } from "./components/TrainingSection";
import { Journey } from "./components/Journey";
import { LocalSection } from "./components/LocalSection";
import { Deliverables } from "./components/Deliverables";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ProfileEditor } from "./components/ProfileEditor";
import { LoginPage } from "./components/LoginPage";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { useSectionSpy } from "./hooks/useScrollFx";
import { useAuth } from "./hooks/useAuth";
import { navItems } from "./data/profile";

const sectionIds = navItems.map((item) => item.href);

export default function App() {
  const active = useSectionSpy(sectionIds);
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 未登录：只渲染登录页，主页内容不进 DOM
  if (!auth.authed) {
    return <LoginPage auth={auth} />;
  }

  return (
    <>
      <Backdrop />
      <Nav
        active={active}
        onEdit={() => setEditing(true)}
        onLogout={() => {
          auth.logout();
          setToast("已退出登录");
        }}
      />
      <main id="top">
        <Hero />
        <About onEdit={() => setEditing(true)} />
        <Skills />
        <Projects />
        <TrainingSection />
        <Journey />
        <LocalSection />
        <Deliverables />
        <Contact />
        <Footer />
      </main>

      <ProfileEditor
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => setToast("个人信息已保存")}
        onChangePassword={() => {
          setEditing(false);
          setChangingPw(true);
        }}
      />
      <ChangePasswordDialog
        open={changingPw}
        auth={auth}
        onClose={() => setChangingPw(false)}
        onDone={() => setToast("登录口令已更新")}
      />
      <div className={`toast ${toast ? "is-on" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
