import iconPath from "url:~assets/icon.svg"

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
  chrome.devtools.panels.create(
    i18n.t("extensionName") + " 🧩",
    iconPath,
    "tabs/devtools-panel.html",
    (_panel) => {
      console.log("DevTools panel successfully registered!")
    }
  )
}
