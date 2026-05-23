import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  Home,
  Key,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Undo2
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { DisclaimerFooter } from "~/components/disclaimer-footer"
import { LanguageSwitcher } from "~/components/LanguageSwitcher"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "~/components/ui/context-menu"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "~/components/ui/select"
import { GAMES_CONFIG } from "~/lib/games-config"
import { localStorage } from "~/lib/storage"
import { cn } from "~/lib/utils"

import "./popup.css"

import { getMessage } from "~lib/i18n"

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

type SolveHistory = Record<string, Record<string, SolveRecord>>

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
  custom: []
}

// Generate local YYYY-MM-DD date key
function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Generate daily puzzle numbers dynamically based on reference dates
function getPuzzleNumber(gameId: string): number {
  const referenceDate = new Date(2026, 4, 18) // May 18, 2026
  const today = new Date()

  // Reset times to midnight for precise day calculation
  referenceDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - referenceDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  const baseNumbers: Record<string, number> = {
    queens: 748,
    patches: 62,
    zip: 427,
    sudoku: 280,
    tango: 588,
    crossclimb: 748,
    pinpoint: 748
  }

  const base = baseNumbers[gameId] || 748
  return base + diffDays
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
  custom: "Custom / Local Endpoint"
}

function IndexPopup() {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [solving, setSolving] = useState<boolean>(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [solveSuccess, setSolveSuccess] = useState<boolean>(false)

  // Reactive state hooks synchronized through @plasmohq/storage
  const [theme, setTheme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: localStorage
    },
    "dark"
  )

  const [geminiApiKey, setGeminiApiKey] = useStorage<string>(
    {
      key: "geminiApiKey",
      instance: localStorage
    },
    ""
  )

  const [solveHistory, setSolveHistory] = useStorage<SolveHistory>(
    {
      key: "solveHistory",
      instance: localStorage
    },
    {}
  )

  // Multi-Provider settings storage hooks
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
      instance: localStorage
    },
    "normal"
  )

  const [defaultSolveMode, setDefaultSolveMode] = useStorage<string>(
    {
      key: "defaultSolveMode",
      instance: localStorage
    },
    "full"
  )

  // Backward compatibility migration: copy legacy key if set
  useEffect(() => {
    if (geminiApiKey && !aiApiKey && aiProvider === "gemini") {
      setAiApiKey(geminiApiKey)
    }
  }, [geminiApiKey, aiApiKey, aiProvider, setAiApiKey])

  // AI Key configuration UI toggle
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [showApiKey, setShowApiKey] = useState<boolean>(false)

  // Sync theme class to standard shadcn layout root
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

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

  // Sync active game on mount
  useEffect(() => {
    detectActiveGame()
  }, [detectActiveGame])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
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

    const getGamePath = (id: string) => (id === "sudoku" ? "mini-sudoku" : id)
    const gamePath = getGamePath(gameId)
    const dateKey = getLocalDateString()
    const isCompleted = !!solveHistory?.[dateKey]?.[gameId]?.solved

    // If the game is already completed today, navigate directly to the results page
    if (isCompleted) {
      try {
        const tabs = await chrome.tabs.query({
          url: `*://*.linkedin.com/games/${gamePath}*`
        })

        const targetUrl = `https://www.linkedin.com/games/${gamePath}/results/`

        if (tabs.length > 0 && tabs[0].id !== undefined) {
          // Switch to existing tab and update its URL to results if not already there
          await chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl })
          if (tabs[0].windowId) {
            await chrome.windows.update(tabs[0].windowId, { focused: true })
          }
          console.log(
            `[LinkedIn Games Solver] Switched and navigated existing tab to results for ${gameId}.`
          )
        } else {
          // Create new tab directly pointing to results
          await chrome.tabs.create({ url: targetUrl })
          console.log(
            `[LinkedIn Games Solver] Opened new tab for ${gameId} results page.`
          )
        }
      } catch (e) {
        console.error("Results page navigation failed:", e)
        setSolveError(getMessage("errorNavigationFailed", gameId.toUpperCase()))
      }
      return
    }

    const isActiveTabLinkedInGame = tab.url?.includes(
      `linkedin.com/games/${gamePath}`
    )

    // If the card clicked is NOT the active game on the current tab, switch/open it
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
          console.log(
            `[LinkedIn Games Solver] Switched to existing tab for ${gameId}.`
          )
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
      { action: "solve", game: gameId, mode: defaultSolveMode },
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

  const handleMarkNotPlayed = async (gameId: string) => {
    const dateKey = getLocalDateString()
    const updated = { ...solveHistory }
    if (updated[dateKey]) {
      const { [gameId]: _, ...rest } = updated[dateKey]
      if (Object.keys(rest).length === 0) {
        delete updated[dateKey]
      } else {
        updated[dateKey] = rest
      }
    }
    await setSolveHistory(updated)
  }

  // Derive daily completion counts reactively from solveHistory storage state
  const dateKey = getLocalDateString()
  const todayGames = solveHistory?.[dateKey] || {}
  const completedToday: Record<string, boolean> = {}
  for (const gameId of Object.keys(todayGames)) {
    if (todayGames[gameId]?.solved) {
      completedToday[gameId] = true
    }
  }

  const solvedCount = Object.values(completedToday).filter(Boolean).length

  // Global Nav Items styled as LinkedIn Tab icons
  const navItems = [
    {
      id: "home",
      label: getMessage("navHome"),
      icon: Home,
      active: !showSettings,
      onClick: () => setShowSettings(false)
    },
    {
      id: "settings",
      label: getMessage("navAiConfig"),
      icon: Settings,
      active: showSettings,
      onClick: () => setShowSettings(true)
    },
    {
      id: "dashboard",
      label: getMessage("navStats"),
      icon: BarChart3,
      active: false,
      onClick: openDashboard
    },
    {
      id: "theme",
      label: getMessage("navTheme"),
      icon: theme === "dark" ? Sun : Moon,
      active: false,
      onClick: toggleTheme
    }
  ]

  return (
    <main className="flex flex-col min-h-[520px] select-none bg-background text-foreground transition-colors duration-200">
      {/* LinkedIn Miniature Top Navigation Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 border-b border-border bg-card shadow-sm h-[52px]">
        {/* Left: Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-[22px] h-[22px] rounded bg-[#0a66c2] dark:bg-[#ffffff] flex items-center justify-center font-extrabold text-white dark:text-[#1d2226] text-[9px] select-none tracking-tighter leading-none shrink-0">
            win
          </div>
          <div className="h-3.5 w-[1px] bg-border mx-0.5" />
          <span
            className="text-[12px] font-bold tracking-tight text-foreground whitespace-nowrap"
            style={{ fontFamily: "Source Sans 3, sans-serif" }}>
            {getMessage("gamesSolverTitle")}
          </span>
        </div>

        {/* Right: LinkedIn Global Nav Links */}
        <div className="flex items-center gap-2 h-full">
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full px-1 text-muted-foreground hover:text-foreground transition-all select-none outline-none border-none bg-transparent pt-1",
                  item.active && "text-foreground"
                )}>
                <IconComponent
                  className={cn(
                    "w-[18px] h-[18px] transition-transform active:scale-95",
                    item.active && "stroke-[2.2px]"
                  )}
                />
                <span className="text-[9px] mt-[3px] font-medium leading-none tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
                {item.active && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground rounded-t" />
                )}
              </button>
            )
          })}
          <div className="h-4 w-[1px] bg-border mx-0.5" />
          <LanguageSwitcher align="right" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 pb-6 space-y-4 overflow-y-auto max-h-[468px]">
        {solveError && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-semibold">
              {solveError}
            </div>
          </div>
        )}

        {solveSuccess && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-4 h-4 text-[#057642] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-semibold">
              {getMessage("successSolverStarted")}
            </div>
          </div>
        )}

        {/* AI Config Tab View */}
        {showSettings ? (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Key className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
              <h3 className="text-sm font-bold text-foreground">
                {getMessage("settingsHeaderTitle")}
              </h3>
            </div>

            <div className="space-y-4">
              {/* AI Provider */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("labelAiProvider")}
                </span>
                <Select
                  value={aiProvider || "gemini"}
                  onValueChange={(val) => {
                    setAiProvider(val)
                    // Autoselect a sensible default model
                    if (val === "gemini") setAiModel("gemini-2.5-flash")
                    else if (val === "openai") setAiModel("gpt-4o-mini")
                    else if (val === "anthropic") setAiModel("claude-3-5-haiku")
                    else if (val === "deepseek") setAiModel("deepseek-chat")
                    else if (val === "custom") setAiModel("")
                  }}>
                  <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus:ring-1 focus:ring-[#0a66c2] dark:focus:ring-[#70b5f9] justify-between">
                    <SelectValue placeholder="Select Provider">
                      {PROVIDER_LABELS[aiProvider] || "Select Provider"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="custom">
                      Custom / Local Endpoint
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Model */}
              {aiProvider !== "custom" && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
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
                    <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
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
              {(aiProvider === "custom" ||
                !PROVIDER_MODELS[aiProvider]?.some(
                  (m) => m.value === aiModel
                )) && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="ai-model-input"
                    className="text-[10px] font-bold text-muted-foreground block tracking-wider">
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
                    className="text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                  />
                </div>
              )}

              {/* Custom Endpoint Input Slot */}
              {aiProvider === "custom" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="ai-custom-endpoint"
                    className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                    {getMessage("labelEndpointUrl")}
                  </label>
                  <Input
                    id="ai-custom-endpoint"
                    type="text"
                    value={aiCustomEndpoint || ""}
                    onChange={(e) => setAiCustomEndpoint(e.target.value)}
                    placeholder={getMessage("settingEndpointPlaceholder")}
                    className="text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                  />
                </div>
              )}

              {/* API Key */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ai-api-key"
                  className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {aiProvider === "gemini" && getMessage("labelGeminiKey")}
                  {aiProvider === "openai" && getMessage("labelOpenAiKey")}
                  {aiProvider === "anthropic" &&
                    getMessage("labelAnthropicKey")}
                  {aiProvider === "deepseek" && getMessage("labelDeepSeekKey")}
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
                    className="pr-10 text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1">
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-border/40 my-2" />

            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                <h4 className="text-xs font-bold text-foreground block tracking-wide uppercase">
                  {getMessage("labelSolveSpeed")}
                </h4>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("settingSolveSpeed")}
                </span>
                <Select
                  value={solveSpeed || "normal"}
                  onValueChange={(val) => setSolveSpeed(val)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                    <SelectValue placeholder="Select Solving Speed">
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
                <p className="text-[8px] text-muted-foreground leading-normal mt-1">
                  {getMessage("settingSolveSpeedNotice")}
                </p>
              </div>

              {/* Default Solver Action */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("settingDefaultSolveMode")}
                </span>
                <Select
                  value={defaultSolveMode || "full"}
                  onValueChange={(val) => setDefaultSolveMode(val)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                    <SelectValue placeholder="Select Default Solver Action">
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
                <p className="text-[8px] text-muted-foreground leading-normal mt-1">
                  {getMessage("settingDefaultSolveModeNotice")}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-border/60" />

            <p className="text-[9px] text-muted-foreground leading-relaxed">
              {getMessage("settingApiKeyNotice")}
            </p>

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-full h-9 bg-[#0a66c2] hover:bg-[#004182] dark:bg-[#70b5f9] dark:hover:bg-[#5fa3e5] text-white dark:text-[#1d2226] text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {getMessage("saveAndBack")}
            </button>
          </div>
        ) : (
          /* Games Dashboard View */
          <>
            {/* Connect over fun, daily games Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold tracking-tight text-foreground leading-snug">
                  {getMessage("popupCardTitle")}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {getMessage("popupCardDesc")}
                </p>
              </div>

              <div className="h-[1px] bg-border/60" />

              {/* List of Game Cards */}
              <div className="flex flex-col gap-2.5">
                {GAMES_CONFIG.map((game) => {
                  const isActive = activeGame === game.id
                  const isCompleted = !!completedToday[game.id]
                  const localizedTitle = getMessage(game.id) || game.title
                  const puzzleNumber = getPuzzleNumber(game.id)

                  const gameButton = (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => handleSolve(game.id)}
                      className={cn(
                        "w-full text-left group relative flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 dark:hover:bg-[#222a30] transition-all duration-200 cursor-pointer select-none",
                        isActive &&
                          "border-[#0a66c2] dark:border-[#70b5f9] bg-[#f0f7fe] dark:bg-[#1a2b3c] shadow-sm",
                        isCompleted && "border-border/60 bg-card/60"
                      )}
                      title={
                        isActive
                          ? getMessage("titleSolve", localizedTitle)
                          : isCompleted
                            ? getMessage("titleCompleted", localizedTitle)
                            : getMessage("titleOpen", localizedTitle)
                      }>
                      {/* Left side: Description & Title */}
                      <div className="flex flex-col items-start space-y-0.5 flex-1 pr-3">
                        <span className="text-[10px] text-muted-foreground leading-none">
                          {getMessage(`desc_${game.id}`) || game.description}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs font-bold tracking-tight text-foreground transition-colors",
                              isActive && "text-[#0a66c2] dark:text-[#70b5f9]",
                              isCompleted && "text-muted-foreground"
                            )}>
                            {localizedTitle}
                          </span>
                          <span className="text-[9px] font-semibold text-muted-foreground/70">
                            #{puzzleNumber}
                          </span>
                        </div>

                        {/* Badges / Active Alerts */}
                        {isActive && !isCompleted && !solving && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#0a66c2]/10 dark:bg-[#70b5f9]/10 text-[#0a66c2] dark:text-[#70b5f9] animate-pulse mt-1">
                            <Sparkles className="w-2.5 h-2.5 shrink-0 fill-current" />
                            {getMessage("solveActiveBoard")}
                          </span>
                        )}

                        {solving && isActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse mt-1">
                            <span className="w-1 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
                            {getMessage("solvingWorking")}
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-[#057642] mt-1">
                            {getMessage("completedToday")}
                          </span>
                        )}
                      </div>

                      {/* Right side: Illustration Square */}
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300 relative shadow-sm",
                            game.illustrationBg,
                            isCompleted && "opacity-60"
                          )}>
                          <img
                            src={game.icon}
                            alt={localizedTitle}
                            className={cn(
                              "w-6 h-6 object-contain transition-transform group-hover:scale-110 duration-200",
                              game.illustrationColor
                            )}
                          />

                          {/* Outer glow ring when active */}
                          {isActive && !isCompleted && (
                            <div className="absolute inset-0 rounded-lg border-2 border-[#0a66c2] dark:border-[#70b5f9] animate-ping opacity-30 scale-105 pointer-events-none" />
                          )}
                        </div>

                        {/* Status Pin/Dot */}
                        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-card rounded-full p-0.5 shadow-sm">
                          {isCompleted ? (
                            <div className="w-4 h-4 rounded-full bg-[#057642] flex items-center justify-center animate-in zoom-in duration-300">
                              <CheckCircle2 className="w-3 h-3 text-white stroke-[3px]" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full border-2 border-card flex items-center justify-center",
                                isActive
                                  ? "bg-[#0a66c2] dark:bg-[#70b5f9] animate-pulse"
                                  : "bg-muted-foreground/30"
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  )

                  if (isCompleted) {
                    return (
                      <ContextMenu key={game.id}>
                        <ContextMenuTrigger asChild>
                          {gameButton}
                        </ContextMenuTrigger>
                        <ContextMenuContent className="min-w-[180px]">
                          <ContextMenuItem
                            onClick={() => handleMarkNotPlayed(game.id)}
                            className="text-xs gap-2 cursor-pointer">
                            <Undo2 className="w-3.5 h-3.5" />
                            {getMessage("markAsNotPlayed")}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )
                  }

                  return gameButton
                })}
              </div>
            </div>

            {/* Daily Solves Progress Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h3 className="text-xs font-semibold text-foreground">
                    {getMessage("dailyProgressLabel")}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {solvedCount} / {GAMES_CONFIG.length}{" "}
                  {getMessage("solvedCountSuffix")}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="w-full bg-muted dark:bg-[#293138] h-2 rounded-full overflow-hidden border border-border/30">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    solvedCount === GAMES_CONFIG.length
                      ? "bg-[#057642]" // Completed success green
                      : "bg-[#0a66c2] dark:bg-[#70b5f9]" // Standard blue
                  )}
                  style={{
                    width: `${(solvedCount / GAMES_CONFIG.length) * 100}%`
                  }}
                />
              </div>

              <div className="text-[11px] leading-relaxed text-muted-foreground text-center font-medium pt-3 border-t border-border/40">
                {solvedCount === GAMES_CONFIG.length ? (
                  <span className="text-[#057642] dark:text-emerald-400 font-bold">
                    {getMessage("perfectDay", String(GAMES_CONFIG.length))}
                  </span>
                ) : (
                  <span>
                    {getMessage("dailyProgress", [
                      String(solvedCount),
                      String(GAMES_CONFIG.length)
                    ])}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <DisclaimerFooter />
    </main>
  )
}

export default IndexPopup
