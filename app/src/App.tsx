import { Backdrop } from "./components/Backdrop";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Skills } from "./components/Skills";
import { Projects } from "./components/Projects";
import { Journey } from "./components/Journey";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { useSectionSpy } from "./hooks/useScrollFx";
import { navItems } from "./data/profile";

const sectionIds = navItems.map((item) => item.href);

export default function App() {
  const active = useSectionSpy(sectionIds);

  return (
    <>
      <Backdrop />
      <Nav active={active} />
      <main id="top">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Journey />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
