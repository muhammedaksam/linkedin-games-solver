import { sendToBackground } from "@plasmohq/messaging"

import { getLocalDateString, getPuzzleNumber } from "~lib/utils"

export interface WendPuzzle {
  words: string[]
}

export interface PinpointPuzzle {
  category: string
  clues: string[]
}

export interface CrossclimbPuzzle {
  clues: string[]
  answers: string[]
  topWord: string
  bottomWord: string
}

export async function fetchRegistry(
  game: "pinpoint"
): Promise<Record<string, PinpointPuzzle>>
export async function fetchRegistry(
  game: "crossclimb"
): Promise<Record<string, CrossclimbPuzzle>>
export async function fetchRegistry(
  game: "wend"
): Promise<Record<string, WendPuzzle>>
export async function fetchRegistry(
  game: "pinpoint" | "crossclimb" | "wend"
): Promise<Record<string, PinpointPuzzle | CrossclimbPuzzle | WendPuzzle>> {
  if (
    typeof window !== "undefined" &&
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.id
  ) {
    try {
      const response = await sendToBackground({
        name: "fetchRegistry",
        body: { game }
      })
      if (response?.success) {
        return response.data
      } else {
        throw new Error(
          response?.error ||
            "Registry fetch from Background SW returned no response."
        )
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      throw new Error(errMsg, { cause: err })
    }
  }

  // Fallback for tests / non-extension context
  const registryUrl = `https://raw.githubusercontent.com/muhammedaksam/linkedin-games-solver/main/registry/${game}.json`
  const res = await fetch(registryUrl)
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  return res.json()
}

export function findPinpointAnswer(
  registry: Record<string, PinpointPuzzle>,
  activeClues: string[]
): PinpointPuzzle | null {
  if (!registry || typeof registry !== "object") return null

  // 1. Try matching by Puzzle Number (e.g., "757")
  const puzzleNum = String(getPuzzleNumber("pinpoint"))
  if (registry[puzzleNum]) {
    console.log(
      `[Pinpoint Registry] Match found by puzzle number: #${puzzleNum}`
    )
    return registry[puzzleNum]
  }

  // 2. Try matching by date as a backward-compatible fallback (e.g., "2026-05-27")
  const today = getLocalDateString()
  if (registry[today]) {
    console.log(`[Pinpoint Registry] Match found by date: ${today}`)
    return registry[today]
  }

  // 3. Fallback matching by currently revealed clues
  if (activeClues.length === 0) return null
  const puzzles = Object.values(registry)
  const clueMatch = puzzles.find((p) => {
    return activeClues.every((activeClue) =>
      p.clues.some((c) => c.toLowerCase() === activeClue.toLowerCase())
    )
  })

  if (clueMatch) {
    console.log(`[Pinpoint Registry] Match found by active clues fallback!`)
    return clueMatch
  }

  return null
}

export function findWendAnswer(
  registry: Record<string, WendPuzzle>,
  _boardWords?: string[]
): WendPuzzle | null {
  if (!registry || typeof registry !== "object") return null

  // 1. Try matching by Puzzle Number
  const puzzleNum = String(getPuzzleNumber("wend"))
  if (registry[puzzleNum]) {
    console.log(`[Wend Registry] Match found by puzzle number: #${puzzleNum}`)
    return registry[puzzleNum]
  }

  // 2. Try matching by date as a backward-compatible fallback
  const today = getLocalDateString()
  if (registry[today]) {
    console.log(`[Wend Registry] Match found by date: ${today}`)
    return registry[today]
  }

  return null
}

export function findCrossclimbAnswer(
  registry: Record<string, CrossclimbPuzzle>,
  boardClues: string[]
): CrossclimbPuzzle | null {
  if (!registry || typeof registry !== "object") return null

  // 1. Try matching by Puzzle Number (e.g., "757")
  const puzzleNum = String(getPuzzleNumber("crossclimb"))
  if (registry[puzzleNum]) {
    console.log(
      `[Crossclimb Registry] Match found by puzzle number: #${puzzleNum}`
    )
    return registry[puzzleNum]
  }

  // 2. Try matching by date as a backward-compatible fallback (e.g., "2026-05-27")
  const today = getLocalDateString()
  if (registry[today]) {
    console.log(`[Crossclimb] Match found by date: ${today}`)
    return registry[today]
  }

  // 3. Fallback matching by exact case-insensitive board clues comparison
  if (boardClues.length === 0) return null
  const puzzles = Object.values(registry)
  const clueMatch = puzzles.find((p) => {
    return (
      p.clues.length === boardClues.length &&
      p.clues.every(
        (clue, idx) => clue.toLowerCase() === boardClues[idx].toLowerCase()
      )
    )
  })

  if (clueMatch) {
    console.log(`[Crossclimb] Match found by board clues fallback!`)
    return clueMatch
  }

  return null
}
