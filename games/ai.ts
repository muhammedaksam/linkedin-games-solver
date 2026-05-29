/// <reference types="dom-chromium-ai" />
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import { secureStorage } from "~lib/storage"

const storage = new Storage({ area: "local" })

export interface AIConfig {
  aiProvider: string
  aiModel: string
  aiApiKey: string
  aiCustomEndpoint: string
}

export async function getAIConfig(): Promise<AIConfig> {
  const provider = (await storage.get("aiProvider")) || "gemini"
  const model = (await storage.get("aiModel")) || "gemini-2.5-flash"
  const customEndpoint = (await storage.get("aiCustomEndpoint")) || ""

  // Secure storage for AI key retrieval
  let apiKey = (await secureStorage.get<string>("aiApiKey")) || ""

  // Backward compatibility migration of unencrypted keys
  if (!apiKey) {
    const unencryptedKey = await storage.get<string>("aiApiKey")
    if (unencryptedKey) {
      apiKey = unencryptedKey
      await secureStorage.set("aiApiKey", unencryptedKey)
      await storage.remove("aiApiKey") // Clean up standard local storage
    } else {
      const legacyKey = await storage.get<string>("geminiApiKey")
      if (legacyKey) {
        apiKey = legacyKey
        await secureStorage.set("aiApiKey", legacyKey)
        await storage.remove("geminiApiKey") // Clean up standard local storage
      }
    }
  }

  return {
    aiProvider: provider,
    aiModel: model,
    aiApiKey: apiKey,
    aiCustomEndpoint: customEndpoint
  }
}

export async function askAI(prompt: string, jsonMode = false): Promise<string> {
  // If running inside the Content Script context (which has window/document defined),
  // route the API request safely through the Background SW to bypass LinkedIn's strict CSP.
  if (typeof window !== "undefined") {
    try {
      const response = await sendToBackground({
        name: "askAI",
        body: { prompt, jsonMode }
      })
      if (response?.success) {
        return response.text
      } else {
        throw new Error(
          response?.error || "AI call from Background SW returned no response."
        )
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      throw new Error(errMsg, { cause: err })
    }
  }

  const config = await getAIConfig()
  const { aiProvider, aiModel, aiApiKey, aiCustomEndpoint } = config

  // Custom Ollama / Local endpoints and Chrome Built-in AI don't require an API key
  if (!aiApiKey && aiProvider !== "custom" && aiProvider !== "chrome-builtin") {
    throw new Error(
      `AI API Key is not configured for ${aiProvider.toUpperCase()}. Please open the extension settings to set your key.`
    )
  }

  switch (aiProvider) {
    case "gemini":
      return callGemini(aiModel, aiApiKey, prompt, jsonMode)
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com",
        aiModel,
        aiApiKey,
        prompt,
        jsonMode
      )
    case "deepseek":
      return callOpenAICompatible(
        "https://api.deepseek.com",
        aiModel,
        aiApiKey,
        prompt,
        jsonMode
      )
    case "anthropic":
      return callAnthropic(aiModel, aiApiKey, prompt)
    case "chrome-builtin":
      return callChromePrompt(prompt, jsonMode)
    case "custom":
      return callOpenAICompatible(
        aiCustomEndpoint,
        aiModel,
        aiApiKey,
        prompt,
        jsonMode
      )
    default:
      throw new Error(`Unsupported AI Provider: ${aiProvider}`)
  }
}

// Backward compatible alias
export const askGemini = askAI

async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
  jsonMode: boolean
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode
        ? {
            responseMimeType: "application/json"
          }
        : undefined
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    let parsedErr: string
    try {
      const errJson = JSON.parse(errText)
      parsedErr = errJson.error?.message || errText
    } catch {
      parsedErr = errText
    }
    throw new Error(`Gemini API Error: ${parsedErr}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error("No response text received from Gemini API.")
  }

  return text
}

async function callOpenAICompatible(
  endpoint: string,
  model: string,
  apiKey: string,
  prompt: string,
  jsonMode: boolean
): Promise<string> {
  if (!endpoint) {
    throw new Error("AI custom endpoint is not configured in settings.")
  }

  let targetUrl = endpoint.trim().replace(/\/$/, "")
  if (!targetUrl.includes("/v1") && !targetUrl.includes("/chat/completions")) {
    targetUrl += "/v1/chat/completions"
  } else if (targetUrl.endsWith("/v1")) {
    targetUrl += "/chat/completions"
  } else if (!targetUrl.endsWith("/chat/completions")) {
    targetUrl += "/chat/completions"
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    let parsedErr: string
    try {
      const errJson = JSON.parse(errText)
      parsedErr = errJson.error?.message || errText
    } catch {
      parsedErr = errText
    }
    throw new Error(`AI API Error (${response.status}): ${parsedErr}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error("No response content received from OpenAI-compatible API.")
  }

  return text
}

