import { getMessage, initLocale } from "../lib/i18n"

const i18n = {
  t: getMessage
}

await initLocale()

if (
  typeof chrome !== "undefined" &&
  chrome.devtools &&
  chrome.devtools.panels
) {
  try {
    chrome.devtools.panels.create(
      `${i18n.t("extensionName")} 🧩`,
      "assets/icon-32.png",
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
