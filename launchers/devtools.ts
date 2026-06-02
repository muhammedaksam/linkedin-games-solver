if (
  typeof chrome !== "undefined" &&
  chrome.devtools &&
  chrome.devtools.panels
) {
  try {
    let extensionName = "LinkedIn Games Solver"
    try {
      if (chrome.i18n && typeof chrome.i18n.getMessage === "function") {
        extensionName = chrome.i18n.getMessage("extensionName") || extensionName
      }
    } catch (err) {
      // Ignore build-time mock exceptions
    }

    chrome.devtools.panels.create(
      extensionName + " 🧩",
      "icon.png",
      "devtools-panel.html",
      (_panel) => {
        console.log("DevTools panel successfully registered!")
      }
    )
  } catch (err) {
    // Catch any fake-browser throws during WXT static imports
  }
}
export {}
