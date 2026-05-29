import type { PlasmoMessaging } from "@plasmohq/messaging"

const OFFSCREEN_PATH = "tabs/offscreen.html"

export interface CaptureTabRequest {
  cropRect?: {
    x: number
    y: number
    width: number
    height: number
  }
  targetWidth?: number
  targetHeight?: number
}

const handler: PlasmoMessaging.MessageHandler<CaptureTabRequest> = async (
  req,
  res
) => {
  const windowId = req.sender?.tab?.windowId || chrome.windows.WINDOW_ID_CURRENT
  const { cropRect, targetWidth, targetHeight } = req.body || {}

  try {
    // 1. Capture the raw viewport screenshot
    const rawUrl = await new Promise<string>((resolve, reject) => {
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

    // If no cropRect is specified, return the full raw viewport screenshot directly
    if (!cropRect) {
      res.send({ success: true, dataUrl: rawUrl })
      return
    }

    // 2. Open the offscreen document if not already open
    const swSelf = self as unknown as {
      clients: {
        matchAll: () => Promise<Array<{ url: string }>>
      }
    }
    const matchedClients = await swSelf.clients.matchAll()
    let hasDocument = false
    for (const client of matchedClients) {
      if (client.url.endsWith(OFFSCREEN_PATH)) {
        hasDocument = true
        break
      }
    }

    if (!hasDocument) {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: [chrome.offscreen.Reason.BLOBS],
        justification:
          "Crop and compress puzzle screenshots for multimodal AI processing"
      })
    }

    // 3. Process the image inside the offscreen canvas context
    const processedResponse = await new Promise<{
      success: boolean
      dataUrl?: string
      error?: string
    }>((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "preprocess-image",
          data: {
            dataUrl: rawUrl,
            cropRect,
            targetWidth,
            targetHeight
          }
        },
        (responseVal) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            })
          } else {
            resolve(
              responseVal || {
                success: false,
                error: "Empty offscreen response"
              }
            )
          }
        }
      )
    })

    // 4. Shut down the offscreen document immediately to conserve system memory
    try {
      await chrome.offscreen.closeDocument()
    } catch (closeErr) {
      console.warn("[Offscreen] Failed to close document:", closeErr)
    }

    // 5. Check if preprocessing succeeded, fallback to raw screenshot if it failed
    if (processedResponse.success && processedResponse.dataUrl) {
      res.send({ success: true, dataUrl: processedResponse.dataUrl })
    } else {
      console.warn(
        "[CaptureTab] Offscreen preprocessing failed, falling back to raw screenshot:",
        processedResponse.error
      )
      res.send({ success: true, dataUrl: rawUrl })
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    res.send({ success: false, error: errMsg })
  }
}

export default handler
