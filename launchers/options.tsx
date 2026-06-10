import React from "react"
import ReactDOM from "react-dom/client"

import { initLocale } from "../lib/i18n"
import Dashboard from "../tabs/dashboard"

export function OptionsPage() {
  return <Dashboard />
}

await initLocale()

const rootEl = document.getElementById("root")
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <OptionsPage />
    </React.StrictMode>
  )
}
