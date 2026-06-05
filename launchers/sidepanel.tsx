import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"

import "../popup.css"

import { SolverShell } from "../components/SolverShell"

export function IndexSidePanel() {
  useEffect(() => {
    document.body.classList.remove("is-popup")
    document.body.classList.add("is-sidepanel")
  }, [])

  return <SolverShell isSidePanel={true} />
}

const rootEl = document.getElementById("root")
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <IndexSidePanel />
    </React.StrictMode>
  )
}
