import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"

import "../popup.css"

import { SolverShell } from "../components/SolverShell"

function IndexSidePanel() {
  useEffect(() => {
    document.body.classList.remove("is-popup")
    document.body.classList.add("is-sidepanel")
  }, [])

  return <SolverShell isSidePanel={true} />
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IndexSidePanel />
  </React.StrictMode>
)
