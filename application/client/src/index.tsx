import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { AppContainer } from "@web-speed-hackathon-2026/client/src/containers/AppContainer";

const root = document.getElementById("app")!;
const app = (
  <BrowserRouter>
    <AppContainer />
  </BrowserRouter>
);

// Use hydrateRoot when SSR HTML is available to reuse server-rendered content.
// Fall back to createRoot if hydration fails or no SSR data exists.
if ((window as any).__SSR_DATA__ && root.children.length > 0) {
  try {
    hydrateRoot(root, app, {
      onRecoverableError: () => {
        // Suppress hydration mismatch warnings in production
      },
    });
  } catch {
    // Hydration failed completely - fall back to client render
    root.innerHTML = "";
    createRoot(root).render(app);
  }
} else {
  createRoot(root).render(app);
}
