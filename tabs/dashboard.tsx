import { useEffect, useMemo, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Crown,
  Flame,
  Moon,
  Sparkles,
  Sun,
  Trophy
} from "lucide-react"

import { Calendar } from "../components/ui/calendar"
import { GAMES_CONFIG } from "~/lib/games-config"
import { localStorage } from "~/lib/storage"
import { cn } from "~/lib/utils"

import { DisclaimerFooter } from "~/components/disclaimer-footer"

import "./dashboard.css"

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

// Universal translation helper mirroring popup.tsx
function getMessage(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    return chrome.i18n.getMessage(key, substitutions)
  }

  const fallbacks: Record<string, string> = {
    title: "LinkedIn Games",
    subtitle: "Solve active boards in a single click",
    switchThemeTitle: "Switch to $1 mode",
    dashboardTitle: "Stats & History",
    dashboardSubtitle:
      "Your complete LinkedIn Games solving history & statistics",
    statTotalSolved: "Total Solved",
    statTotalSolvedDesc: "Games solved across all dates",
    statAverageTime: "Average Time",
    statAverageTimeDesc: "Across all recorded completions",
    statActiveStreak: "Active Streak",
    statActiveStreakDesc: "Consecutive active days",
    statStreakDays: "$1 days",
    personalBests: "Personal Bests",
    noRecordsYet: "No solve records recorded yet.",
    solvingHistory: "Solving History",
    sudoku: "Sudoku",
    tango: "Tango",
    queens: "Queens",
    zip: "Zip",
    patches: "Patches",
    crossclimb: "Crossclimb",
    pinpoint: "Pinpoint",
    popupCardTitle: "Connect over fun, daily games",
    popupCardDesc: "Prep your mind for the workday and compare results. Your scores are private unless you share them.",
    saveAndBack: "Save & Back to Games",
    solvingWorking: "AI Solver working...",
    completedToday: "Completed Today",
    solvedCountSuffix: "Solved",
    settingsHeaderTitle: "AI Model Configuration",
    labelAiProvider: "AI PROVIDER",
    labelModelIdentifier: "MODEL IDENTIFIER",
    labelCustomModel: "CUSTOM MODEL NAME",
    labelEndpointUrl: "ENDPOINT URL",
    labelGeminiKey: "GEMINI API KEY",
    labelOpenAiKey: "OPENAI API KEY",
    labelAnthropicKey: "ANTHROPIC API KEY",
    labelDeepSeekKey: "DEEPSEEK API KEY",
    labelCustomKey: "API KEY (OPTIONAL)",
    navHome: "Home",
    navAiConfig: "AI Config",
    navStats: "Stats",
    navTheme: "Theme",
    dailyProgressLabel: "Daily Progress",
    solveActiveBoard: "Solve Active Board",
    backToGames: "Back to LinkedIn Games",
    dashboardLabel: "Dashboard",
    gamesSolverTitle: "Games Solver",
    dashboardDescText: "Analyze your performance metrics, record streaks, and trace your daily completed puzzle paths.",
    completedSuccessfully: "Completed Successfully",
    activityCalendar: "Activity Calendar",
    clearFilter: "Clear Filter"
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

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatDateString(dateStr: string): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, options)
  } catch {
    return dateStr
  }
}

