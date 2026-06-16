import { defineExtensionMessaging } from "@webext-core/messaging"

export interface MessageProtocolMap {
  askAI(data: { prompt: string; jsonMode?: boolean }): {
    success: boolean
    text?: string
    error?: string
  }

  captureTab(data: {
    cropRect?: {
      x: number
      y: number
      width: number
      height: number
    }
    targetWidth?: number
    targetHeight?: number
  }): { success: boolean; dataUrl?: string; error?: string }

  fetchRegistry(data: { game: "pinpoint" | "crossclimb" | "wend" }): {
    success: boolean
    data?: unknown
    error?: string
  }

  solverStatus(data: { status: "solving" | "idle" }): {
    success: boolean
    error?: string
  }
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<MessageProtocolMap>()
