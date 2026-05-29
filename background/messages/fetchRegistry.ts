import type { PlasmoMessaging } from "@plasmohq/messaging"

import { trackEventDirect } from "~lib/analytics"

export type RequestBody = {
  game: string
}

const handler: PlasmoMessaging.MessageHandler<RequestBody> = async (
  req,
  res
) => {
  const { game } = req.body || {}
  if (!game) {
    res.send({ success: false, error: "Game parameter is missing" })
    return
  }

  try {
    await trackEventDirect("fetch_registry", { game })
    const registryUrl = `https://raw.githubusercontent.com/muhammedaksam/linkedin-games-solver/main/registry/${game}.json`

    const response = await fetch(registryUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    res.send({ success: true, data })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    res.send({ success: false, error: errMsg })
  }
}

export default handler
