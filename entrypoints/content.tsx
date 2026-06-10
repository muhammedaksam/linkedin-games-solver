import ReactDOM from "react-dom/client"

import { detectActiveSolver } from "~games"
import { analytics } from "~lib/analytics"
import { initLocale } from "~lib/i18n"
import { sendToBackground } from "~lib/plasmo-messaging-shim"
import { syncStorage as storage } from "~lib/storage"
import {
  getLocalDateString,
  getPuzzleNumber,
  type SolveHistory
} from "~lib/utils"

import { GameSolverUI } from "../components/GameSolverUI"

import "./solver-ui.css"

// Keep track of captured logs globally in content.tsx
const capturedLogs: Array<{
  type: string
  message: string
  timestamp: string
}> = []

// Capture Isolated World logs
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleInfo = console.info

const syncLogsToSession = () => {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    chrome.storage.session.set({ solverLogs: capturedLogs }).catch(() => {})
  }
}

// Initialize session logs on injection
syncLogsToSession()

const captureIsolatedLog = (type: string, args: unknown[]) => {
  const serialized = args.map((arg) => {
    try {
      if (arg === null) return "null"
      if (arg === undefined) return "undefined"
      if (arg instanceof Error)
        return `${arg.name}: ${arg.message}\n${arg.stack || ""}`
      if (typeof arg === "object") return JSON.stringify(arg)
      return String(arg)
    } catch {
      return String(arg)
    }
  })

  capturedLogs.push({
    type,
    message: serialized.join(" "),
    timestamp: new Date().toLocaleTimeString()
  })

  // Maintain a maximum of 500 logs to prevent memory leaks
  if (capturedLogs.length > 500) {
    capturedLogs.shift()
  }
  syncLogsToSession()
}

console.log = (...args) => {
  originalConsoleLog.apply(console, args)
  captureIsolatedLog("log", args)
}
console.error = (...args) => {
  originalConsoleError.apply(console, args)
  captureIsolatedLog("error", args)
}
console.warn = (...args) => {
  originalConsoleWarn.apply(console, args)
  captureIsolatedLog("warn", args)
}
console.info = (...args) => {
  originalConsoleInfo.apply(console, args)
  captureIsolatedLog("info", args)
}

// Window postMessage event listener to capture main world page-level logs
window.addEventListener("message", (event) => {
  if (event.source !== window) return
  if (event.data?.source === "linkedin-games-solver-logger") {
    capturedLogs.push({
      type: event.data.type,
      message: event.data.logs.join(" "),
      timestamp: event.data.timestamp
    })
    // Maintain a maximum of 500 logs to prevent memory leaks
    if (capturedLogs.length > 500) {
      capturedLogs.shift()
    }
    syncLogsToSession()
  }
})

console.log("[LinkedIn Games Solver] Content Script loaded with CSUI.")

const pageLoadTime = Date.now()
let lastKnownUrl = window.location.href
let lastUrlChangeTime = pageLoadTime

