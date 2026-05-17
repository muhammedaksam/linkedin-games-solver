import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Moon,
  Sparkles,
  Sun
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { GAMES_CONFIG } from "~/lib/games-config"
import { cn } from "~/lib/utils"

import "./popup.css"

// Safe development/chrome localization getter
function getMessage(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    return chrome.i18n.getMessage(key, substitutions)
  }
  
  // Safe runtime development fallback (so it runs perfectly in web preview or testing)
  const fallbacks: Record<string, string> = {
    title: "LinkedIn Games",
    subtitle: "Solve active boards in a single click",
    switchThemeTitle: "Switch to $1 mode",
    errorChromeTabIntegration: "Chrome tab integration is only available inside browser extensions.",
    errorActiveTabNotFound: "Could not find the active browser tab.",
    errorNavigationFailed: "Failed to navigate to the $1 board automatically.",
    errorConnectionFailed: "Could not connect to LinkedIn page. Please reload the tab and try again.",
    errorExecutionFailedDefault: "Solver execution failed unexpectedly.",
    successSolverStarted: "Solver successfully started! Running...",
    solvingStatus: "Solving...",
    sudoku: "Sudoku",
    tango: "Tango",
    queens: "Queens",
    zip: "Zip",
    patches: "Patches",
    titleSolve: "Solve $1",
    titleCompleted: "Completed today! Click to navigate to $1",
    titleOpen: "Open $1 to solve",
    perfectDay: "Perfect day! All $1 games completed! 🎉",
    dailyProgress: "Daily progress: $1 of $2 games completed today",
    dashboardTitle: "History & Statistics"
  }
  let msg = fallbacks[key] || key
  if (substitutions) {
    const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
    subs.forEach((sub, index) => {
      msg = msg.replace(`$${index + 1}`, sub)
    })
  }
  return msg
}