export default function Dashboard() {
  // Reactive state hooks synchronized through @plasmohq/storage
  const [theme, setTheme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: localStorage
    },
    "dark"
  )

  const [history] = useStorage<Record<string, Record<string, SolveRecord>>>(
    {
      key: "solveHistory",
      instance: localStorage
    },
    {}
  )

  const [totalSolved, setTotalSolved] = useState<number>(0)
  const [averageTime, setAverageTime] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [personalBests, setPersonalBests] = useState<
    Record<string, { time: number; date: string }>
  >({})
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Compute date list with completed games to highlight in the calendar
  const solvedDates = useMemo(() => {
    return Object.keys(history || {}).filter((dateStr) => {
      const checkDay = history[dateStr]
      return (
        checkDay && Object.values(checkDay).some((g: SolveRecord) => g?.solved)
      )
    })
  }, [history])

  const hasSolvedOnDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`
    return solvedDates.includes(dateStr)
  }

  // Dynamically set document title on mount
  useEffect(() => {
    document.title = `${getMessage("dashboardTitle")} | LinkedIn Games Solver`
  }, [])

  // Class toggle
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  // Load and crunch database stats reactively whenever history changes
  useEffect(() => {
    const rawHistory = history || {}

    let solvedCount = 0
    let totalSeconds = 0
    let timedCount = 0
    const pbMap: Record<string, { time: number; date: string }> = {}

    // Dates sorted
    const dateKeys = Object.keys(rawHistory).sort()

    dateKeys.forEach((dateKey) => {
      const dayGames = rawHistory[dateKey] || {}
      Object.keys(dayGames).forEach((gameId) => {
        const rec = dayGames[gameId]
        if (rec?.solved) {
          solvedCount++
          // Enforce 1s minimum for older 0s logs in stats calculation
          const solveTime = rec.time !== undefined && rec.time > 0 ? rec.time : 1
          totalSeconds += solveTime
          timedCount++

          // Check PB
          if (!pbMap[gameId] || solveTime < pbMap[gameId].time) {
            pbMap[gameId] = { time: solveTime, date: dateKey }
          }
        }
      })
    })

    setTotalSolved(solvedCount)
    setAverageTime(timedCount > 0 ? Math.round(totalSeconds / timedCount) : 0)
    setPersonalBests(pbMap)

    // Calculate Streak
    let activeStreak = 0
    if (dateKeys.length > 0) {
      const getLocalStr = (d: Date): string => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }
      const todayStr = getLocalStr(new Date())
      const yesterdayStr = getLocalStr(new Date(Date.now() - 86400000))

      // Only start checking if they solved something today or yesterday
      const hasRecentActivity = rawHistory[todayStr] || rawHistory[yesterdayStr]

      if (hasRecentActivity) {
        const currentCheck = new Date()
        while (true) {
          const checkStr = getLocalStr(currentCheck)
          const checkDay = rawHistory[checkStr]
          const solvedOnDay =
            checkDay &&
            Object.values(checkDay).some((g: SolveRecord) => g?.solved)

          if (solvedOnDay) {
            activeStreak++
            currentCheck.setDate(currentCheck.getDate() - 1)
          } else {
            break
          }
        }
      }
    }
    setStreak(activeStreak)
  }, [history])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Generate grouped timeline data sorted reverse chronological
  const sortedDates = useMemo(() => {
    return Object.keys(history || {})
      .filter((dateStr) => {
        if (!selectedDate) return true
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0")
        const day = String(selectedDate.getDate()).padStart(2, "0")
        const dateStrSelected = `${year}-${month}-${day}`
        return dateStr === dateStrSelected
      })
      .sort((a, b) => b.localeCompare(a))
  }, [history, selectedDate])

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 antialiased flex flex-col">
      {/* LinkedIn Desktop Top Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm h-14 w-full flex items-center justify-between px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded bg-[#0a66c2] dark:bg-[#ffffff] flex items-center justify-center font-extrabold text-white dark:text-[#1d2226] text-[11px] select-none tracking-tighter leading-none shrink-0">
              win
            </div>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground" style={{ fontFamily: "Source Sans 3, sans-serif" }}>
                {getMessage("gamesSolverTitle")}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full border border-border/80 bg-muted/30">
                {getMessage("dashboardLabel")}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Mode Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm outline-none"
              title={getMessage(
                "switchThemeTitle",
                theme === "dark" ? "light" : "dark"
              )}>
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-orange-400 animate-in spin-in-12 duration-500" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600 animate-in spin-in-12 duration-500" />
              )}
            </button>

            {/* Back to Games Tab Link */}
            <a
              href="https://www.linkedin.com/games/"
              target="_blank"
              rel="noreferrer"
              className="px-4 h-[32px] rounded-full border border-[#0a66c2] dark:border-[#70b5f9] text-[#0a66c2] dark:text-[#70b5f9] hover:bg-[#eef3f8] dark:hover:bg-[#293138] font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              {getMessage("backToGames")}
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
        
        {/* Title Description Banner */}
        <div className="flex flex-col gap-1 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0a66c2] dark:text-[#70b5f9]" />
            <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "Source Sans 3, sans-serif" }}>
              {getMessage("dashboardSubtitle")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {getMessage("dashboardDescText")}
          </p>
        </div>

        {/* Stats Grid Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Total Solved */}
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group">
            <span className="p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-[#057642] dark:text-emerald-400 shrink-0 transition-transform group-hover:scale-105 duration-200">
              <Trophy className="w-6 h-6" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {getMessage("statTotalSolved")}
              </span>
              <span className="text-2xl font-extrabold text-foreground leading-none">
                {totalSolved}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {getMessage("statTotalSolvedDesc")}
              </span>
            </div>
          </div>

          {/* Card 2: Average Time */}
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group">
            <span className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#0a66c2] dark:text-[#70b5f9] shrink-0 transition-transform group-hover:scale-105 duration-200">
              <Clock className="w-6 h-6" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {getMessage("statAverageTime")}
              </span>
              <span className="text-2xl font-extrabold text-foreground leading-none">
                {averageTime > 0 ? formatTime(averageTime) : "--"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {getMessage("statAverageTimeDesc")}
              </span>
            </div>
          </div>

          {/* Card 3: Active Streak */}
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group">
            <span className="p-3 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-[#e65100] dark:text-[#ffb74d] shrink-0 transition-transform group-hover:scale-105 duration-200">
              <Flame className="w-6 h-6 animate-pulse" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {getMessage("statActiveStreak")}
              </span>
              <span className="text-2xl font-extrabold text-foreground leading-none">
                {(() => {
                  let streakText = getMessage("statStreakDays", String(streak))
                  if (streak === 1) {
                    if (streakText.endsWith(" days")) {
                      streakText = streakText.replace(" days", " day")
                    } else if (streakText.endsWith(" dias")) {
                      streakText = streakText.replace(" dias", " dia")
                    } else if (streakText.endsWith(" días")) {
                      streakText = streakText.replace(" días", " día")
                    } else if (streakText.endsWith(" jours")) {
                      streakText = streakText.replace(" jours", " jour")
                    } else if (streakText.endsWith(" Tage")) {
                      streakText = streakText.replace(" Tage", " Tag")
                    }
                  }
                  return streakText
                })()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {getMessage("statActiveStreakDesc")}
              </span>
            </div>
          </div>
        </section>

        {/* Multi-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Personal Records */}
          <section className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <Crown className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {getMessage("personalBests")}
              </h2>
            </div>

            <div className="flex flex-col gap-3.5 w-full">
              {GAMES_CONFIG.map((game) => {
                const pb = personalBests[game.id]

                return (
                  <div
                    key={game.id}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 shadow-sm group border-border",
                      pb && "border-emerald-500/20 bg-emerald-500/[0.01]"
                    )}>
                    <div className="flex items-center gap-3.5">
                      {/* Brand Illustration Square */}
                      <div className={cn(
                        "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative transition-all duration-300",
                        game.illustrationBg
                      )}>
                        <img
                          src={game.icon}
                          alt={game.title}
                          className={cn(
                            "w-6 h-6 object-contain transition-transform group-hover:scale-110 duration-200",
                            game.illustrationColor
                          )}
                        />
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                          {game.description}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {getMessage(game.id) || game.title}
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground/80 mt-0.5">
                          {pb ? formatDateString(pb.date) : getMessage("noRecordsYet")}
                        </span>
                      </div>
                    </div>
                    {pb && (
                      <div className="flex items-center">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tracking-wider border border-emerald-500/10">
                          {formatTime(pb.time)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Activity Calendar */}
            <div className="flex flex-col gap-3 mt-6 w-full">
              <div className="flex items-center justify-between pr-2 pb-1 border-b border-border/40 w-full">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {getMessage("activityCalendar")}
                  </h2>
                </div>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(undefined)}
                    className="text-[10px] font-bold text-[#0a66c2] dark:text-[#70b5f9] hover:underline transition-all cursor-pointer">
                    {getMessage("clearFilter")}
                  </button>
                )}
              </div>
              <div className="w-full pt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-xl border border-border bg-card shadow-sm w-full p-4"
                  modifiers={{
                    solved: (date) => hasSolvedOnDate(date)
                  }}
                />
              </div>
            </div>
          </section>

          {/* Right Column: Historical Logs */}
          <section className="lg:col-span-3 flex flex-col gap-6 w-full">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <CalendarIcon className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {getMessage("solvingHistory")}
              </h2>
            </div>

            {sortedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-card text-center text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mb-3 opacity-30 text-[#0a66c2] dark:text-[#70b5f9]" />
                <p className="text-xs">{getMessage("noRecordsYet")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {sortedDates.map((dateStr) => {
                  const dateGames = history[dateStr] || {}

                  return (
                    <div key={dateStr} className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                      <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider pl-1">
                        {formatDateString(dateStr)}
                      </h3>
                      <div className="flex flex-col gap-1 bg-card border border-border rounded-xl p-4 shadow-sm">
                        {Object.keys(dateGames).map((gameId) => {
                          const record = dateGames[gameId]
                          const gameConfig = GAMES_CONFIG.find(
                            (g) => g.id === gameId
                          )
                          if (!record?.solved) return null
                          return (
                            <div
                              key={gameId}
                              className="flex items-center justify-between py-2 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
                              <div className="flex items-center gap-3">
                                {gameConfig && (
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative transition-all duration-300",
                                    gameConfig.illustrationBg
                                  )}>
                                    <img
                                      src={gameConfig.icon}
                                      alt={gameConfig.title}
                                      className={cn(
                                        "w-4 h-4 object-contain",
                                        gameConfig.illustrationColor
                                      )}
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">
                                    {getMessage(gameId) ||
                                      gameConfig?.title ||
                                      gameId}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/80 leading-none">
                                    {gameConfig?.description}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTime(record.time > 0 ? record.time : 1)}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-[#057642]" title={getMessage("completedSuccessfully")} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <DisclaimerFooter />
    </div>
  )
}
