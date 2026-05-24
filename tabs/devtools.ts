if (typeof chrome !== "undefined" && chrome.devtools && chrome.devtools.panels) {
  chrome.devtools.panels.create(
    "LinkedIn Games Solver",
    "",
    "tabs/devtools-panel.html",
    (panel) => {
      console.log("DevTools panel successfully registered!")
    }
  )
}
