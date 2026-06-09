import { i18n } from "#i18n"

if (
  typeof chrome !== "undefined" &&
  chrome.devtools &&
  chrome.devtools.panels
) {
  try {
    chrome.devtools.panels.create(
      `${i18n.t("extensionName")} 🧩`,
      "icon.png",
      "devtools-panel.html",
      (_panel) => {
        console.log("DevTools panel successfully registered!")
      }
    )
  } catch {
    // Catch any fake-browser throws during WXT static imports
  }
}
export {}
