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
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ProfileEditor } from "./components/ProfileEditor";
import { PasscodeDialog } from "./components/PasscodeDialog";
import { useSectionSpy } from "./hooks/useScrollFx";
import { useAdmin } from "./hooks/useAdmin";
import { navItems } from "./data/profile";

const sectionIds = navItems.map((item) => item.href);

export default function App() {
  const active = useSectionSpy(sectionIds);
  const admin = useAdmin();
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /** 点「编辑资料」：未解锁先过口令，已解锁直接进编辑 */
  const requestEdit = () => {
    if (admin.unlocked) {
      setEditing(true);
    } else {
      setAsking(true);
    }
  };

  const locked = !admin.unlocked;

  return (
    <>
      <Backdrop />
      <Nav active={active} onEdit={requestEdit} locked={locked} hasPasscode={admin.hasPasscode} />
      <main id="top">
        <Hero />
        <About onEdit={requestEdit} locked={locked} />
        <Skills />
        <Projects />
        <TrainingSection />
        <Journey />
        <LocalSection />
        <Contact />
        <Footer />
      </main>

      <PasscodeDialog
        open={asking}
        admin={admin}
        onClose={() => setAsking(false)}
        onUnlocked={() => {
          setToast(admin.hasPasscode ? "已验证，可以编辑资料" : "管理口令已设置");
          setEditing(true);
        }}
      />
      <ProfileEditor
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => setToast("个人信息已保存")}
        onLock={() => {
          admin.lock();
          setToast("已退出管理");
        }}
      />
      <div className={`toast ${toast ? "is-on" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
