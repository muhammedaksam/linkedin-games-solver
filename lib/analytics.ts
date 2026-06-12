import { createAnalytics } from "@wxt-dev/analytics"
import { googleAnalytics4 } from "@wxt-dev/analytics/providers/google-analytics-4"
import { storage } from "wxt/utils/storage"

import { analytics as rawAnalytics } from "#analytics"

// Check if we are in the extension environment before defining storage item and instantiating
const isExtensionEnv = typeof chrome !== "undefined" && !!chrome?.runtime?.id

if (isExtensionEnv) {
  try {
    createAnalytics({
      debug: process.env.NODE_ENV === "development",
      enabled: storage.defineItem<boolean>("sync:telemetryEnabled", {
        fallback: true
      }),
      providers: [
        googleAnalytics4({
          apiSecret: import.meta.env.WXT_GA_API_SECRET,
          measurementId: import.meta.env.WXT_GA_MEASUREMENT_ID
        })
      ]
    })
  } catch (err) {
    console.error("[Analytics] Failed to initialize rawAnalytics:", err)
  }
}

export const analytics = {
  async track(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!rawAnalytics) return
    try {
      await rawAnalytics.track(
        event,
        properties as Record<string, string | undefined>
      )
    } catch (err: unknown) {
      console.warn(`[Analytics] Track error for event "${event}":`, err)
    }
  }
}