// Shared helper to derive the bonus-aware game ID from the current URL and active solver
export function getCurrentGameId(): {
  gameId: string
  baseGameId: string
} | null {
  const active = detectActiveSolver()
  if (!active) return null
  const url = new URL(window.location.href)
  const isBonus =
    url.searchParams.get("bonus") === "true" || url.pathname.includes("bonus")
  const baseGameId = active.name.toLowerCase()
  const gameId = baseGameId + (isBonus ? "-bonus" : "")
  return { gameId, baseGameId }
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
function detectFinalSolveTime(gameId?: string): number | undefined {
  if (!gameId) {
    gameId = getCurrentGameId()?.gameId
  }

  const baseGameId = gameId?.replace("-bonus", "") ?? ""

  if (baseGameId === "pinpoint") {
    // 1. Results page golden chiclet (carousel slide showing e.g. "Solved in 3")
    const textEls = document.querySelectorAll(
      ".pr-golden-chiclet__text, .pr-golden-chiclet, .artdeco-carousel__item.active div, .pr-golden-chiclet__carousel-item.active div"
    )
    for (const el of Array.from(textEls)) {
      const text = el.textContent?.trim() || ""
      const match = text.match(/Solved in (\d+)/i)
      if (match) {
        const clues = parseInt(match[1], 10)
        if (clues > 0 && clues <= 5) return clues
      }
    }

    // 2. Leaderboard: player "You" score card (which shows e.g. "3 clues")
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
          const text = scoreEl.textContent?.trim() || ""
          const match = text.match(/(\d+)/)
          if (match) {
            const clues = parseInt(match[1], 10)
            if (clues > 0 && clues <= 5) return clues
          }
        }
      }
    }

    return undefined
  }

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
export async function saveGameCompleted(
  gameId: string,
  durationSeconds?: number,
  isActualPageTime: boolean = false
) {
  try {
    const dateKey = getLocalDateString()
    const result = await storage.get<SolveHistory>("solveHistory")
    const history = result || {}

    if (!history[dateKey]) {
      history[dateKey] = {}
    }

    const existing = history[dateKey][gameId]
    let newTime = existing?.time || 1
    let shouldUpdate = false

    if (durationSeconds !== undefined && durationSeconds > 0) {
      if (isActualPageTime) {
        if (existing?.time !== durationSeconds) {
          newTime = durationSeconds
          shouldUpdate = true
        }
      } else {
        if (!existing?.time || existing.time === 0 || existing.time === 1) {
          newTime = durationSeconds
          shouldUpdate = true
        }
      }
    }

    if (!existing || !existing.solved) {
      shouldUpdate = true
    }

    if (shouldUpdate) {
      history[dateKey][gameId] = {
        solved: true,
        time: Math.max(1, newTime),
        solvedAt: existing?.solvedAt || new Date().toISOString()
      }
      await storage.set("solveHistory", history)
      console.log(
        `[LinkedIn Games Solver] Saved completion status for ${gameId} (isActualPageTime=${isActualPageTime}):`,
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
  // Track URL changes to reset the grace period timer when navigating
  // between regular and bonus games within the same SPA session
  const currentUrl = window.location.href
  if (currentUrl !== lastKnownUrl) {
    lastKnownUrl = currentUrl
    lastUrlChangeTime = Date.now()
  }

  const current = getCurrentGameId()
  if (!current) return
  const { gameId } = current
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
      const baseGameId = current.baseGameId
      if (
        undoButton &&
        hintButton &&
        undoButton.hasAttribute("disabled") &&
        hintButton.hasAttribute("disabled")
      ) {
        if (
          ["tango", "queens", "sudoku", "patches", "zip"].includes(baseGameId)
        ) {
          // Both disabled at start of game due to empty history & cooldown.
          // Only treat as ended if page was loaded > 15s ago.
          // Use lastUrlChangeTime to handle SPA navigation between games.
          if (Date.now() - lastUrlChangeTime > 15000) {
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
    const finalSeconds = detectFinalSolveTime(gameId)
    await saveGameCompleted(gameId, finalSeconds, true)
  }
}

// Global solver state guard
let globalSolving = false

export function isGlobalSolving() {
  return globalSolving
}

export function setGlobalSolving(val: boolean) {
  globalSolving = val
}

export function updateSolverStatus(status: "solving" | "idle") {
  if (typeof window !== "undefined") {
    sendToBackground({
      name: "solverStatus",
      body: { status }
    }).catch(() => {})
  }
}

// Reactive state bindings for CSUI integration
let setReactSolving: ((val: boolean) => void) | null = null
let setReactError: ((err: string | null) => void) | null = null
let setReactSuccess: ((val: boolean) => void) | null = null

export function registerReactCallbacks(
  callbacks: {
    setSolving: (val: boolean) => void
    setError: (err: string | null) => void
    setSuccess: (val: boolean) => void
  } | null
) {
  if (callbacks) {
    setReactSolving = callbacks.setSolving
    setReactError = callbacks.setError
    setReactSuccess = callbacks.setSuccess
  } else {
    setReactSolving = null
    setReactError = null
    setReactSuccess = null
  }
}

const messageListener = (
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  const msg = message as { action: string; mode?: "full" | "hint" }
  if (msg.action === "getDebugInfo") {
    try {
      const mainElement = document.querySelector("main")
      const mainHtml = mainElement ? mainElement.outerHTML : ""
      sendResponse({ success: true, logs: capturedLogs, mainHtml })
    } catch (e) {
      sendResponse({
        success: false,
        error: e instanceof Error ? e.message : String(e)
      })
    }
    return true
  }

  if (msg.action === "clearDebugLogs") {
    capturedLogs.length = 0
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      chrome.storage.session.remove("solverLogs").catch(() => {})
    }
    sendResponse({ success: true })
    return true
  }

  if (msg.action === "detectGame") {
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

  if (msg.action === "solve") {
    const currentActive = detectActiveSolver()
    const mode = msg.mode || "full"

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

    const currentGame = getCurrentGameId()
    if (!currentGame) {
      sendResponse({ success: false, error: "Could not determine game." })
      return true
    }
    const { gameId: msgGameId } = currentGame

    console.log(
      `[LinkedIn Games Solver] Executing solver for: ${msgGameId} (mode: ${mode})`
    )
    globalSolving = true
    setReactSolving?.(true)
    setReactError?.(null)
    setReactSuccess?.(false)
    updateSolverStatus("solving")

    const startTime = Date.now()
    ;(async () => {
      try {
        await currentActive.solve(mode)
        console.log(
          `[LinkedIn Games Solver] Solver ${currentActive.name} completed successfully.`
        )
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)
        await analytics.track("solve_completed", {
          game: msgGameId,
          mode,
          duration_seconds: String(durationSeconds)
        })
        if (mode !== "hint") {
          await saveGameCompleted(msgGameId, durationSeconds)
        }
        setReactSuccess?.(true)
        sendResponse({ success: true, game: currentActive.name.toLowerCase() })
      } catch (err: unknown) {
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
      } finally {
        globalSolving = false
        setReactSolving?.(false)
        updateSolverStatus("idle")
      }
    })()

    return true
  }

  if (msg.action === "extractPuzzleData") {
    const runExtraction = async () => {
      try {
        const currentActive = detectActiveSolver()
        if (!currentActive) {
          sendResponse({
            success: false,
            error: "No active game board detected."
          })
          return
        }

        const gameName = currentActive.name.toLowerCase()
        const puzzleNumber = getPuzzleNumber(gameName)

        if (gameName === "pinpoint") {
          // 1. Gather all flipped card clues
          const clues: string[] = []
          for (let j = 0; j < 5; j++) {
            const card = document.querySelector(
              `.pinpoint__card__container.pinpoint__card__${j}, .pinpoint__card__${j}`
            )
            if (card) {
              const clueTextEl = card.querySelector(
                ".pinpoint__card--clue span, .pinpoint__card--clue"
              )
              const clueText = clueTextEl
                ? clueTextEl.textContent?.trim() || ""
                : ""
              if (clueText) {
                clues.push(clueText)
              }
            }
          }

          // 2. Gather correct category answer text
          const categoryEl = document.querySelector(
            '.pinpoint__card__answer_text, .pinpoint__card--answer, [class*="answer_text"], [class*="answer-text"]'
          )
          const category = categoryEl
            ? categoryEl.textContent?.trim() || ""
            : ""

          if (clues.length === 0 && !category) {
            sendResponse({
              success: false,
              error:
                "No active Pinpoint board data found on page. Make sure the board is loaded/completed."
            })
            return
          }

          sendResponse({
            success: true,
            game: "pinpoint",
            puzzleNumber,
            data: { category, clues }
          })
        } else if (gameName === "crossclimb") {
          const middleRows = Array.from(
            document.querySelectorAll(".crossclimb__guess--middle")
          ) as HTMLElement[]

          if (middleRows.length === 0) {
            sendResponse({
              success: false,
              error:
                "No Crossclimb middle rows found. Are you on the Crossclimb page?"
            })
            return
          }

          // Visual sort of middle rows (top to bottom)
          middleRows.sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top
          )

          const getRowWord = (row: HTMLElement): string => {
            const inputs = Array.from(
              row.querySelectorAll("input")
            ) as HTMLInputElement[]
            return inputs
              .map((input) => input.value || "")
              .join("")
              .trim()
              .toUpperCase()
          }

          const answers = middleRows.map((row) => getRowWord(row))

          // Sequentially click middle rows to read active trivia clues from the bottom panel
          const clues: string[] = []
          for (let i = 0; i < middleRows.length; i++) {
            const row = middleRows[i]
            row.click()
            // Wait 120ms to allow clue transition in the UI
            await new Promise((resolve) => setTimeout(resolve, 120))
            const clueEl = document.querySelector(".crossclimb__clue")
            const clueText = clueEl ? clueEl.textContent?.trim() || "" : ""
            clues.push(clueText)
          }

          // Get Top Row (data-guess-id="0") and Bottom Row (data-guess-id="numMiddleRows + 1")
          const topRow = document.querySelector(
            '[data-guess-id="0"]'
          ) as HTMLElement
          const bottomRow = document.querySelector(
            `[data-guess-id="${middleRows.length + 1}"]`
          ) as HTMLElement

          const topWord = topRow ? getRowWord(topRow) : ""
          const bottomWord = bottomRow ? getRowWord(bottomRow) : ""

          if (answers.some((w) => !w) || !topWord || !bottomWord) {
            sendResponse({
              success: false,
              error:
                "Some words are blank. Please complete the Crossclimb board before extracting."
            })
            return
          }

          sendResponse({
            success: true,
            game: "crossclimb",
            puzzleNumber,
            data: { clues, answers, topWord, bottomWord }
          })
        } else {
          sendResponse({
            success: false,
            error: `Extraction is not supported for "${currentActive.name}".`
          })
        }
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    runExtraction()
    return true
  }
}

const getInlineAnchor = async () => {
  return new Promise<Element | null>((resolve) => {
    let attempts = 0
    const interval = setInterval(() => {
      attempts++

      // First check for direct toolbar action containers
      const actionsContainer = document.querySelector(
        ".pr-game-web__toolbar-actions, .scaffold-layout-toolbar__content .pr-game-web__toolbar-actions"
      )
      if (actionsContainer) {
        clearInterval(interval)
        resolve(actionsContainer)
        return
      }

      // Check for general toolbar
      const toolbar = document.querySelector(
        '[role="toolbar"], .pr-game-web__toolbar, .scaffold-layout-toolbar'
      )
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

export default defineContentScript({
  matches: ["https://*.linkedin.com/games/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    // Initialize localization dictionary before any rendering or detection runs
    await initLocale()

    console.log(
      "[LinkedIn Games Solver] Content Script loaded with WXT Shadow Root UI."
    )

    // Initial detection run on script injection
    checkVisitedGameSolved()

    // Periodic background scanning for completed games
    ctx.setInterval(checkVisitedGameSolved, 1500)

    // Message listener for background events
    chrome.runtime.onMessage.addListener(messageListener)

    ctx.onInvalidated(() => {
      chrome.runtime.onMessage.removeListener(messageListener)
    })

    // Mount the React-based inline top toolbar solver UI dynamically
    let mountedUi: { mount: () => void; remove: () => void } | null = null
    let mounting = false

    const tryMountUi = async () => {
      if (mounting) return
      mounting = true
      try {
        const containerExists = document.getElementById(
          "linkedin-games-solver-inline-container"
        )
        if (containerExists) {
          // If container is in the document but the parent has been detached, let's clean up and recreate
          if (!containerExists.isConnected) {
            if (mountedUi) {
              mountedUi.remove()
              mountedUi = null
            }
            containerExists.remove()
          } else {
            return
          }
        }

        const anchorElement = await getInlineAnchor()
        if (anchorElement) {
          // Double-check after await — another call may have mounted in the meantime
          if (
            document.getElementById("linkedin-games-solver-inline-container")
          ) {
            return
          }

          const container = document.createElement("div")
          container.id = "linkedin-games-solver-inline-container"
          // Style container inline to act as a perfect inline-flex container matching LinkedIn's toolbar items
          container.style.display = "inline-flex"
          container.style.alignItems = "center"
          container.style.justifyContent = "center"
          container.style.height = "32px"
          container.style.alignSelf = "center"
          container.style.overflow = "hidden"
          container.style.margin = "0 8px"
          container.style.padding = "0"
          anchorElement.appendChild(container)

          mountedUi = await createShadowRootUi(ctx, {
            name: "linkedin-games-solver-ui",
            position: "inline",
            anchor: container,
            onMount: (shadowContainer) => {
              // Style the shadowContainer to prevent any extra margins/padding/overflow/scrollbars!
              shadowContainer.style.display = "flex"
              shadowContainer.style.alignItems = "center"
              shadowContainer.style.justifyContent = "center"
              shadowContainer.style.height = "100%"
              shadowContainer.style.width = "100%"
              shadowContainer.style.overflow = "hidden"
              shadowContainer.style.margin = "0"
              shadowContainer.style.padding = "0"

              const app = document.createElement("div")
              app.style.display = "flex"
              app.style.alignItems = "center"
              app.style.justifyContent = "center"
              app.style.height = "100%"
              app.style.width = "100%"
              app.style.overflow = "hidden"
              app.style.margin = "0"
              app.style.padding = "0"
              shadowContainer.append(app)

              const root = ReactDOM.createRoot(app)
              root.render(<GameSolverUI />)
              return root
            },
            onRemove: (root) => {
              root?.unmount()
              container.remove()
            }
          })
          mountedUi.mount()
        }
      } finally {
        mounting = false
      }
    }

    // Attempt mounting immediately and periodically
    tryMountUi()
    ctx.setInterval(tryMountUi, 1000)
  }
})
