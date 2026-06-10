import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"

import "~tabs/dashboard.css"

import { SolverShell } from "../components/SolverShell"
import { initLocale } from "../lib/i18n"

export function IndexPopup() {
  useEffect(() => {
    document.body.classList.remove("is-sidepanel")
    document.body.classList.add("is-popup")
  }, [])

  return <SolverShell isSidePanel={false} />
}

await initLocale()

const rootEl = document.getElementById("root")
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <IndexPopup />
    </React.StrictMode>
  )
}
