import { analytics } from "#analytics"

import type { PlasmoMessaging } from "@plasmohq/messaging"

import { askAI } from "~games/ai"

export type RequestBody = {
  prompt: string
  jsonMode?: boolean
}

const handler: PlasmoMessaging.MessageHandler<RequestBody> = async (
  req,
  res
) => {
  const { prompt, jsonMode } = req.body || {}
  if (!prompt) {
    res.send({ success: false, error: "Prompt parameter is missing" })
    return
  }

  try {
    await analytics.track("ask_ai", { promptLength: String(prompt.length) })
    const text = await askAI(prompt, jsonMode)
    res.send({ success: true, text })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    res.send({ success: false, error: errMsg })
  }
}

export default handler
