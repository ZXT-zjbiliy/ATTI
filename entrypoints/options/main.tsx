import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { OptionsApp } from "../../src/app/options/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);
