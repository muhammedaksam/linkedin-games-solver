import { analytics as rawAnalytics } from "#analytics"

export const analytics = {
  async track(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
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
