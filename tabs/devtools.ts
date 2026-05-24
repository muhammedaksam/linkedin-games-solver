if (typeof chrome !== "undefined" && chrome.devtools && chrome.devtools.panels) {
  chrome.devtools.panels.create(
    "LinkedIn Games Solver",
    "assets/icon-32.png",
    "tabs/devtools-panel.html",
    (panel) => {
      console.log("DevTools panel successfully registered!")
    }
  )
}
