import { googleAnalytics4 } from "@wxt-dev/analytics/providers/google-analytics-4"
import { defineAppConfig } from "wxt/utils/define-app-config"
import { storage } from "wxt/utils/storage"

export default defineAppConfig({
  analytics: {
    debug: true,
    enabled: storage.defineItem("sync:telemetryEnabled", {
      fallback: true
    }),
    providers: [
      googleAnalytics4({
        apiSecret: import.meta.env.WXT_GA_API_SECRET,
        measurementId: import.meta.env.WXT_GA_MEASUREMENT_ID
      })
    ]
  }
})
