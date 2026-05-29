import type { PlasmoMessaging } from "@plasmohq/messaging"

import { updateActionBadge } from "../../background"

export type RequestBody = {
  status: "solving" | "idle"
}

const handler: PlasmoMessaging.MessageHandler<RequestBody> = async (
  req,
  res
) => {
  const { status } = req.body || {}
  const tabId = req.sender?.tab?.id

  try {
    await updateActionBadge(undefined, status, tabId)
    res.send({ success: true })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    res.send({ success: false, error: errMsg })
  }
}

export default handler
