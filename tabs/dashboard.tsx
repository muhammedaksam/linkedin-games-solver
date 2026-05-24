import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Key,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trophy
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { DisclaimerFooter } from "~/components/disclaimer-footer"
import { GAMES_CONFIG } from "~/lib/games-config"
import { localStorage, syncStorage } from "~/lib/storage"
import { cn } from "~/lib/utils"

import { Button } from "../components/ui/button"
import { Calendar } from "../components/ui/calendar"
import { Input } from "../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select"

import "./dashboard.css"

import { getMessage, locale } from "~lib/i18n"

import { LanguageSwitcher } from "../components/LanguageSwitcher"

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "Gemini 2.5 Flash (Default)", value: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" }
  ],
  openai: [
    { label: "GPT-4o Mini (Default)", value: "gpt-4o-mini" },
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" }
  ],
  anthropic: [
    { label: "Claude 3.5 Haiku (Default)", value: "claude-3-5-haiku" },
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" }
  ],
  deepseek: [
    { label: "DeepSeek Chat (Default)", value: "deepseek-chat" },
    { label: "DeepSeek Reasoner", value: "deepseek-reasoner" }
  ],
  "chrome-builtin": [{ label: "Gemini Nano (Built-in)", value: "gemini-nano" }],
  custom: []
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
  "chrome-builtin": "Chrome Built-in AI",
  custom: "Custom / Local Endpoint"
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return getMessage("scoreSeconds", String(s))
  return getMessage("scoreMinutesSeconds", [String(m), String(s)])
}

function formatScore(score: number, gameId?: string): string {
  if (!score || score <= 0) return "--"
  if (gameId === "pinpoint") {
    return score === 1
      ? getMessage("scoreClue")
      : getMessage("scoreClues", String(score))
  }
  return formatTime(score)
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
    const intlLocale = locale.replace(/_/g, "-")
    return date.toLocaleDateString(intlLocale, options)
  } catch {
    return dateStr
  }
}

