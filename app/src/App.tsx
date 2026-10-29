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
import { useSectionSpy } from "./hooks/useScrollFx";
import { navItems } from "./data/profile";

const sectionIds = navItems.map((item) => item.href);

export default function App() {
  const active = useSectionSpy(sectionIds);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <Backdrop />
      <Nav active={active} onEdit={() => setEditing(true)} />
      <main id="top">
        <Hero />
        <About onEdit={() => setEditing(true)} />
        <Skills />
        <Projects />
        <TrainingSection />
        <Journey />
        <LocalSection />
        <Contact />
        <Footer />
      </main>

      <ProfileEditor open={editing} onClose={() => setEditing(false)} onSaved={() => setToast("个人信息已保存")} />
      <div className={`toast ${toast ? "is-on" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
