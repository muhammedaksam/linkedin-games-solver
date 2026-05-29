import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const windowId = req.sender?.tab?.windowId || chrome.windows.WINDOW_ID_CURRENT

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: "jpeg", quality: 85 },
        (capturedUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else if (!capturedUrl) {
            reject(new Error("Captured URL is empty"))
          } else {
            resolve(capturedUrl)
          }
        }
      )
    })
    res.send({ success: true, dataUrl })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    res.send({ success: false, error: errMsg })
  }
}

export default handler