export default function Dashboard() {
  // Navigation Routing Tab state
  const [activeTab, setActiveTab] = useState<"stats" | "settings">(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("options")
    ) {
      return "settings"
    }
    return "stats"
  })

  // Reactive state hooks synchronized through @plasmohq/storage
  const [theme, setTheme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: syncStorage
    },
    "dark"
  )

  const [history] = useStorage<Record<string, Record<string, SolveRecord>>>(
    {
      key: "solveHistory",
      instance: syncStorage
    },
    {}
  )

  // AI Configuration Storage hooks
  const [aiProvider, setAiProvider] = useStorage<string>(
    {
      key: "aiProvider",
      instance: localStorage
    },
    "gemini"
  )

  const [aiModel, setAiModel] = useStorage<string>(
    {
      key: "aiModel",
      instance: localStorage
    },
    "gemini-2.5-flash"
  )

  const [aiApiKey, setAiApiKey] = useStorage<string>(
    {
      key: "aiApiKey",
      instance: localStorage
    },
    ""
  )

  const [aiCustomEndpoint, setAiCustomEndpoint] = useStorage<string>(
    {
      key: "aiCustomEndpoint",
      instance: localStorage
    },
    ""
  )

  const [solveSpeed, setSolveSpeed] = useStorage<string>(
    {
      key: "solveSpeed",
      instance: syncStorage
    },
    "normal"
  )

  const [defaultSolveMode, setDefaultSolveMode] = useStorage<string>(
    {
      key: "defaultSolveMode",
      instance: syncStorage
    },
    "full"
  )

  const [streakRemindersEnabled, setStreakRemindersEnabled] =
    useStorage<boolean>(
      {
        key: "streakRemindersEnabled",
        instance: syncStorage
      },
      false
    )

  const [streakReminderTime, setStreakReminderTime] = useStorage<string>(
    {
      key: "streakReminderTime",
      instance: syncStorage
    },
    "20:00"
  )

  const [geminiApiKey, setGeminiApiKey] = useStorage<string>(
    {
      key: "geminiApiKey",
      instance: localStorage
    },
    ""
  )

  // Backward compatibility migration: copy legacy key if set
  useEffect(() => {
    if (geminiApiKey && !aiApiKey && aiProvider === "gemini") {
      setAiApiKey(geminiApiKey)
    }
  }, [geminiApiKey, aiApiKey, aiProvider, setAiApiKey])

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showAllDates, setShowAllDates] = useState(false)

  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const hasChangedRef = useRef(false)

  // Arm the auto-save notification after initial load settles
  useEffect(() => {
    const t = setTimeout(() => {
      hasChangedRef.current = true
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  // Flash "auto-saved" notification when any setting changes
  const showSaveNotification = useCallback(() => {
    if (!hasChangedRef.current) return
    setSaveStatus(getMessage("settingsAutoSavedNotification"))
    const t = setTimeout(() => setSaveStatus(null), 2500)
    return () => clearTimeout(t)
  }, [])

  // Track settings modification to trigger auto-saved notification
  useEffect(() => {
    return showSaveNotification()
  }, [
    showSaveNotification,
    aiProvider,
    aiModel,
    aiApiKey,
    aiCustomEndpoint,
    solveSpeed,
    defaultSolveMode,
    streakRemindersEnabled,
    streakReminderTime
  ])

  // Compute stats reactively from history using useMemo (no cascading renders)
  const { totalSolved, averageTime, personalBests, streak } = useMemo(() => {
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
          const solveTime =
            rec.time !== undefined && rec.time > 0 ? rec.time : 1

          if (gameId !== "pinpoint") {
            totalSeconds += solveTime
            timedCount++
          }

          // Check PB
          if (!pbMap[gameId] || solveTime < pbMap[gameId].time) {
            pbMap[gameId] = { time: solveTime, date: dateKey }
          }
        }
      })
    })

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
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = getLocalStr(yesterday)

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

    return {
      totalSolved: solvedCount,
      averageTime: timedCount > 0 ? Math.round(totalSeconds / timedCount) : 0,
      personalBests: pbMap,
      streak: activeStreak
    }
  }, [history])

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
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between h-full">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded bg-[#0a66c2] dark:bg-[#ffffff] flex items-center justify-center font-extrabold text-white dark:text-[#1d2226] text-[11px] select-none tracking-tighter leading-none shrink-0">
              win
            </div>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold tracking-tight text-foreground"
                style={{ fontFamily: "Source Sans 3, sans-serif" }}>
                {getMessage("gamesSolverTitle")}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full border border-border/80 bg-muted/30">
                {getMessage("dashboardLabel")}
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <div className="flex items-center gap-6 h-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("stats")}
              className={cn(
                "relative flex items-center gap-1.5 h-full px-4 text-muted-foreground hover:text-foreground font-bold text-xs select-none transition-all outline-none border-none bg-transparent hover:bg-transparent rounded-none",
                activeTab === "stats" && "text-[#0a66c2] dark:text-[#70b5f9]"
              )}>
              <Trophy className="w-3.5 h-3.5" />
              <span>{getMessage("navStats")}</span>
              {activeTab === "stats" && (
                <div className="absolute bottom-0 inset-x-0 h-[3px] bg-[#0a66c2] dark:bg-[#70b5f9] rounded-t" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("settings")}
              className={cn(
                "relative flex items-center gap-1.5 h-full px-4 text-muted-foreground hover:text-foreground font-bold text-xs select-none transition-all outline-none border-none bg-transparent hover:bg-transparent rounded-none",
                activeTab === "settings" && "text-[#0a66c2] dark:text-[#70b5f9]"
              )}>
              <Settings className="w-3.5 h-3.5" />
              <span>{getMessage("navAiConfig")}</span>
              {activeTab === "settings" && (
                <div className="absolute bottom-0 inset-x-0 h-[3px] bg-[#0a66c2] dark:bg-[#70b5f9] rounded-t" />
              )}
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Mode Switch */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
              title={getMessage(
                "switchThemeTitle",
                theme === "dark" ? "light" : "dark"
              )}>
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-orange-400 animate-in spin-in-12 duration-500" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600 animate-in spin-in-12 duration-500" />
              )}
            </Button>

            <div className="h-6 w-[1px] bg-border mx-0.5 shrink-0" />
            <LanguageSwitcher align="right" />
            <div className="h-6 w-[1px] bg-border mx-0.5 shrink-0" />

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
            {activeTab === "stats" ? (
              <Sparkles className="w-5 h-5 text-[#0a66c2] dark:text-[#70b5f9]" />
            ) : (
              <Key className="w-5 h-5 text-[#0a66c2] dark:text-[#70b5f9]" />
            )}
            <h1
              className="text-xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: "Source Sans 3, sans-serif" }}>
              {activeTab === "stats"
                ? getMessage("dashboardSubtitle")
                : getMessage("settingsHeaderTitle")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeTab === "stats"
              ? getMessage("dashboardDescText")
              : getMessage("settingsSubtitleDesc")}
          </p>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === "stats" ? (
          <>
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
                      let streakText = getMessage(
                        "statStreakDays",
                        String(streak)
                      )
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in duration-300">
              {/* Left Column: Personal Records */}
              <section className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                  <Crown className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {getMessage("personalBests")}
                  </h2>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-1 w-full">
                  {GAMES_CONFIG.map((game) => {
                    const pb = personalBests[game.id]

                    return (
                      <div
                        key={game.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-b-0 last:pb-0 first:pt-0 group">
                        <div className="flex items-center gap-3.5">
                          {/* Brand Illustration Square */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative transition-all duration-300",
                              game.illustrationBg
                            )}>
                            <img
                              src={game.icon}
                              alt={game.title}
                              className={cn(
                                "w-5.5 h-5.5 object-contain transition-transform group-hover:scale-110 duration-200",
                                game.illustrationColor
                              )}
                            />
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                              {getMessage(`desc_${game.id}`) ||
                                game.description}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {getMessage(game.id) || game.title}
                            </span>
                            <span className="text-[9px] font-semibold text-muted-foreground/80 mt-0.5">
                              {pb
                                ? formatDateString(pb.date)
                                : getMessage("noRecordsYet")}
                            </span>
                          </div>
                        </div>
                        {pb && (
                          <div className="flex items-center">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tracking-wider border border-emerald-500/10">
                              {formatScore(pb.time, game.id)}
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
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setSelectedDate(undefined)}
                        className="text-[10px] font-bold text-[#0a66c2] dark:text-[#70b5f9] hover:underline transition-all cursor-pointer p-0 h-auto">
                        {getMessage("clearFilter")}
                      </Button>
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
                    {sortedDates
                      .slice(0, showAllDates ? undefined : 5)
                      .map((dateStr) => {
                        const dateGames = history[dateStr] || {}

                        return (
                          <div
                            key={dateStr}
                            className="flex flex-col gap-2.5 animate-in fade-in duration-300">
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
                                        <div
                                          className={cn(
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
                                          {gameConfig
                                            ? getMessage(
                                                `desc_${gameConfig.id}`
                                              ) || gameConfig.description
                                            : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatScore(
                                          record.time > 0 ? record.time : 1,
                                          gameId
                                        )}
                                      </span>
                                      <span
                                        className="w-2 h-2 rounded-full bg-[#057642]"
                                        title={getMessage(
                                          "completedSuccessfully"
                                        )}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}

                    {sortedDates.length > 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 mt-2 w-full text-xs font-bold text-[#0a66c2] dark:text-[#70b5f9] bg-card hover:bg-muted/40 border border-border rounded-xl shadow-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer h-10">
                        {showAllDates ? (
                          <>
                            <span>{getMessage("showLessDates")}</span>
                            <ChevronUp className="w-3.5 h-3.5 animate-pulse" />
                          </>
                        ) : (
                          <>
                            <span>{getMessage("showMoreDates")}</span>
                            <ChevronDown className="w-3.5 h-3.5 animate-pulse" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          /* AI Config Settings View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in duration-300">
            {/* Left Column: Form Settings */}
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <Key className="w-4.5 h-4.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h3 className="text-sm font-bold text-foreground">
                    {getMessage("settingsCredentialsTitle")}
                  </h3>
                </div>

                {saveStatus && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-in fade-in slide-in-from-right-2 duration-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveStatus}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {/* AI Provider Select */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                    {getMessage("labelAiProvider")}
                  </span>
                  <Select
                    value={aiProvider || "gemini"}
                    onValueChange={(val) => {
                      setAiProvider(val)
                      // Autoselect sensible default models
                      if (val === "gemini") setAiModel("gemini-2.5-flash")
                      else if (val === "openai") setAiModel("gpt-4o-mini")
                      else if (val === "anthropic")
                        setAiModel("claude-3-5-haiku")
                      else if (val === "deepseek") setAiModel("deepseek-chat")
                      else if (val === "chrome-builtin")
                        setAiModel("gemini-nano")
                      else if (val === "custom") setAiModel("")
                    }}>
                    <SelectTrigger className="w-full text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus:ring-1 focus:ring-[#0a66c2] dark:focus:ring-[#70b5f9] justify-between">
                      <SelectValue
                        placeholder={getMessage("settingModelSelect")}>
                        {PROVIDER_LABELS[aiProvider] ||
                          getMessage("settingModelSelect")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                      <SelectItem value="anthropic">
                        Anthropic Claude
                      </SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="chrome-builtin">
                        Chrome Built-in AI (Gemini Nano)
                      </SelectItem>
                      <SelectItem value="custom">
                        Custom / Local Endpoint
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Model Select */}
                {aiProvider !== "custom" && aiProvider !== "chrome-builtin" && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {getMessage("labelModelIdentifier")}
                    </span>
                    <Select
                      value={
                        PROVIDER_MODELS[aiProvider]?.some(
                          (m) => m.value === aiModel
                        )
                          ? aiModel
                          : "custom-input"
                      }
                      onValueChange={(val) => {
                        if (val === "custom-input") {
                          setAiModel("")
                        } else {
                          setAiModel(val)
                        }
                      }}>
                      <SelectTrigger className="w-full text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                        <SelectValue
                          placeholder={getMessage("settingModelSelect")}>
                          {PROVIDER_MODELS[aiProvider]?.find(
                            (m) => m.value === aiModel
                          )?.label ||
                            (aiModel
                              ? aiModel
                              : getMessage("settingModelCustomOption"))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_MODELS[aiProvider]?.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom-input">
                          {getMessage("settingModelCustomOption")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom Model Input Slot */}
                {aiProvider !== "chrome-builtin" &&
                  (aiProvider === "custom" ||
                    !PROVIDER_MODELS[aiProvider]?.some(
                      (m) => m.value === aiModel
                    )) && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ai-model-input"
                        className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                        {getMessage("labelCustomModel")}
                      </label>
                      <Input
                        id="ai-model-input"
                        type="text"
                        value={aiModel || ""}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder={
                          aiProvider === "custom"
                            ? getMessage("settingModelCustomPlaceholderLocal")
                            : getMessage("settingModelCustomPlaceholderOther")
                        }
                        className="text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                      />
                    </div>
                  )}

                {/* Custom Endpoint Input Slot */}
                {aiProvider === "custom" && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="ai-custom-endpoint"
                      className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {getMessage("labelEndpointUrl")}
                    </label>
                    <Input
                      id="ai-custom-endpoint"
                      type="text"
                      value={aiCustomEndpoint || ""}
                      onChange={(e) => setAiCustomEndpoint(e.target.value)}
                      placeholder={getMessage("settingEndpointPlaceholder")}
                      className="text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                    />
                  </div>
                )}

                {/* API Key */}
                {aiProvider !== "chrome-builtin" && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="ai-api-key"
                      className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {aiProvider === "gemini" && getMessage("labelGeminiKey")}
                      {aiProvider === "openai" && getMessage("labelOpenAiKey")}
                      {aiProvider === "anthropic" &&
                        getMessage("labelAnthropicKey")}
                      {aiProvider === "deepseek" &&
                        getMessage("labelDeepSeekKey")}
                      {aiProvider === "custom" && getMessage("labelCustomKey")}
                    </label>
                    <div className="relative flex items-center">
                      <Input
                        id="ai-api-key"
                        type={showApiKey ? "text" : "password"}
                        value={aiApiKey || ""}
                        onChange={(e) => {
                          setAiApiKey(e.target.value)
                          if (aiProvider === "gemini") {
                            setGeminiApiKey(e.target.value)
                          }
                        }}
                        placeholder={
                          aiProvider === "custom"
                            ? getMessage("settingApiKeyPlaceholderCustom")
                            : getMessage("settingApiKeyPlaceholderDefault")
                        }
                        className="pr-10 text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-1.5 text-muted-foreground hover:text-foreground transition-colors h-8 w-8 p-0 hover:bg-transparent">
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Local status premium card when chrome-builtin is selected */}
                {aiProvider === "chrome-builtin" && (
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 animate-pulse text-[#0a66c2] dark:text-[#70b5f9]" />
                      Zero Cost & Fully Local AI
                    </div>
                    <div className="text-[11px] leading-relaxed">
                      Using Chrome's built-in Gemini Nano model. No internet
                      connection or external API keys are required to solve
                      puzzles!
                    </div>
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-border/40 my-1" />

              {/* Section 2: Pacing & Solve Speed */}
              <div className="space-y-5 pt-1">
                <div className="flex items-center gap-2.5 border-b border-border pb-2.5">
                  <Gauge className="w-4.5 h-4.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {getMessage("labelSolveSpeed")}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Solving Speed Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {getMessage("settingSolveSpeed")}
                    </span>
                    <Select
                      value={solveSpeed || "normal"}
                      onValueChange={(val) => setSolveSpeed(val)}>
                      <SelectTrigger className="w-full text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                        <SelectValue placeholder="Select Speed">
                          {solveSpeed === "instant" &&
                            getMessage("solveSpeed_instant")}
                          {solveSpeed === "normal" &&
                            getMessage("solveSpeed_normal")}
                          {solveSpeed === "stealth" &&
                            getMessage("solveSpeed_stealth")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">
                          {getMessage("solveSpeed_instant")}
                        </SelectItem>
                        <SelectItem value="normal">
                          {getMessage("solveSpeed_normal")}
                        </SelectItem>
                        <SelectItem value="stealth">
                          {getMessage("solveSpeed_stealth")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                      {getMessage("settingSolveSpeedNotice")}
                    </p>
                  </div>

                  {/* Default Solve Action Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {getMessage("settingDefaultSolveMode")}
                    </span>
                    <Select
                      value={defaultSolveMode || "full"}
                      onValueChange={(val) => setDefaultSolveMode(val)}>
                      <SelectTrigger className="w-full text-xs h-10 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                        <SelectValue placeholder="Select Default Action">
                          {defaultSolveMode === "full" &&
                            getMessage("solveMode_full")}
                          {defaultSolveMode === "hint" &&
                            getMessage("solveMode_hint")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          {getMessage("solveMode_full")}
                        </SelectItem>
                        <SelectItem value="hint">
                          {getMessage("solveMode_hint")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                      {getMessage("settingDefaultSolveModeNotice")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-border/40 my-1" />

              {/* Section 3: Daily Reminders & Streak Protector */}
              <div className="space-y-5 pt-1">
                <div className="flex items-center gap-2.5 border-b border-border pb-2.5">
                  <Bell className="w-4.5 h-4.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {getMessage("labelDailyReminders")}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Enable Reminders Toggle */}
                  <div className="space-y-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                          {getMessage("settingEnableReminders")}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80 leading-normal">
                          {getMessage("settingEnableRemindersDesc")}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={streakRemindersEnabled || false}
                        onChange={(e) =>
                          setStreakRemindersEnabled(e.target.checked)
                        }
                        className="w-4.5 h-4.5 rounded text-[#0a66c2] border-border bg-card focus:ring-[#0a66c2] focus:ring-offset-background cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Reminder Time Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground block tracking-wider uppercase">
                      {getMessage("settingReminderTime")}
                    </span>
                    <input
                      type="time"
                      disabled={!streakRemindersEnabled}
                      value={streakReminderTime || "20:00"}
                      onChange={(e) => setStreakReminderTime(e.target.value)}
                      className="w-full text-xs h-10 px-3 rounded-md bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus:outline-none focus:ring-1 focus:ring-[#0a66c2] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900"
                    />
                    <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                      {getMessage("settingReminderTimeNotice")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-border/60" />

              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground">
                <AlertCircle className="w-4.5 h-4.5 text-orange-400 shrink-0" />
                <p className="text-[10px] leading-relaxed font-semibold">
                  {getMessage("settingApiKeyNotice")}
                </p>
              </div>
            </div>

            {/* Right Column: Informative Setup Guide */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Integration Guide Box */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {getMessage("settingsModelGuideTitle")}
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Gemini */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Google Gemini
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3">
                      {getMessage("settingsGeminiGuideDesc")}
                    </p>
                  </div>

                  {/* Option 2: OpenAI */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      OpenAI (ChatGPT)
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3">
                      {getMessage("settingsOpenaiGuideDesc")}
                    </p>
                  </div>

                  {/* Option 3: Anthropic */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      Anthropic Claude
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3">
                      {getMessage("settingsAnthropicGuideDesc")}
                    </p>
                  </div>

                  {/* Option 4: Local */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Custom / Local Setup
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3">
                      {getMessage("settingsCustomGuideDesc")}
                    </p>
                  </div>

                  {/* Option 5: Chrome Built-in */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Chrome Built-in AI
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3">
                      {getMessage("settingsChromeBuiltInGuideDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Verification Panel */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5">
                  {getMessage("settingsConnectionStatusTitle")}
                </h4>
                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-muted-foreground">
                    {getMessage("settingsActiveSolverLabel")}
                  </span>
                  <span className="font-bold flex items-center gap-1.5 text-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {PROVIDER_LABELS[aiProvider] || "Google Gemini"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-muted-foreground">
                    {getMessage("settingsModelIdentifierLabel")}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
                    {aiModel || "Custom"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <DisclaimerFooter />
    </div>
  )
}
