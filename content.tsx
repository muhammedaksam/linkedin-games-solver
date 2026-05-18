import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useEffect, useState } from "react"

import { detectActiveSolver } from "~games"
import type { BaseSolver } from "~games/base"
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

console.log("[LinkedIn Games Solver] React Content Script loaded.")

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

// Read the stopwatch timer directly from the native LinkedIn page
function detectFinalSolveTime(): number | undefined {
  const clockIcon = document.querySelector(
    'svg#clock-small, svg[data-test-icon="clock-small"], use[href="#clock-small"]'
  )
  if (!clockIcon) return undefined

  const parent = clockIcon.closest("div")
  if (!parent) return undefined

  const timerSpan = parent.querySelector(
    'span[role="text"], span[class*="timer"]'
  )
  if (!timerSpan) return undefined

  const text = timerSpan.textContent?.trim()
  if (text?.includes(":")) {
    const seconds = parseTimerToSeconds(text)
    if (seconds > 0) return seconds
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
        (!existing.time || existing.time === 0))
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
    '[data-testid="under-board-controls"], .sudoku-under-board-controls-container'
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
          controlsEnded = true
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

// ---------------------------------------------------------
// Plasmo CSUI Mounting Configurations
// ---------------------------------------------------------

// Tell Plasmo CSUI where to watch on the page to mount the component
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  const targets = [
    '[data-testid="under-board-controls"]',
    '.sudoku-under-board-controls-container',
    '.under-board-controls-container',
    '.pinpoint__bottom-section'
  ]

  for (const selector of targets) {
    const el = document.querySelector(selector)
    if (el) return el
  }
  return null
}

// Overwrite root container generation to insert custom wrapper inheriting native LinkedIn styles
export const getRootContainer = async (payload: { anchor: { element: HTMLElement } }) => {
  const { anchor } = payload
  if (!anchor?.element) return null

  // Dedicated bottom container for Pinpoint
  if (anchor.element.classList.contains("pinpoint__bottom-section")) {
    let container = anchor.element.querySelector(".linkedin-solver-solve-btn-wrapper") as HTMLElement | null
    if (!container) {
      container = document.createElement("div")
      container.className = "linkedin-solver-solve-btn-wrapper pinpoint-solve-btn-container"
      container.style.marginTop = "12px"
      container.style.display = "flex"
      container.style.justifyContent = "center"
      container.style.width = "100%"
      anchor.element.appendChild(container)
    }
    return container
  }

  // Under-board controls for standard games
  const underBoardControls = anchor.element
  if (underBoardControls) {
    if (underBoardControls instanceof HTMLElement) {
      underBoardControls.style.display = "grid"
      underBoardControls.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))"
      underBoardControls.style.gap = "8px"
    }

    let container = underBoardControls.querySelector(".linkedin-solver-solve-btn-wrapper") as HTMLElement | null
    if (!container) {
      container = document.createElement("div")
      container.className = "linkedin-solver-solve-btn-wrapper"

      let hintWrapper: HTMLElement | null = null
      const hintBtn = underBoardControls.querySelector('[data-control-btn="hint"]')
      if (hintBtn) {
        const wrapper =
          hintBtn.closest(".under-board-controls-item") ||
          hintBtn.closest(".sudoku-under-board__cta")
        hintWrapper = (wrapper || hintBtn) as HTMLElement
      } else {
        const controlWrappers = Array.from(underBoardControls.children)
        hintWrapper = controlWrappers[controlWrappers.length - 1] as HTMLElement
      }

      if (hintWrapper) {
        hintWrapper.parentNode?.insertBefore(container, hintWrapper.nextSibling)
      } else {
        underBoardControls.appendChild(container)
      }
    }
    return container
  }

  return null
}

