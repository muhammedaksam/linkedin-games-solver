import { i18n } from "#i18n"
import iconPath from "url:~assets/icon.svg"

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
