import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles
} from "lucide-react"
import { useEffect, useState } from "react"

import { detectActiveSolver } from "~games"
import { getMessage } from "~lib/i18n"
import { syncStorage as storage, useStorage } from "~lib/storage"
import { getLocalDateString, type SolveHistory } from "~lib/utils"

import {
  getCurrentGameId,
  registerReactCallbacks,
  saveGameCompleted,
  setGlobalSolving,
  updateSolverStatus
} from "../entrypoints/content"

// Generate highly accurate, localized button labels based on active game type
const getLocalizedStrings = (activeGame: string) => {
  const baseGame = activeGame.replace("-bonus", "")
  const isAiGame = baseGame === "crossclimb" || baseGame === "pinpoint"
  const hasI18n = typeof chrome !== "undefined" && chrome.i18n

  return {
    solve: isAiGame
      ? (hasI18n ? getMessage("solveBtn_withAi") : "") || "Solve with AI"
      : (hasI18n ? getMessage("solveBtn_game") : "") || "Solve Game",
    solving: (hasI18n ? getMessage("solveBtn_solving") : "") || "Solving...",
    solved: (hasI18n ? getMessage("solveBtn_solved") : "") || "Solved!",
    hint: (hasI18n ? getMessage("solveBtn_hint") : "") || "Get Hint"
  }
}

export function GameSolverUI() {
  const [storedTheme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: storage
    },
    "dark"
  )

  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    // Dynamically detect theme from the LinkedIn page (html/body classes)
    const detectPageTheme = () => {
      const hasDarkClass =
        document.documentElement.classList.contains("theme--dark") ||
        document.body.classList.contains("theme--dark") ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.body.getAttribute("data-theme") === "dark"

      const hasLightClass =
        document.documentElement.classList.contains("theme--light") ||
        document.body.classList.contains("theme--light") ||
        document.documentElement.getAttribute("data-theme") === "light" ||
        document.body.getAttribute("data-theme") === "light"

      if (hasDarkClass) {
        setActiveTheme("dark")
      } else if (hasLightClass) {
        setActiveTheme("light")
      } else {
        // Fallback to user stored preference if no page classes match
        setActiveTheme(storedTheme || "dark")
      }
    }

    detectPageTheme()

    // Setup an observer to watch for theme switches on the main page dynamically
    const observer = new MutationObserver(detectPageTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    })

    return () => observer.disconnect()
  }, [storedTheme])

  const [solveHistory] = useStorage<SolveHistory>(
    {
      key: "solveHistory",
      instance: storage
    },
    {}
  )

  const [defaultSolveMode] = useStorage<string>(
    {
      key: "defaultSolveMode",
      instance: storage
    },
    "full"
  )

  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [solving, setSolving] = useState(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [solveSuccess, setSolveSuccess] = useState(false)

  useEffect(() => {
    registerReactCallbacks({
      setSolving,
      setError: setSolveError,
      setSuccess: setSolveSuccess
    })

    // Auto-dismiss success states
    if (solveSuccess) {
      const t = setTimeout(() => setSolveSuccess(false), 3500)
      return () => clearTimeout(t)
    }

    return () => {
      registerReactCallbacks(null)
    }
  }, [solveSuccess])

  // Auto-dismiss error states
  useEffect(() => {
    if (solveError) {
      const t = setTimeout(() => setSolveError(null), 6000)
      return () => clearTimeout(t)
    }
  }, [solveError])

  // Periodically check the active game solver (with bonus awareness)
  useEffect(() => {
    const check = () => {
      const current = getCurrentGameId()
      setActiveGame(current?.gameId ?? null)
    }
    check()
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!activeGame) return null

  const baseActiveGame = activeGame.replace("-bonus", "")
  const dateKey = getLocalDateString()
  const isCompleted = !!solveHistory?.[dateKey]?.[activeGame]?.solved

  const handleSolve = async (mode: "full" | "hint" = "full") => {
    if (solving) return

    const currentActive = detectActiveSolver()
    if (!currentActive) {
      setSolveError("No active game solver detected.")
      return
    }

    setGlobalSolving(true)
    setSolving(true)
    setSolveError(null)
    setSolveSuccess(false)
    updateSolverStatus("solving")

    console.log(
      `[LinkedIn Games Solver UI] Solving active board for: ${currentActive.name} (mode: ${mode})`
    )
    const startTime = Date.now()
    try {
      await currentActive.solve(mode)
      if (mode !== "hint") {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)
        await saveGameCompleted(activeGame, durationSeconds)
      }
      setSolveSuccess(true)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setSolveError(errMsg)
    } finally {
      setGlobalSolving(false)
      setSolving(false)
      updateSolverStatus("idle")
    }
  }

  const handleResultsClick = () => {
    const getGamePath = (id: string) => (id === "sudoku" ? "mini-sudoku" : id)
    const gamePath = getGamePath(baseActiveGame)
    window.location.assign(
      `https://www.linkedin.com/games/${gamePath}/results/`
    )
  }

  const strings = getLocalizedStrings(baseActiveGame)

  return (
    <div
      className={activeTheme}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        height: "32px",
        position: "relative"
      }}>
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
      ) : defaultSolveMode === "hint" ? (
        <>
          <button
            type="button"
            onClick={() => handleSolve("hint")}
            className="solver-btn solver-btn-active"
            title="Get a hint for the next single move or check for errors.">
            <Lightbulb className="solver-icon" />
            <span>{strings.hint}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSolve("full")}
            className="solver-btn solver-btn-active"
            style={{ opacity: 0.7 }}
            title={
              baseActiveGame === "crossclimb" || baseActiveGame === "pinpoint"
                ? "Solve this puzzle automatically using AI solver."
                : "Solve this puzzle using algorithmic steps."
            }>
            <Sparkles className="solver-icon" />
            <span>{strings.solve}</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => handleSolve("full")}
            className="solver-btn solver-btn-active"
            title={
              baseActiveGame === "crossclimb" || baseActiveGame === "pinpoint"
                ? "Solve this puzzle automatically using AI solver."
                : "Solve this puzzle using algorithmic steps."
            }>
            <Sparkles className="solver-icon" />
            <span>{strings.solve}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSolve("hint")}
            className="solver-btn solver-btn-active"
            style={{ opacity: 0.7 }}
            title="Get a hint for the next single move or check for errors.">
            <Lightbulb className="solver-icon" />
            <span>{strings.hint}</span>
          </button>
        </>
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
