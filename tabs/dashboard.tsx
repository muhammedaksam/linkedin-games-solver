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
import { useEffect, useMemo, useState } from "react"

import { cn } from "~/lib/utils"

import { Calendar } from "../components/ui/calendar"

import "./dashboard.css"

import { GAMES_CONFIG } from "~/lib/games-config"

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
    dashboardTitle: "Solver Dashboard",
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
    patches: "Patches"
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
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [history, setHistory] = useState<
    Record<string, Record<string, SolveRecord>>
  >({})
  const [totalSolved, setTotalSolved] = useState<number>(0)
  const [averageTime, setAverageTime] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [personalBests, setPersonalBests] = useState<
    Record<string, { time: number; date: string }>
  >({})
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Compute date list with completed games to highlight in the calendar
  const solvedDates = useMemo(() => {
    return Object.keys(history).filter((dateStr) => {
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

  // Theme Sync on Mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get("theme").then((res) => {
        if (res.theme === "light" || res.theme === "dark") {
          setTheme(res.theme)
        }
      })
    }
  }, [])

  // Dynamically set document title on mount to avoid raw __MSG_ templates
  useEffect(() => {
    document.title = getMessage("dashboardTitle")
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

  // Load and crunch database stats
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return

    chrome.storage.local.get("solveHistory").then((res) => {
      const rawHistory = res.solveHistory || {}
      setHistory(rawHistory)

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
            if (rec.time && rec.time > 0) {
              totalSeconds += rec.time
              timedCount++

              // Check PB
              if (!pbMap[gameId] || rec.time < pbMap[gameId].time) {
                pbMap[gameId] = { time: rec.time, date: dateKey }
              }
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
        const todayStr = new Date().toISOString().split("T")[0]
        const yesterdayStr = new Date(Date.now() - 86400000)
          .toISOString()
          .split("T")[0]

        // Only start checking if they solved something today or yesterday
        const hasRecentActivity =
          rawHistory[todayStr] || rawHistory[yesterdayStr]

        if (hasRecentActivity) {
          const currentCheck = new Date()
          while (true) {
            const checkStr = currentCheck.toISOString().split("T")[0]
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
    })
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ theme: nextTheme })
    }
  }

  // Generate grouped timeline data sorted reverse chronological
  const sortedDates = useMemo(() => {
    return Object.keys(history)
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 antialiased">
      <div className="max-w-6xl mx-auto px-6 py-8 select-none">
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-border">
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/games/"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 shadow-sm"
              title="Back to LinkedIn Games">
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse-slow" />
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {getMessage("dashboardTitle")}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                {getMessage("dashboardSubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="self-start md:self-auto p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none"
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
        </header>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Total Solved */}
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <span className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
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
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <span className="p-3 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
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
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <span className="p-3 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
              <Flame className="w-6 h-6" />
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
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {getMessage("personalBests")}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full">
              {GAMES_CONFIG.map((game) => {
                const pb = personalBests[game.id]
                const IconComponent = game.icon

                return (
                  <div
                    key={game.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 shadow-sm",
                      pb
                        ? "border-emerald-500/20 bg-emerald-500/[0.01]"
                        : "border-border"
                    )}>
                    <div className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          "p-3 rounded-lg border bg-gradient-to-br flex items-center justify-center shrink-0",
                          game.color.gradient,
                          game.color.text,
                          game.color.border
                        )}>
                        <IconComponent className="w-5 h-5" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">
                          {getMessage(game.id) || game.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {pb ? pb.date : getMessage("noRecordsYet")}
                        </span>
                      </div>
                    </div>
                    {pb && (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 tracking-wider">
                          {formatTime(pb.time)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Activity Calendar */}
            <div className="flex flex-col gap-3 mt-4 w-full">
              <div className="flex items-center justify-between pr-2 w-full">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {getMessage("activityCalendar")}
                  </h2>
                </div>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(undefined)}
                    className="text-[10px] font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition-all cursor-pointer">
                    {getMessage("clearFilter")}
                  </button>
                )}
              </div>
              <div className="w-full">
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
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {getMessage("solvingHistory")}
              </h2>
            </div>

            {sortedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-card text-center text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mb-3 opacity-30 text-emerald-500" />
                <p className="text-xs">{getMessage("noRecordsYet")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {sortedDates.map((dateStr) => {
                  const dateGames = history[dateStr] || {}

                  return (
                    <div key={dateStr} className="flex flex-col gap-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                        {formatDateString(dateStr)}
                      </h3>
                      <div className="flex flex-col gap-2 bg-card border border-border rounded-xl p-4 shadow-sm">
                        {Object.keys(dateGames).map((gameId) => {
                          const record = dateGames[gameId]
                          const gameConfig = GAMES_CONFIG.find(
                            (g) => g.id === gameId
                          )
                          if (!record?.solved) return null
                          const IconComponent = gameConfig?.icon

                          return (
                            <div
                              key={gameId}
                              className="flex items-center justify-between py-2 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
                              <div className="flex items-center gap-3">
                                {gameConfig && IconComponent && (
                                  <span
                                    className={cn(
                                      "p-1.5 rounded border bg-gradient-to-br flex items-center justify-center shrink-0",
                                      gameConfig.color.gradient,
                                      gameConfig.color.text,
                                      gameConfig.color.border
                                    )}>
                                    <IconComponent className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                <span className="text-xs font-bold">
                                  {getMessage(gameId) ||
                                    gameConfig?.title ||
                                    gameId}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {record.time > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(record.time)}
                                  </span>
                                )}
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
    </div>
  )
}
