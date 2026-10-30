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
import { AdminPanel } from "./components/AdminPanel";
import { LoginPage } from "./components/LoginPage";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { useSectionSpy } from "./hooks/useScrollFx";
import { useAuth } from "./hooks/useAuth";

const sectionIds = ["#about", "#skills", "#projects", "#training", "#journey", "#local", "#deliverables", "#contact"];

export default function App() {
  const active = useSectionSpy(sectionIds);
  const auth = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!auth.authed) {
    return <LoginPage auth={auth} />;
  }

  return (
    <>
      <Backdrop />
      <Nav
        active={active}
        onEdit={() => setAdminOpen(true)}
        onLogout={() => {
          auth.logout();
          setToast("已退出登录");
        }}
      />
      <main id="top">
        <Hero />
        <About onEdit={() => setAdminOpen(true)} />
        <Skills />
        <Projects />
        <TrainingSection />
        <Journey />
        <LocalSection />
        <Deliverables />
        <Contact />
        <Footer />
      </main>

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onSaved={() => setToast("内容已保存")} />
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
