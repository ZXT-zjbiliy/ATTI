import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PopupApp } from "../../src/app/popup/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);
