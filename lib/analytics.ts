/* eslint-disable @typescript-eslint/no-explicit-any */
import { syncStorage } from "./storage"

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect"
const gtagId = process.env.PLASMO_PUBLIC_GTAG_ID
const secretApiKey = process.env.PLASMO_PUBLIC_SECRET_API_KEY

const SESSION_EXPIRATION_IN_MIN = 30
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100

// Helper to generate a random client ID matching typical GA formats
function generateRandomClientId(): string {
  if (typeof self !== "undefined" && self.crypto?.randomUUID) {
    return self.crypto.randomUUID()
  }
  const digits = "123456789".split("")
  let result = ""
  for (let i = 0; i < 10; i++) {
    result += digits[Math.floor(Math.random() * 9)]
  }
  const unixTimestampSeconds = Math.floor(Date.now() / 1000)
  return `${result}.${unixTimestampSeconds}`
}

/**
 * Returns the client id, or creates a new one if one doesn't exist.
 * Stores client id in sync storage to keep the same client id across user's devices.
 */
async function getOrCreateClientId(): Promise<string> {
  let clientId = await syncStorage.get<string>("clientId")
  if (!clientId) {
    clientId = generateRandomClientId()
    await syncStorage.set("clientId", clientId)
  }
  return clientId
}

/**
 * Returns the current session id, or creates a new one if one doesn't exist or
 * the previous one has expired.
 */
async function getOrCreateSessionId(): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.storage?.session) {
    return Date.now().toString()
  }

  try {
    let { sessionData } = await chrome.storage.session.get("sessionData")
    const currentTimeInMs = Date.now()

    if (sessionData && sessionData.timestamp) {
      const durationInMin =
        (currentTimeInMs - Number(sessionData.timestamp)) / 60000
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null
      } else {
        sessionData.timestamp = currentTimeInMs
        await chrome.storage.session.set({ sessionData })
      }
    }

    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs
      }
      await chrome.storage.session.set({ sessionData })
    }

    return sessionData.session_id
  } catch (err) {
    console.warn("[Analytics] Session retrieval bypassed:", err)
    return Date.now().toString()
  }
}

/**
 * Direct function to make HTTP request to GA4 Measurement Protocol endpoint.
 * This runs securely in the Background Service Worker context.
 */
export async function trackEventDirect(
  name: string,
  params: Record<string, any> = {}
) {
  // Check if environment variables are set
  if (!gtagId || !secretApiKey) {
    console.warn(
      `[Analytics] Missing PLASMO_PUBLIC_GTAG_ID or PLASMO_PUBLIC_SECRET_API_KEY. Skipping event "${name}".`
    )
    return
  }

  // Verify telemetry consent from sync storage (defaults to true)
  const telemetryEnabled =
    (await syncStorage.get<boolean>("telemetryEnabled")) ?? true
  if (!telemetryEnabled) {
    console.log(
      `[Analytics] Telemetry opt-out active. Skipping event "${name}".`
    )
    return
  }

  // Inject session details
  if (!params.session_id) {
    params.session_id = await getOrCreateSessionId()
  }
  if (!params.engagement_time_msec) {
    params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC
  }

  try {
    const clientId = await getOrCreateClientId()
    const url = `${GA_ENDPOINT}?measurement_id=${gtagId}&api_secret=${secretApiKey}`

    console.log(`[Analytics] Firing event "${name}" with params:`, {
      name,
      params,
      clientId
    })

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name,
            params
          }
        ]
      })
    })

    console.log(`[Analytics] GA4 server response status: ${response.status} (${response.statusText})`)
  } catch (e) {
    console.error("[Analytics] GA4 event dispatch exception:", e)
  }
}

/**
 * Universal tracking function that can be safely called from any context
 * (Popup, Sidepanel, Content Scripts, or Background SW).
 */
export async function trackEvent(
  name: string,
  params: Record<string, any> = {}
) {
  if (typeof window !== "undefined") {
    // We are in UI context (Popup/Sidepanel) or Content Script, delegate via chrome messages
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime
        .sendMessage({
          action: "trackEvent",
          event: { name, params }
        })
        .catch(() => {
          // Suppress message channel disconnect errors if background SW is inactive
        })
    }
  } else {
    // We are in background service worker context, run directly
    await trackEventDirect(name, params)
  }
}
