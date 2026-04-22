import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../src/app/app-shell.css";
import { PopupApp } from "../../src/app/popup/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);