// ---------------------------------------------------------
// CSUI React Component
// ---------------------------------------------------------
const SolveButtonCSUI = () => {
  const [solving, setSolving] = useState(false)
  const [status, setStatus] = useState<"idle" | "solving" | "success" | "failed">("idle")
  const [gameEnded, setGameEnded] = useState(false)
  const [active, setActive] = useState<BaseSolver | null>(null)
  const [buttonClasses, setButtonClasses] = useState<string>("")
  const [span1Classes, setSpan1Classes] = useState<string>("")
  const [span2Classes, setSpan2Classes] = useState<string>("")

  // Dynamically clone native obfuscated LinkedIn classes at mount time
  useEffect(() => {
    const getNativeStyles = () => {
      const underBoard = document.querySelector('[data-testid="under-board-controls"], .sudoku-under-board-controls-container, .under-board-controls-container')
      const nativeBtn = underBoard?.querySelector('button') || document.querySelector('[data-control-btn="hint"]') || document.querySelector('.pinpoint__bottom-section button')
      
      if (nativeBtn) {
        setButtonClasses(nativeBtn.className)
        
        const span1 = nativeBtn.querySelector('span')
        if (span1) {
          setSpan1Classes(span1.className)
          const span2 = span1.querySelector('span')
          if (span2) {
            setSpan2Classes(span2.className)
          }
        }
      }
    }

    getNativeStyles()
    const timer = setInterval(getNativeStyles, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkState = () => {
      const currentActive = detectActiveSolver()
      setActive(currentActive)

      const seeResults = document.querySelector(
        'a[href*="/results/"], a[href*="/results"], .games-share-footer'
      )
      const isSudokuEnded =
        !!document.querySelector(".games-share-footer") ||
        !!document.querySelector(".grid-board--disabled") ||
        document.querySelectorAll(
          ".sudoku-input-buttons__numbers button[disabled]"
        ).length === 6

      let controlsEnded = false
      const underBoardControls = document.querySelector(
        '[data-testid="under-board-controls"], .sudoku-under-board-controls-container, .under-board-controls-container'
      )
      if (underBoardControls) {
        const controlWrappers = Array.from(underBoardControls.children)
        if (controlWrappers.length >= 2) {
          const undoButton = controlWrappers[0]?.querySelector("button")
          const hintWrapper = controlWrappers[controlWrappers.length - 1] as HTMLElement
          const hintButton = hintWrapper?.querySelector("button")
          if (
            undoButton &&
            hintButton &&
            undoButton.hasAttribute("disabled") &&
            hintButton.hasAttribute("disabled")
          ) {
            const activeName = currentActive ? currentActive.name.toLowerCase() : ""
            if (["tango", "queens", "sudoku", "patches", "zip"].includes(activeName)) {
              controlsEnded = true
            }
          }
        }
      }

      setGameEnded(!!seeResults || isSudokuEnded || controlsEnded)
    }

    checkState()
    const timer = setInterval(checkState, 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen to message calls from options/popups
  useEffect(() => {
    const messageListener = (
      message: { action: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: { game?: string | null; success?: boolean; error?: string }) => void
    ) => {
      if (message.action === "detectGame") {
        try {
          const currentActive = detectActiveSolver()
          sendResponse({ game: currentActive ? currentActive.name.toLowerCase() : null })
        } catch (e) {
          console.error("[LinkedIn Games Solver] Game detection failed:", e)
          const errMsg = e instanceof Error ? e.message : String(e)
          sendResponse({ game: null, error: errMsg })
        }
        return true
      }

      if (message.action === "solve") {
        const currentActive = detectActiveSolver()
        if (!currentActive) {
          sendResponse({
            success: false,
            error: "No matching game solver detected on this page. Please make sure you are on an active game board."
          })
          return true
        }

        console.log(`[LinkedIn Games Solver] Executing solver for: ${currentActive.name}`)
        setSolving(true)
        setStatus("solving")

        const startTime = Date.now()
        currentActive
          .solve()
          .then(async () => {
            console.log(`[LinkedIn Games Solver] Solver ${currentActive.name} completed successfully.`)
            setStatus("success")
            const durationSeconds = Math.round((Date.now() - startTime) / 1000)
            await saveGameCompleted(currentActive.name.toLowerCase(), durationSeconds)
            sendResponse({ success: true, game: currentActive.name.toLowerCase() })
            setTimeout(() => setStatus("idle"), 2500)
          })
          .catch((err: Error | unknown) => {
            console.error(`[LinkedIn Games Solver] Solver ${currentActive.name} failed:`, err)
            setStatus("failed")
            const errMsg = err instanceof Error ? err.message : String(err)
            sendResponse({ success: false, error: errMsg, game: currentActive.name.toLowerCase() })
            setTimeout(() => setStatus("idle"), 2500)
          })
          .finally(() => {
            setSolving(false)
          })

        return true
      }
    }

    chrome.runtime?.onMessage?.addListener(messageListener)
    return () => chrome.runtime?.onMessage?.removeListener(messageListener)
  }, [])

  const handleSolve = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!active) return

    setSolving(true)
    setStatus("solving")

    const elapsedSinceLoad = Date.now() - pageLoadTime
    const minDuration = 6000
    const delay = Math.max(0, minDuration - elapsedSinceLoad)
    if (delay > 0) {
      console.log(`[LinkedIn Games Solver] Pacing solve action: sleeping for ${delay}ms to satisfy minimum play time anti-cheat limit.`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const startTime = Date.now()
    active
      .solve()
      .then(async () => {
        setStatus("success")
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)
        await saveGameCompleted(active.name.toLowerCase(), durationSeconds)
        setTimeout(() => setStatus("idle"), 2500)
      })
      .catch((err: Error | unknown) => {
        setStatus("failed")
        console.error("[LinkedIn Games Solver] Solver failed:", err)
        setTimeout(() => setStatus("idle"), 2500)
      })
      .finally(() => {
        setSolving(false)
      })
  }

  const isPinpoint = active?.name?.toLowerCase() === "pinpoint"

  // Replicate exactly identical obfuscated structure and classes from the native buttons
  if (buttonClasses) {
    return (
      <button
        type="button"
        onClick={handleSolve}
        disabled={solving || gameEnded}
        className={cn(buttonClasses, (solving || gameEnded) && "is-disabled")}
        style={{
          width: "100%",
          maxWidth: isPinpoint ? "320px" : undefined,
          opacity: (solving || gameEnded) ? 0.6 : undefined,
          cursor: (solving || gameEnded) ? "not-allowed" : "pointer"
        }}>
        <span className={span1Classes || undefined}>
          <span className={span2Classes || "solve-btn-text-node"}>
            {status === "idle" && (gameEnded ? "Solved" : "Solve")}
            {status === "solving" && "Solving..."}
            {status === "success" && "Solved!"}
            {status === "failed" && "Failed!"}
          </span>
        </span>
      </button>
    )
  }

  // Fallback if no native button is present on screen yet
  return (
    <button
      type="button"
      onClick={handleSolve}
      disabled={solving || gameEnded}
      className={cn(
        "artdeco-button",
        isPinpoint
          ? "artdeco-button--muted artdeco-button--2 artdeco-button--secondary w-full"
          : "artdeco-button--muted artdeco-button--1 artdeco-button--secondary",
        (solving || gameEnded) && "is-disabled"
      )}
      style={{
        width: "100%",
        maxWidth: isPinpoint ? "320px" : undefined,
        fontWeight: "600"
      }}>
      <span className="solve-btn-text-node">
        {status === "idle" && (gameEnded ? "Solved" : "Solve")}
        {status === "solving" && "Solving..."}
        {status === "success" && "Solved!"}
        {status === "failed" && "Failed!"}
      </span>
    </button>
  )
}

export default SolveButtonCSUI
