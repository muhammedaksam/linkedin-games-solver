import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

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

  // Backward compatibility migration: if provider is gemini and aiApiKey is empty, copy geminiApiKey
  let apiKey = (await storage.get("aiApiKey")) || ""
  if (!apiKey && provider === "gemini") {
    const legacyKey = await storage.get("geminiApiKey")
    if (legacyKey) {
      apiKey = legacyKey
      await storage.set("aiApiKey", legacyKey)
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
  if (
    typeof window !== "undefined" &&
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.sendMessage
  ) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "askAI", prompt, jsonMode },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          if (response?.success) {
            resolve(response.text)
          } else {
            reject(
              new Error(
                response?.error ||
                  "AI call from Background SW returned no response."
              )
            )
          }
        }
      )
    })
  }

  const config = await getAIConfig()
  const { aiProvider, aiModel, aiApiKey, aiCustomEndpoint } = config

  // Custom Ollama / Local endpoints don't necessarily require an API key
  if (!aiApiKey && aiProvider !== "custom") {
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
