import { useEffect } from "react"

import "~popup.css"

import { SolverShell } from "~components/SolverShell"

function IndexPopup() {
  useEffect(() => {
    document.body.classList.remove("is-sidepanel")
    document.body.classList.add("is-popup")
  }, [])

  return <SolverShell isSidePanel={false} />
}

export default IndexPopup
