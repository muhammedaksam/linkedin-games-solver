import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"

import "../popup.css"

import { SolverShell } from "../components/SolverShell"

function IndexPopup() {
  useEffect(() => {
    document.body.classList.remove("is-sidepanel")
    document.body.classList.add("is-popup")
  }, [])

  return <SolverShell isSidePanel={false} />
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IndexPopup />
  </React.StrictMode>
)
