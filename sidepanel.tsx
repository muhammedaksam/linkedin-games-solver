import { useEffect } from "react"

import "./popup.css"

import { SolverShell } from "~/components/SolverShell"

function IndexSidePanel() {
  useEffect(() => {
    document.body.classList.remove("is-popup")
    document.body.classList.add("is-sidepanel")
  }, [])

  return <SolverShell isSidePanel={true} />
}

export default IndexSidePanel