// Generate local YYYY-MM-DD date key
function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function IndexPopup() {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [solving, setSolving] = useState<boolean>(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [solveSuccess, setSolveSuccess] = useState<boolean>(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>({})

  // Load theme preference on mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get("theme").then((res) => {
        if (res.theme === "light" || res.theme === "dark") {
          setTheme(res.theme)
        }
      })
    }
  }, [])

  // Sync theme class to standard shadcn layout root
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  // Load completion history for today from chrome.storage.local
  const loadCompletionHistory = useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return
    try {
      const dateKey = getLocalDateString()
      const result = await chrome.storage.local.get("solveHistory")
      const history = result.solveHistory || {}
      const todayGames = history[dateKey] || {}

      const completed: Record<string, boolean> = {}
      for (const gameId of Object.keys(todayGames)) {
        if (todayGames[gameId]?.solved) {
          completed[gameId] = true
        }
      }
      setCompletedToday(completed)
    } catch (e) {
      console.error("Failed to load completion history:", e)
    }
  }, [])

  const detectActiveGame = useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome.tabs) return

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.id && tab?.url?.includes("linkedin.com/games/")) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "detectGame" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log("No content script responsive yet.")
              return
            }
            if (response?.game) {
              console.log("Detected game on page:", response.game)
              setActiveGame(response.game)
            }
          }
        )
      }
    } catch (e) {
      console.error("Failed to detect active game:", e)
    }
  }, [])

  // Sync active game and completion logs on mount
  useEffect(() => {
    detectActiveGame()
    loadCompletionHistory()

    // Dynamically listen for completion state writes from the content script
    if (typeof chrome !== "undefined" && chrome.storage) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
      ) => {
        if (areaName === "local" && changes.solveHistory) {
          loadCompletionHistory()
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    }
  }, [detectActiveGame, loadCompletionHistory])

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ theme: nextTheme })
    }
  }

  const openDashboard = () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: "./tabs/dashboard.html" })
    }
  }

  const handleSolve = async (gameId: string) => {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setSolveError(getMessage("errorChromeTabIntegration"))
      return
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      setSolveError(getMessage("errorActiveTabNotFound"))
      return
    }

    const getGamePath = (id: string) => id === "sudoku" ? "mini-sudoku" : id
    const gamePath = getGamePath(gameId)
    const isActiveTabLinkedInGame = tab.url?.includes(`linkedin.com/games/${gamePath}`)

    // If the card clicked is NOT the active game on the current tab, we automatically switch/open it!
    if (activeGame !== gameId && !isActiveTabLinkedInGame) {
      try {
        const tabs = await chrome.tabs.query({
          url: `*://*.linkedin.com/games/${gamePath}*`
        })

        if (tabs.length > 0 && tabs[0].id !== undefined) {
          // Switch to existing tab
          await chrome.tabs.update(tabs[0].id, { active: true })
          // Focus window
          if (tabs[0].windowId) {
            await chrome.windows.update(tabs[0].windowId, { focused: true })
          }
          console.log(`[LinkedIn Games Solver] Switched to existing tab for ${gameId}.`)
        } else {
          // Create new tab
          await chrome.tabs.create({
            url: `https://www.linkedin.com/games/${gamePath}/`
          })
          console.log(`[LinkedIn Games Solver] Opened new tab for ${gameId}.`)
        }
      } catch (e) {
        console.error("Tab switching/creation failed:", e)
        setSolveError(getMessage("errorNavigationFailed", gameId.toUpperCase()))
      }
      return
    }

    // Set state indicators
    setSolving(true)
    setSolveError(null)
    setSolveSuccess(false)

    chrome.tabs.sendMessage(
      tab.id,
      { action: "solve", game: gameId },
      (res) => {
        setSolving(false)

        if (chrome.runtime.lastError) {
          setSolveError(getMessage("errorConnectionFailed"))
          return
        }

        if (res?.success) {
          setSolveSuccess(true)
          setSolveError(null)
          setTimeout(() => setSolveSuccess(false), 3500)
        } else {
          setSolveError(res?.error || getMessage("errorExecutionFailedDefault"))
        }
      }
    )
  }

  const solvedCount = Object.values(completedToday).filter(Boolean).length

  return (
    <main className="flex flex-col h-full min-h-[480px] p-6 select-none animate-in fade-in duration-300">
      <header className="mb-6 flex items-start justify-between">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse-slow" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {getMessage("title")}
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {getMessage("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openDashboard}
            className="p-1.5 rounded-md border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none"
            title={getMessage("dashboardTitle")}>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500 animate-in fade-in duration-300" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none"
            title={getMessage("switchThemeTitle", theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-orange-400 animate-in spin-in-12 duration-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-600 animate-in spin-in-12 duration-500" />
            )}
          </button>
        </div>
      </header>

      {solveError && (
        <div className="flex items-start gap-3 p-3.5 mb-5 rounded-md border border-destructive/20 bg-destructive/10 text-destructive-foreground animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-red-400/90">
            {solveError}
          </div>
        </div>
      )}

      {solveSuccess && (
        <div className="flex items-start gap-3 p-3.5 mb-5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400/90 font-medium">
            {getMessage("successSolverStarted")}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 flex-1 mb-5">
        {GAMES_CONFIG.map((game) => {
          const isActive = activeGame === game.id
          const isCompleted = !!completedToday[game.id]
          const localizedTitle = getMessage(game.id) || game.title
          const IconComponent = game.icon

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => handleSolve(game.id)}
              disabled={solving}
              className={cn(
                "group relative flex flex-col items-center justify-center p-5 text-center transition-all duration-200 rounded-lg border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none",
                isActive && game.color.popupActive,
                isCompleted && !isActive && game.color.popupCompleted
              )}
              title={
                isActive
                  ? getMessage("titleSolve", localizedTitle)
                  : isCompleted
                  ? getMessage("titleCompleted", localizedTitle)
                  : getMessage("titleOpen", localizedTitle)
              }>
              <div className="flex flex-col items-center gap-3 z-10">
                <span
                  className={cn(
                    "p-2 rounded-md bg-secondary text-secondary-foreground transition-colors duration-200",
                    (isActive || isCompleted) && game.color.popupIconBg
                  )}>
                  <IconComponent className="w-4 h-4" />
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tracking-tight transition-colors",
                    (isActive || isCompleted) && `${game.color.popupTextAccent} font-semibold`
                  )}>
                  {localizedTitle}
                </span>
              </div>

              {/* Status Indicator Dot / Checkmark Badge */}
              <div className="absolute top-3 right-3 flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in duration-300" />
                ) : (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full bg-muted-foreground/30 transition-all duration-200",
                      isActive && `${game.color.popupIndicatorDot} animate-pulse-slow`
                    )}
                  />
                )}
              </div>

              {solving && isActive && (
                <div className="absolute inset-x-0 bottom-0 py-1 bg-zinc-950/90 text-[9px] font-semibold tracking-wider uppercase text-emerald-400 rounded-b-lg border-t border-emerald-500/20 animate-pulse-slow">
                  {getMessage("solvingStatus")}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <footer className="mt-auto py-3 px-4 bg-muted/40 border border-border rounded-lg text-center">
        <div className="text-[10px] leading-relaxed text-muted-foreground font-medium flex items-center justify-center gap-1.5">
          {solvedCount === GAMES_CONFIG.length ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {getMessage("perfectDay", String(GAMES_CONFIG.length))}
              </span>
            </>
          ) : (
            <span>
              {getMessage("dailyProgress", [String(solvedCount), String(GAMES_CONFIG.length)])}
            </span>
          )}
        </div>
      </footer>
    </main>
  )
}

export default IndexPopup
