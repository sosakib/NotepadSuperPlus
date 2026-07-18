import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";
import { markStartupPhase } from "./perf.ts";

markStartupPhase("script-eval");

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

markStartupPhase("react-mounted");
