import type { PlasmoMessaging } from "@plasmohq/messaging"

import { trackEventDirect } from "~lib/analytics"

export type RequestBody = {
  name: string
  params?: Record<string, unknown>
}

const handler: PlasmoMessaging.MessageHandler<RequestBody> = async (
  req,
  res
) => {
  const { name, params } = req.body || {}
  if (name) {
    try {
      await trackEventDirect(name, params)
      res.send({ success: true })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      res.send({ success: false, error: errMsg })
    }
  } else {
    res.send({ success: false, error: "Event name is missing" })
  }
}

export default handler
