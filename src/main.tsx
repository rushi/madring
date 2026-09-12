import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/tokens.generated.css";
import "./styles/base.css";
import "./styles/map.css";
import "./styles/detail.css";
import "./styles/panel.css";

const container = document.querySelector("#root");
if (!container) {
    throw new Error("#root is missing from index.html");
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
