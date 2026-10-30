import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SiteProvider } from "./context/SiteContext";
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root 挂载点");

createRoot(container).render(
  <StrictMode>
    <SiteProvider>
      <App />
    </SiteProvider>
  </StrictMode>,
);
