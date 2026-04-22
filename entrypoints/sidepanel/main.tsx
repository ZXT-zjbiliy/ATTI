import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SidePanelApp } from "../../src/app/sidepanel/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SidePanelApp />
  </StrictMode>
);
