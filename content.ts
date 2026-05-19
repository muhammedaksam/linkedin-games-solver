import type { PlasmoCSConfig } from "plasmo"

import { detectActiveSolver } from "~games"
import { localStorage as storage } from "~lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/games/*"]
}

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

type SolveHistory = Record<string, Record<string, SolveRecord>>

console.log("[LinkedIn Games Solver] Content Script loaded.")

const pageLoadTime = Date.now()

// Generate local YYYY-MM-DD date key
function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Convert MM:SS or HH:MM:SS stopwatch string to seconds
function parseTimerToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(":").map(Number)
  if (parts.length === 2) {
    const [minutes, seconds] = parts
    if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
      return minutes * 60 + seconds
    }
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    if (
      !Number.isNaN(hours) &&
      !Number.isNaN(minutes) &&
      !Number.isNaN(seconds)
    ) {
      return hours * 3600 + minutes * 60 + seconds
    }
  }
  return 0
}

// Read the stopwatch timer directly from the native LinkedIn page or results page
function detectFinalSolveTime(): number | undefined {
  // Method 1: Active game screen timer
  const clockIcon = document.querySelector(
    'svg#clock-small, svg[data-test-icon="clock-small"], use[href="#clock-small"]'
  )
  if (clockIcon) {
    const parent = clockIcon.closest("div")
    if (parent) {
      const timerSpan = parent.querySelector(
        'span[role="text"], span[class*="timer"]'
      )
      if (timerSpan) {
        const text = timerSpan.textContent?.trim()
        if (text?.includes(":")) {
          const seconds = parseTimerToSeconds(text)
          if (seconds > 0) return seconds
        }
      }
    }
  }

  // Method 2: Results page leaderboard player card (for player "You")
  const leaderboardPlayers = document.querySelectorAll(
    ".pr-connections-leaderboard-player__container"
  )
  for (const player of Array.from(leaderboardPlayers)) {
    const textWrapper = player.querySelector(
      ".pr-connections-leaderboard-player__text-wrapper"
    )
    if (textWrapper?.textContent?.trim().toLowerCase().includes("you")) {
      const scoreEl = player.querySelector(
        ".pr-connections-leaderboard-player__score"
      )
      if (scoreEl) {
        const text = scoreEl.textContent?.trim()
        if (text?.includes(":")) {
          const seconds = parseTimerToSeconds(text)
          if (seconds > 0) return seconds
        }
      }
    }
  }

  // Method 3: Results page golden chiclet (carousel slide with solve time)
  const chiclets = document.querySelectorAll(".pr-golden-chiclet__text")
  for (const chiclet of Array.from(chiclets)) {
    const text = chiclet.textContent?.trim()
    if (text?.includes(":")) {
      const seconds = parseTimerToSeconds(text)
      if (seconds > 0) return seconds
    }
  }

  return undefined
}

// Save completion status to Chrome Storage
async function saveGameCompleted(gameId: string, durationSeconds?: number) {
  try {
    const dateKey = getLocalDateString()
    const result = await storage.get<SolveHistory>("solveHistory")
    const history = result || {}

    if (!history[dateKey]) {
      history[dateKey] = {}
    }

    const existing = history[dateKey][gameId]
    const newTime = Math.max(
      1,
      durationSeconds !== undefined && durationSeconds > 0
        ? durationSeconds
        : existing?.time || 1
    )

    if (
      !existing ||
      (durationSeconds !== undefined &&
        durationSeconds > 0 &&
        (!existing.time || existing.time === 0 || existing.time === 1))
    ) {
      history[dateKey][gameId] = {
        solved: true,
        time: newTime,
        solvedAt: existing?.solvedAt || new Date().toISOString()
      }
      await storage.set("solveHistory", history)
      console.log(
        `[LinkedIn Games Solver] Saved completion status for ${gameId}:`,
        history[dateKey][gameId]
      )
    }
  } catch (e) {
    console.error(
      "[LinkedIn Games Solver] Failed to write completion state to storage:",
      e
    )
  }
}

