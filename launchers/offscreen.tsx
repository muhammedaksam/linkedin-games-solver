import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"

interface PreprocessRequest {
  action: "preprocess-image"
  data: {
    dataUrl: string
    cropRect: {
      x: number
      y: number
      width: number
      height: number
    }
    targetWidth?: number
    targetHeight?: number
  }
}

interface PreprocessResponse {
  success: boolean
  dataUrl?: string
  error?: string
}

export function OffscreenPage() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof chrome === "undefined") return

    const listener = (
      message: { action: string; data?: PreprocessRequest["data"] },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: PreprocessResponse) => void
    ) => {
      if (message.action !== "preprocess-image" || !message.data) {
        return false
      }

      const { dataUrl, cropRect, targetWidth, targetHeight } = message.data
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const width = targetWidth || cropRect.width
          const height = targetHeight || cropRect.height

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            sendResponse({
              success: false,
              error: "Failed to get canvas 2d context."
            })
            return
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          ctx.drawImage(
            img,
            cropRect.x,
            cropRect.y,
            cropRect.width,
            cropRect.height,
            0,
            0,
            width,
            height
          )

          const optimizedUrl = canvas.toDataURL("image/jpeg", 0.85)
          sendResponse({ success: true, dataUrl: optimizedUrl })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          sendResponse({ success: false, error: errMsg })
        }
      }

      img.onerror = () => {
        sendResponse({
          success: false,
          error: "Failed to load screenshot data into image buffer."
        })
      }

      img.src = dataUrl
      return true
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  return null
}

ReactDOM.createRoot(document.createElement("div")).render(
  <React.StrictMode>
    <OffscreenPage />
  </React.StrictMode>
)
