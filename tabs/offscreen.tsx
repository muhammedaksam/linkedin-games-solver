import { useEffect } from "react"

export interface PreprocessRequest {
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

export interface PreprocessResponse {
  success: boolean
  dataUrl?: string
  error?: string
}

function OffscreenPage() {
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
          // If no specific target size is given, default to crop size to preserve original detail
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

          // Disable image smoothing if scaling up to prevent blur, keep it enabled when scaling down for anti-aliasing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Draw the cropped portion of the image onto the canvas at target scale dimensions
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

          // Export as compressed JPEG to dramatically decrease packet sizes
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
      return true // Keep communication channel open for async response
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  return null
}

export default OffscreenPage