// Global detection scan to identify if the game is already ended/solved when visited
async function checkVisitedGameSolved() {
  const active = detectActiveSolver()
  if (!active) return

  const gameId = active.name.toLowerCase()
  const isResultsUrl = window.location.href.includes("/results")
  const seeResults = document.querySelector(
    'a[href*="/results/"], a[href*="/results"], .games-share-footer'
  )
  const resultsPage = document.querySelector(
    '[data-testid*="results"], [data-testid*="share"]'
  )
  const cells = document.querySelectorAll(
    '[data-testid^="cell-"], #tango-cell-0, [data-cell-idx]'
  )
  const allCellsLocked =
    cells.length > 0 &&
    Array.from(cells).every(
      (cell) => cell.getAttribute("aria-disabled") === "true"
    )

  let controlsEnded = false
  const underBoardControls = document.querySelector(
    '[data-testid="under-board-controls"], .sudoku-under-board-controls-container, .under-board-controls-container'
  )
  if (underBoardControls) {
    const controlWrappers = Array.from(underBoardControls.children)
    if (controlWrappers.length >= 2) {
      const undoButton = controlWrappers[0]?.querySelector("button")
      const hintWrapper = controlWrappers[
        controlWrappers.length - 1
      ] as HTMLElement
      const hintButton = hintWrapper?.querySelector("button")
      if (
        undoButton &&
        hintButton &&
        undoButton.hasAttribute("disabled") &&
        hintButton.hasAttribute("disabled")
      ) {
        if (["tango", "queens", "sudoku", "patches", "zip"].includes(gameId)) {
          // Both disabled at start of game due to empty history & cooldown.
          // Only treat as ended if page was loaded > 15s ago.
          if (Date.now() - pageLoadTime > 15000) {
            controlsEnded = true
          }
        }
      }

      const sudokuHint = underBoardControls.querySelector(
        '[data-control-btn="hint"]'
      )
      const sudokuNotes = underBoardControls.querySelector(
        '[data-control-btn="notes"]'
      )
      if (
        sudokuHint &&
        sudokuNotes &&
        (sudokuHint.classList.contains("sudoku-under-board__cta--disabled") ||
          sudokuHint.getAttribute("aria-disabled") === "true") &&
        (sudokuNotes.classList.contains("sudoku-under-board__cta--disabled") ||
          sudokuNotes.getAttribute("aria-disabled") === "true")
      ) {
        controlsEnded = true
      }
    }
  }

  const isSudokuEnded =
    !!document.querySelector(".games-share-footer") ||
    !!document.querySelector(".grid-board--disabled") ||
    document.querySelectorAll(".sudoku-input-buttons__numbers button[disabled]")
      .length === 6

  const isGameEnded =
    isResultsUrl ||
    !!seeResults ||
    !!resultsPage ||
    allCellsLocked ||
    controlsEnded ||
    isSudokuEnded

  if (isGameEnded) {
    const finalSeconds = detectFinalSolveTime()
    await saveGameCompleted(gameId, finalSeconds)
  }
}

// Initial detection run on script injection
checkVisitedGameSolved()

// Periodic background scanning for completed games
setInterval(checkVisitedGameSolved, 1500)

// Global solver state guard
let globalSolving = false

const messageListener = (
  message: { action: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: {
    game?: string | null
    success?: boolean
    error?: string
  }) => void
) => {
  if (message.action === "detectGame") {
    try {
      const currentActive = detectActiveSolver()
      sendResponse({
        game: currentActive ? currentActive.name.toLowerCase() : null
      })
    } catch (e) {
      console.error("[LinkedIn Games Solver] Game detection failed:", e)
      const errMsg = e instanceof Error ? e.message : String(e)
      sendResponse({ game: null, error: errMsg })
    }
    return true
  }

  if (message.action === "solve") {
    const currentActive = detectActiveSolver()

    if (globalSolving) {
      console.log(
        "[LinkedIn Games Solver] Solver is already running. Ignoring duplicate request."
      )
      sendResponse({
        success: false,
        error: "Solver is already running.",
        game: currentActive ? currentActive.name.toLowerCase() : null
      })
      return true
    }

    if (!currentActive) {
      sendResponse({
        success: false,
        error:
          "No matching game solver detected on this page. Please make sure you are on an active game board."
      })
      return true
    }

    console.log(
      `[LinkedIn Games Solver] Executing solver for: ${currentActive.name}`
    )
    globalSolving = true

    const startTime = Date.now()
    currentActive
      .solve()
      .then(async () => {
        console.log(
          `[LinkedIn Games Solver] Solver ${currentActive.name} completed successfully.`
        )
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)
        await saveGameCompleted(
          currentActive.name.toLowerCase(),
          durationSeconds
        )
        sendResponse({
          success: true,
          game: currentActive.name.toLowerCase()
        })
      })
      .catch((err: Error | unknown) => {
        console.error(
          `[LinkedIn Games Solver] Solver ${currentActive.name} failed:`,
          err
        )
        const errMsg = err instanceof Error ? err.message : String(err)
        sendResponse({
          success: false,
          error: errMsg,
          game: currentActive.name.toLowerCase()
        })
      })
      .finally(() => {
        globalSolving = false
      })

    return true
  }
}

chrome.runtime.onMessage.addListener(messageListener)
