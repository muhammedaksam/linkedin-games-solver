/// <reference types="dom-chromium-ai" />
import { sendToBackground } from "@plasmohq/messaging"

/**
 * Converts a data URL to an Image Bitmap safely for AI ingestion.
 */
async function dataUrlToImageBitmap(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

/**
 * Helper to compute the exact bounding box of the active game board scaled by DPR.
 */
function getBoardCropRect() {
  if (typeof document === "undefined" || typeof window === "undefined")
    return undefined

  const selectors = [
    '[data-testid="interactive-grid"]',
    ".game-board",
    ".pinpoint__board",
    ".crossclimb__grid",
    '[data-sudoku-grid="true"]',
    '[data-testid^="patches-"]',
    "main"
  ]

  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      return {
        x: Math.round(rect.left * dpr),
        y: Math.round(rect.top * dpr),
        width: Math.round(rect.width * dpr),
        height: Math.round(rect.height * dpr)
      }
    }
  }
  return undefined
}

/**
 * Helper to capture the current active board visually and prompt Gemini Multimodal Nano.
 */
export async function solveWithMultimodalAI(
  promptText: string
): Promise<string> {
  const cropRect = getBoardCropRect()

  // 1. Capture the tab screen visually using the background service worker
  const captureRes = await new Promise<{
    success: boolean
    dataUrl?: string
    error?: string
  }>((resolve) => {
    sendToBackground<
      unknown,
      { success: boolean; dataUrl?: string; error?: string }
    >({
      name: "captureTab",
      body: {
        cropRect,
        targetWidth: 512,
        targetHeight: 512
      }
    })
      .then((res) => {
        resolve(
          res || {
            success: false,
            error: "No response from background worker."
          }
        )
      })
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        resolve({ success: false, error: errMsg })
      })
  })

  if (!captureRes.success || !captureRes.dataUrl) {
    throw new Error(
      `Screenshot capture failed: ${captureRes.error || "Unknown error"}`
    )
  }

  // 2. Convert JPEG data URL to Image Bitmap
  const imageBitmap = await dataUrlToImageBitmap(captureRes.dataUrl)

  // 3. Detect Chrome's native Multimodal AI session creator
  let aiNamespace: typeof LanguageModel | null = null
  const selfObj =
    typeof self !== "undefined"
      ? (self as unknown as { ai?: { languageModel?: typeof LanguageModel } })
      : null
  const windowObj =
    typeof window !== "undefined"
      ? (window as unknown as { ai?: { languageModel?: typeof LanguageModel } })
      : null

  if (selfObj?.ai?.languageModel) {
    aiNamespace = selfObj.ai.languageModel
  } else if (windowObj?.ai?.languageModel) {
    aiNamespace = windowObj.ai.languageModel
  }

  if (!aiNamespace) {
    throw new Error(
      "Chrome Built-in Multimodal AI is not available. Please verify your optimization guides flag settings."
    )
  }

  // Verify availability
  const availability = await aiNamespace.availability()
  if (availability === "unavailable") {
    throw new Error(
      "Chrome Built-in Multimodal AI model is unavailable on this device."
    )
  }

  // 4. Create local multimodal Gemini Nano session
  // In Chrome Canary, we instantiate Gemini Nano with expected input types
  const session = await aiNamespace.create({
    expectedInputs: [{ type: "image" }]
  })

  try {
    // 5. Query Gemini Nano session with both image and prompt context
    console.log("[Multimodal AI] Initiating on-device visual board analysis...")

    // For Chrome's Prompt/LanguageModel API, multimodal inputs are fed as structured lists
    const promptInputs = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, value: promptText },
          { type: "image" as const, value: imageBitmap }
        ]
      }
    ]

    const response = await session.prompt(promptInputs)
    if (!response) {
      throw new Error("Received empty response from multimodal Nano session.")
    }

    return response
  } finally {
    session.destroy()
  }
}
