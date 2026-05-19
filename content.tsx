import styleText from "data-text:~popup.css"
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import type {
  PlasmoCSConfig,
  PlasmoGetInlineAnchor,
  PlasmoGetStyle
} from "plasmo"
import { useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { detectActiveSolver } from "~games"
import { getMessage } from "~lib/i18n"
import { localStorage as storage } from "~lib/storage"
import { cn } from "~lib/utils"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/games/*"]
}

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

type SolveHistory = Record<string, Record<string, SolveRecord>>

console.log("[LinkedIn Games Solver] Content Script loaded with CSUI.")

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

// Reactive state bindings for CSUI integration
let setReactSolving: ((val: boolean) => void) | null = null
let setReactError: ((err: string | null) => void) | null = null
let setReactSuccess: ((val: boolean) => void) | null = null

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
    setReactSolving?.(true)
    setReactError?.(null)
    setReactSuccess?.(false)

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
        setReactSuccess?.(true)
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
        setReactError?.(errMsg)
        sendResponse({
          success: false,
          error: errMsg,
          game: currentActive.name.toLowerCase()
        })
      })
      .finally(() => {
        globalSolving = false
        setReactSolving?.(false)
      })

    return true
  }
}

chrome.runtime.onMessage.addListener(messageListener)

// ==========================================
// PLASMO CONTENT SCRIPTS UI (CSUI) INJECTION
// ==========================================

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `${styleText}
    :host {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 32px !important;
      align-self: center !important;
    }
    #plasmo-shadow-container {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100% !important;
    }
    .solver-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 32px !important;
      padding: 0 12px !important;
      font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, sans-serif !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      border-radius: 16px !important;
      border: none !important;
      background: transparent !important;
      cursor: pointer !important;
      user-select: none !important;
      white-space: nowrap !important;
      transition: background-color 167ms, color 167ms !important;
    }
    
    /* Light Theme Styles */
    .light .solver-btn-active {
      color: #0a66c2 !important;
    }
    .light .solver-btn-active:hover {
      background-color: rgba(10, 102, 194, 0.08) !important;
    }
    .light .solver-btn-active:active {
      background-color: rgba(10, 102, 194, 0.15) !important;
    }
    
    .light .solver-btn-solved {
      color: #057642 !important;
    }
    .light .solver-btn-solved:hover {
      background-color: rgba(5, 118, 66, 0.08) !important;
    }
    
    .light .solver-btn-solving {
      color: rgba(0, 0, 0, 0.45) !important;
      cursor: not-allowed !important;
    }
    
    /* Dark Theme Styles */
    .dark .solver-btn-active {
      color: #70b5f9 !important;
    }
    .dark .solver-btn-active:hover {
      background-color: rgba(112, 181, 249, 0.15) !important;
    }
    .dark .solver-btn-active:active {
      background-color: rgba(112, 181, 249, 0.25) !important;
    }
    
    .dark .solver-btn-solved {
      color: #43b070 !important;
    }
    .dark .solver-btn-solved:hover {
      background-color: rgba(67, 176, 112, 0.15) !important;
    }
    
    .dark .solver-btn-solving {
      color: rgba(255, 255, 255, 0.45) !important;
      cursor: not-allowed !important;
    }
    
    .solver-icon {
      width: 16px !important;
      height: 16px !important;
      margin-right: 6px !important;
      flex-shrink: 0 !important;
    }
    
    .solver-icon-spin {
      animation: spin 1s linear infinite !important;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  return style
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  return new Promise<Element | null>((resolve) => {
    let attempts = 0
    const interval = setInterval(() => {
      attempts++

      const toolbar = document.querySelector('[role="toolbar"]')
      if (toolbar) {
        // Find the Reset link (which is an anchor <a> inside the toolbar)
        const resetLink = toolbar.querySelector("a")
        if (resetLink) {
          const container = resetLink.closest("div") || resetLink.parentElement
          if (container) {
            clearInterval(interval)
            resolve(container)
            return
          }
        }

        // Fallback: find the Settings button (the last button that is not a Back button)
        const buttons = Array.from(toolbar.querySelectorAll("button"))
        const settingsBtn = buttons
          .filter((b) => {
            const label = b.getAttribute("aria-label")?.toLowerCase() || ""
            return !label.includes("back")
          })
          .pop()

        if (settingsBtn) {
          const container = settingsBtn.closest("div")?.parentElement
          if (container) {
            clearInterval(interval)
            resolve(container)
            return
          }
        }
      }

      if (attempts > 40) {
        clearInterval(interval)
        resolve(null)
      }
    }, 250)
  })
}

// Generate highly accurate, localized button labels based on active game type
const getLocalizedStrings = (activeGame: string) => {
  const isAiGame = activeGame === "crossclimb" || activeGame === "pinpoint"
  const hasI18n = typeof chrome !== "undefined" && chrome.i18n

  return {
    solve: isAiGame
      ? (hasI18n ? getMessage("solveBtn_withAi") : "") || "Solve with AI"
      : (hasI18n ? getMessage("solveBtn_game") : "") || "Solve Game",
    solving: (hasI18n ? getMessage("solveBtn_solving") : "") || "Solving...",
    solved: (hasI18n ? getMessage("solveBtn_solved") : "") || "Solved!"
  }
}

// React component representing our custom solver inline top UI bar button
const GameSolverUI = () => {
  const [theme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: storage
    },
    "dark"
  )

  const [solveHistory] = useStorage<SolveHistory>(
    {
      key: "solveHistory",
      instance: storage
    },
    {}
  )

  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [solving, setSolving] = useState(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [solveSuccess, setSolveSuccess] = useState(false)

  useEffect(() => {
    setReactSolving = setSolving
    setReactError = setSolveError
    setReactSuccess = setSolveSuccess

    // Auto-dismiss success states
    if (solveSuccess) {
      const t = setTimeout(() => setSolveSuccess(false), 3500)
      return () => clearTimeout(t)
    }

    return () => {
      setReactSolving = null
      setReactError = null
      setReactSuccess = null
    }
  }, [solveSuccess])

  // Auto-dismiss error states
  useEffect(() => {
    if (solveError) {
      const t = setTimeout(() => setSolveError(null), 6000)
      return () => clearTimeout(t)
    }
  }, [solveError])

  // Periodically check the active game solver
  useEffect(() => {
    const check = () => {
      const active = detectActiveSolver()
      setActiveGame(active ? active.name.toLowerCase() : null)
    }
    check()
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!activeGame) return null

  const dateKey = getLocalDateString()
  const isCompleted = !!solveHistory?.[dateKey]?.[activeGame]?.solved

  const handleSolve = async () => {
    if (solving) return

    const currentActive = detectActiveSolver()
    if (!currentActive) {
      setSolveError("No active game solver detected.")
      return
    }

    globalSolving = true
    setSolving(true)
    setSolveError(null)
    setSolveSuccess(false)

    console.log(
      `[LinkedIn Games Solver UI] Solving active board for: ${currentActive.name}`
    )
    const startTime = Date.now()
    try {
      await currentActive.solve()
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)
      await saveGameCompleted(currentActive.name.toLowerCase(), durationSeconds)
      setSolveSuccess(true)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setSolveError(errMsg)
    } finally {
      globalSolving = false
      setSolving(false)
    }
  }

  const handleResultsClick = () => {
    const getGamePath = (id: string) => (id === "sudoku" ? "mini-sudoku" : id)
    const gamePath = getGamePath(activeGame)
    window.location.href = `https://www.linkedin.com/games/${gamePath}/results/`
  }

  const strings = getLocalizedStrings(activeGame)

  return (
    <div className={cn(theme, "relative flex items-center justify-center h-8")}>
      {isCompleted ? (
        <button
          type="button"
          onClick={handleResultsClick}
          className="solver-btn solver-btn-solved"
          title="Game completed! Click to view daily results.">
          <CheckCircle2 className="solver-icon" />
          <span>{strings.solved}</span>
        </button>
      ) : solving ? (
        <button
          type="button"
          disabled
          className="solver-btn solver-btn-solving">
          <Loader2 className="solver-icon solver-icon-spin" />
          <span>{strings.solving}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSolve}
          className="solver-btn solver-btn-active"
          title={
            activeGame === "crossclimb" || activeGame === "pinpoint"
              ? "Solve this puzzle automatically using AI solver."
              : "Solve this puzzle using algorithmic steps."
          }>
          <Sparkles className="solver-icon" />
          <span>{strings.solve}</span>
        </button>
      )}

      {/* Elegant absolute-positioned floating error tooltip */}
      {solveError && (
        <div className="absolute right-0 bottom-11 z-50 flex w-60 items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/15 p-3 text-[10px] font-semibold leading-normal text-destructive shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1">{solveError}</div>
        </div>
      )}
    </div>
  )
}

export default GameSolverUI
