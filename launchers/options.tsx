import React from "react"
import ReactDOM from "react-dom/client"

import Dashboard from "../tabs/dashboard"

function OptionsPage() {
  return <Dashboard />
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>
)
