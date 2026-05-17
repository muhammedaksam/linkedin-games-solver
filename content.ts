import type { PlasmoCSConfig } from "plasmo"

import { localStorage as storage } from "./lib/storage"
import { detectActiveSolver, type BaseSolver } from "./games"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/games/*"]
}

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

type SolveHistory = Record<string, Record<string, SolveRecord>>

console.log("[LinkedIn Games Solver] Content script loaded.")

let observer: MutationObserver | null = null
let injectionTimeout: NodeJS.Timeout | null = null

// Generate local YYYY-MM-DD date key
function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Convert MM:SS or HH:MM:SS stopwatch string to seconds (100% Language-Independent)
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

// Read the stopwatch timer directly from the native LinkedIn page to get the exact solve time
function detectFinalSolveTime(): number | undefined {
  // Locate the clock icon node
  const clockIcon = document.querySelector(
    'svg#clock-small, svg[data-test-icon="clock-small"], use[href="#clock-small"]'
  )
  if (!clockIcon) return undefined

  // Retrieve the clock container
  const parent = clockIcon.closest("div")
  if (!parent) return undefined

  // Locate the timer label span
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

    // Choose the best possible completion time (with an absolute minimum of 1 second)
    const newTime = Math.max(
      1,
      durationSeconds !== undefined && durationSeconds > 0
        ? durationSeconds
        : existing?.time || 1
    )

    // Save if not yet logged, or if we have an active time reading to update an existing 0/empty time
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

// Global detection scan to identify if the game is already ended/solved when visited (100% Language-Independent)
async function checkVisitedGameSolved() {
  const active = detectActiveSolver()
  if (!active) return

  const gameId = active.name.toLowerCase()

  // 1. Check if the URL indicates we are on the results/completed view (server routing paths are never localized)
  const isResultsUrl = window.location.href.includes("/results")

  // 2. Check if a link to the results page is in the DOM (href destinations are constant globally)
  const seeResults = document.querySelector(
    'a[href*="/results/"], a[href*="/results"], .games-share-footer'
  )

  // 3. Check for standard results container/element data-testid (test IDs are hardcoded in source and never localized)
  const resultsPage = document.querySelector(
    '[data-testid*="results"], [data-testid*="share"]'
  )

  // 4. Check for locked board cell states (ARIA standard specs, identical in all languages)
  const cells = document.querySelectorAll(
    '[data-testid^="cell-"], #tango-cell-0, [data-cell-idx]'
  )
  const allCellsLocked =
    cells.length > 0 &&
    Array.from(cells).every(
      (cell) => cell.getAttribute("aria-disabled") === "true"
    )

  // 5. Check if under-board controls are fully disabled (accessing by element order avoids text dependencies)
  let controlsEnded = false
  const underBoardControls = document.querySelector(
    '[data-testid="under-board-controls"], .sudoku-under-board-controls-container'
  )
  if (underBoardControls) {
    const controlWrappers = Array.from(underBoardControls.children)
    if (controlWrappers.length >= 2) {
      // Standard games (Tango, Queens, Patches, Zip)
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
        const activeName = active ? active.name.toLowerCase() : ""
        const isGridGame = [
          "tango",
          "queens",
          "sudoku",
          "patches",
          "zip"
        ].includes(activeName)
        if (isGridGame) {
          controlsEnded = true
        }
      }

      // Mini Sudoku
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

  // 6. Sudoku-specific board & inputs locking detection
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

// Dedicated Solve button injection for Pinpoint (since it lacks standard under-board control wrappers)
function injectPinpointSolveButton(active: BaseSolver) {
  const bottomSection = document.querySelector(".pinpoint__bottom-section")
  const inputEl = document.querySelector(".pinpoint__input")
  if (!bottomSection || !inputEl) return

  // Temporarily pause the observer to prevent infinite recursive self-triggering mutations during injection
  if (observer) observer.disconnect()

  try {
    let solveWrapper = bottomSection.querySelector(
      ".linkedin-solver-solve-btn-wrapper"
    ) as HTMLElement

    if (!solveWrapper) {
      solveWrapper = document.createElement("div")
      solveWrapper.className =
        "linkedin-solver-solve-btn-wrapper pinpoint-solve-btn-container"
      solveWrapper.style.marginTop = "12px"
      solveWrapper.style.display = "flex"
      solveWrapper.style.justifyContent = "center"
      solveWrapper.style.width = "100%"

      const solveButton = document.createElement("button")
      solveButton.className =
        "artdeco-button artdeco-button--muted artdeco-button--2 artdeco-button--secondary"
      solveButton.style.width = "100%"
      solveButton.style.maxWidth = "320px"
      solveButton.style.fontWeight = "600"

      const spanText = document.createElement("span")
      spanText.className = "solve-btn-text-node"
      spanText.textContent = "Solve"
      solveButton.appendChild(spanText)
      solveWrapper.appendChild(solveButton)

      bottomSection.appendChild(solveWrapper)
      console.log(
        "[LinkedIn Games Solver] Injected dedicated Solve button for Pinpoint successfully."
      )
    }

    const solveButton = solveWrapper.querySelector("button")
    if (!solveButton) return

    // Bind click listener only if we haven't already
    if (!solveButton.dataset.listenerBound) {
      solveButton.dataset.listenerBound = "true"
      solveButton.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Set solving state
        solveButton.setAttribute("disabled", "true")
        solveButton.setAttribute("aria-disabled", "true")
        solveButton.classList.add("is-disabled")

        const labelNode =
          solveButton.querySelector(".solve-btn-text-node") || solveButton
        const originalText = labelNode.textContent || "Solve"
        labelNode.textContent = "Solving..."

        const startTime = Date.now()

        active
          .solve()
          .then(() => {
            labelNode.textContent = "Solved!"
            const durationSeconds = Math.round((Date.now() - startTime) / 1000)
            saveGameCompleted("pinpoint", durationSeconds)

            setTimeout(() => {
              labelNode.textContent = originalText
              // Keep disabled since the game is finished
              solveButton.setAttribute("disabled", "true")
              solveButton.classList.add("is-disabled")
            }, 2500)
          })
          .catch((err) => {
            labelNode.textContent = "Failed!"
            console.error(
              "[LinkedIn Games Solver] Pinpoint solver failed:",
              err
            )
            setTimeout(() => {
              labelNode.textContent = originalText
              solveButton.removeAttribute("disabled")
              solveButton.setAttribute("aria-disabled", "false")
              solveButton.classList.remove("is-disabled")
            }, 2500)
          })
      })
    }
  } finally {
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }
}

// Dynamically inject a Solve button next to the Hint button
function injectSolveButton() {
  const active = detectActiveSolver()
  const gameId = active ? active.name.toLowerCase() : null

  if (gameId === "pinpoint") {
    injectPinpointSolveButton(active)
    return
  }

  const underBoardControls = document.querySelector(
    '[data-testid="under-board-controls"], .sudoku-under-board-controls-container, .under-board-controls-container'
  )
  if (!underBoardControls) return

  const controlWrappers = Array.from(underBoardControls.children)
  if (controlWrappers.length === 0) return

  // Determine hint element wrapper
  let hintWrapper: HTMLElement | null = null
  const hintBtn = underBoardControls.querySelector('[data-control-btn="hint"]')
  if (hintBtn) {
    // If the button is wrapped in a container class, use that container as the wrapper to clone!
    const wrapper =
      hintBtn.closest(".under-board-controls-item") ||
      hintBtn.closest(".sudoku-under-board__cta")
    hintWrapper = (wrapper || hintBtn) as HTMLElement
  } else {
    hintWrapper = controlWrappers[controlWrappers.length - 1] as HTMLElement
  }
  if (!hintWrapper) return

  // Temporarily pause the observer to prevent infinite recursive self-triggering mutations during injection/styling
  if (observer) observer.disconnect()

  try {
    // Adapt container grid column layout to fit the third "Solve" button side-by-side perfectly
    if (underBoardControls instanceof HTMLElement) {
      underBoardControls.style.display = "grid"
      underBoardControls.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))"
      underBoardControls.style.gap = "8px"
    }

    // Avoid duplicate injection
    let solveWrapper = underBoardControls.querySelector(
      ".linkedin-solver-solve-btn-wrapper"
    ) as HTMLElement
    if (!solveWrapper) {
      // Clone the Hint wrapper
      solveWrapper = hintWrapper.cloneNode(true) as HTMLElement
      solveWrapper.classList.add("linkedin-solver-solve-btn-wrapper")

      // Inject to the right of the Hint button wrapper
      hintWrapper.parentNode?.insertBefore(
        solveWrapper,
        hintWrapper.nextSibling
      )
      console.log(
        "[LinkedIn Games Solver] Injected Solve button next to Hint button successfully."
      )
    }

    // Extract the interactive element inside the wrapper (button for Standard, div wrapper itself for Sudoku)
    const solveButton = solveWrapper.querySelector("button") || solveWrapper
    if (!solveButton) return

    // Detect active game name
    const active = detectActiveSolver()
    const gameId = active ? active.name.toLowerCase() : null

    // Detect if the game is already completed/solved
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
    const undoButton = controlWrappers[0]?.querySelector("button")
    const standardHint =
      controlWrappers[controlWrappers.length - 1]?.querySelector("button")
    if (
      undoButton &&
      standardHint &&
      undoButton.hasAttribute("disabled") &&
      standardHint.hasAttribute("disabled")
    ) {
      const activeName = active ? active.name.toLowerCase() : ""
      const isGridGame = [
        "tango",
        "queens",
        "sudoku",
        "patches",
        "zip"
      ].includes(activeName)
      if (isGridGame) {
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

    const isGameEnded = !!seeResults || isSudokuEnded || controlsEnded

    if (isGameEnded) {
      solveButton.setAttribute("disabled", "true")
      solveButton.classList.add(
        "is-disabled",
        "sudoku-under-board__cta--disabled"
      )
      solveButton.setAttribute("aria-disabled", "true")

      // Auto-record if the game is already completed when visiting or freshly finished
      if (gameId) {
        const finalSeconds = detectFinalSolveTime()
        saveGameCompleted(gameId, finalSeconds)
      }
    } else {
      solveButton.removeAttribute("disabled")
      solveButton.classList.remove(
        "is-disabled",
        "sudoku-under-board__cta--disabled"
      )
      solveButton.setAttribute("aria-disabled", "false")
    }

    // Find the innermost leaf span with no child elements (where the localized label resides) to change it to "Solve"
    const spanText = Array.from(solveButton.querySelectorAll("span")).find(
      (span) => span.children.length === 0
    )

    const textTarget = spanText || solveButton

    // Clean up label injection for Sudoku (preserving the cloned SVG lightbulb icon beautifully)
    if (
      textTarget.textContent &&
      !textTarget.textContent.includes("Solving...") &&
      !textTarget.textContent.includes("Solved!") &&
      !textTarget.textContent.includes("Failed!") &&
      !textTarget.textContent.includes("Solve")
    ) {
      if (
        textTarget === solveButton &&
        !solveButton.querySelector(".solve-btn-text-node")
      ) {
        // Clear any floating text nodes from the cloned div, but keep the SVG icon!
        Array.from(solveButton.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.remove()
          }
        })
        const textSpan = document.createElement("span")
        textSpan.className = "solve-btn-text-node"
        textSpan.textContent = "Solve"
        solveButton.appendChild(textSpan)
      } else {
        const spanNode = solveButton.querySelector(".solve-btn-text-node")
        if (spanNode) {
          spanNode.textContent = "Solve"
        } else {
          textTarget.textContent = "Solve"
        }
      }
    } else if (
      !textTarget.textContent ||
      textTarget.textContent.trim() === ""
    ) {
      textTarget.textContent = "Solve"
    }

    // Bind click listener only if we haven't already
    if (!solveButton.dataset.listenerBound) {
      solveButton.dataset.listenerBound = "true"
      solveButton.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!active) {
          console.warn(
            "[LinkedIn Games Solver] No active game solver detected on this board."
          )
          return
        }

        // Set solving state
        solveButton.setAttribute("disabled", "true")
        solveButton.setAttribute("aria-disabled", "true")
        solveButton.classList.add(
          "is-disabled",
          "sudoku-under-board__cta--disabled"
        )

        const labelNode =
          solveButton.querySelector(".solve-btn-text-node") || textTarget
        const originalText = labelNode.textContent || "Solve"
        labelNode.textContent = "Solving..."

        const startTime = Date.now()

        active
          .solve()
          .then(() => {
            labelNode.textContent = "Solved!"

            // Calculate active solving duration in seconds
            const durationSeconds = Math.round((Date.now() - startTime) / 1000)
            saveGameCompleted(active.name.toLowerCase(), durationSeconds)

            setTimeout(() => {
              labelNode.textContent = originalText
              // Only re-enable if the game hasn't officially completed
              const freshSeeResults = document.querySelector(
                'a[href*="/results/"], a[href*="/results"], .games-share-footer'
              )
              if (!freshSeeResults) {
                solveButton.removeAttribute("disabled")
                solveButton.setAttribute("aria-disabled", "false")
                solveButton.classList.remove(
                  "is-disabled",
                  "sudoku-under-board__cta--disabled"
                )
              }
            }, 2500)
          })
          .catch((err) => {
            labelNode.textContent = "Failed!"
            console.error("[LinkedIn Games Solver] solver failed:", err)
            setTimeout(() => {
              labelNode.textContent = originalText
              const freshSeeResults = document.querySelector(
                'a[href*="/results/"], a[href*="/results"], .games-share-footer'
              )
              if (!freshSeeResults) {
                solveButton.removeAttribute("disabled")
                solveButton.setAttribute("aria-disabled", "false")
                solveButton.classList.remove(
                  "is-disabled",
                  "sudoku-under-board__cta--disabled"
                )
              }
            }, 2500)
          })
      })
    }
  } finally {
    // Re-engage the MutationObserver after style updates/injection are safely completed
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }
}

// Initial detection run on script injection
checkVisitedGameSolved()

// Set up periodic scanning and DOM observers for instant, super-responsive injection
setInterval(injectSolveButton, 1000)
setInterval(checkVisitedGameSolved, 1500)

// Initialize debounced MutationObserver
observer = new MutationObserver(() => {
  if (injectionTimeout) clearTimeout(injectionTimeout)
  injectionTimeout = setTimeout(() => {
    injectSolveButton()
    checkVisitedGameSolved()
  }, 100) // 100ms debounce prevents CPU saturation during massive page loads
})
observer.observe(document.body, { childList: true, subtree: true })

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "detectGame") {
    try {
      const active = detectActiveSolver()
      sendResponse({ game: active ? active.name.toLowerCase() : null })
    } catch (e) {
      console.error("[LinkedIn Games Solver] Game detection failed:", e)
      const errMsg = e instanceof Error ? e.message : String(e)
      sendResponse({ game: null, error: errMsg })
    }
    return true
  }

  if (message.action === "solve") {
    const active = detectActiveSolver()
    if (!active) {
      sendResponse({
        success: false,
        error:
          "No matching game solver detected on this page. Please make sure you are on an active game board."
      })
      return
    }

    console.log(`[LinkedIn Games Solver] Executing solver for: ${active.name}`)

    const startTime = Date.now()
    active
      .solve()
      .then(() => {
        console.log(
          `[LinkedIn Games Solver] Solver ${active.name} completed successfully.`
        )
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)
        saveGameCompleted(active.name.toLowerCase(), durationSeconds)
        sendResponse({ success: true })
      })
      .catch((err) => {
        console.error(
          `[LinkedIn Games Solver] Solver ${active.name} failed:`,
          err
        )
        const errMsg = err instanceof Error ? err.message : String(err)
        sendResponse({ success: false, error: errMsg })
      })

    return true
  }
})