async function callAnthropic(
  model: string,
  apiKey: string,
  prompt: string
): Promise<string> {
  const url = "https://api.anthropic.com/v1/messages"
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "dangerously-allow-developer-user-agent": "true"
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    let parsedErr: string
    try {
      const errJson = JSON.parse(errText)
      parsedErr = errJson.error?.message || errText
    } catch {
      parsedErr = errText
    }
    throw new Error(`Anthropic API Error: ${parsedErr}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text
  if (!text) {
    throw new Error("No response text received from Anthropic API.")
  }

  return text
}

async function callChromePrompt(
  prompt: string,
  jsonMode: boolean
): Promise<string> {
  let aiNamespace: typeof LanguageModel | null = null

  interface AIWindowFields {
    LanguageModel?: typeof LanguageModel
    ai?: { languageModel?: typeof LanguageModel }
  }

  const selfObj =
    typeof self !== "undefined" ? (self as unknown as AIWindowFields) : null
  const windowObj =
    typeof window !== "undefined" ? (window as unknown as AIWindowFields) : null
  const chromeObj =
    typeof chrome !== "undefined"
      ? (chrome as unknown as {
          aiOriginTrial?: { languageModel?: typeof LanguageModel }
        })
      : null

  if (selfObj?.LanguageModel) {
    aiNamespace = selfObj.LanguageModel
  } else if (windowObj?.LanguageModel) {
    aiNamespace = windowObj.LanguageModel
  } else if (chromeObj?.aiOriginTrial?.languageModel) {
    aiNamespace = chromeObj.aiOriginTrial.languageModel
  } else if (selfObj?.ai?.languageModel) {
    aiNamespace = selfObj.ai.languageModel
  } else if (windowObj?.ai?.languageModel) {
    aiNamespace = windowObj.ai.languageModel
  }

  if (!aiNamespace) {
    throw new Error(
      "Chrome Built-in AI (Prompt API) is not available. Please verify that:\n" +
        "1. You are running Chrome 138+ (or Chrome 148+ on the web).\n" +
        "2. You have enabled '#prompt-api-for-gemini-nano' and '#optimization-guide-on-device-model' in chrome://flags.\n" +
        "3. You have visited chrome://components and verified that 'Optimization Guide On Device Model' is updated/downloaded."
    )
  }

  const availability = await aiNamespace.availability()
  if (availability === "unavailable") {
    throw new Error(
      "Chrome Built-in AI is disabled or unsupported on this device. Please check that you meet the hardware requirements:\n" +
        "- Windows 10/11, macOS 13+, Linux, or Chromebook Plus.\n" +
        "- At least 16 GB of RAM and 4 CPU cores (or a GPU with > 4 GB VRAM).\n" +
        "- At least 22 GB of free disk space."
    )
  }

  try {
    const session = await aiNamespace.create()
    try {
      let response: string
      if (jsonMode) {
        // Prompt API supports structured JSON outputs via responseConstraint
        const schema = { type: "object" }
        try {
          response = await session.prompt(prompt, {
            responseConstraint: schema
          })
        } catch (err) {
          console.warn(
            "Failed to prompt with responseConstraint, falling back...",
            err
          )
          response = await session.prompt(prompt)
        }
      } else {
        response = await session.prompt(prompt)
      }
      return response
    } finally {
      session.destroy()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Chrome Built-in AI Error: ${msg}. If this is your first time using it, Chrome may still be downloading the Gemini Nano model in the background.`,
      { cause: err }
    )
  }
}
