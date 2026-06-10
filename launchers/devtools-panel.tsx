import React from "react"
import ReactDOM from "react-dom/client"

import { initLocale } from "../lib/i18n"
import DevToolsPanel from "../tabs/devtools-panel"

await initLocale()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DevToolsPanel />
  </React.StrictMode>
)
