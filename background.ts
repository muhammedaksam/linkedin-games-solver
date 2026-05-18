import { askAI } from "~games/ai"

console.log("[LinkedIn Games Solver] Background service worker initialized.")

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "askAI") {
    askAI(message.prompt, message.jsonMode)
      .then((text) => {
        sendResponse({ success: true, text })
      })
      .catch((error) => {
        const errMsg = error instanceof Error ? error.message : String(error)
        sendResponse({ success: false, error: errMsg })
      })
    return true // Keep channel open for async response
  }
})
