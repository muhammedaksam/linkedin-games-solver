import iconPath from "url:~assets/icon.svg"

if (
  typeof chrome !== "undefined" &&
  chrome.devtools &&
  chrome.devtools.panels
) {
  chrome.devtools.panels.create(
    (chrome.i18n.getMessage("extensionName") || "LinkedIn Games Solver") +
      " 🧩",
    iconPath,
    "tabs/devtools-panel.html",
    (_panel) => {
      console.log("DevTools panel successfully registered!")
    }
  )
}
