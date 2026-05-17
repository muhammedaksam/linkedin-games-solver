import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Moon,
  Settings,
  Sparkles,
  Sun
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

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
    errorChromeTabIntegration:
      "Chrome tab integration is only available inside browser extensions.",
    errorActiveTabNotFound: "Could not find the active browser tab.",
    errorNavigationFailed: "Failed to navigate to the $1 board automatically.",
    errorConnectionFailed:
      "Could not connect to LinkedIn page. Please reload the tab and try again.",
    errorExecutionFailedDefault: "Solver execution failed unexpectedly.",
    successSolverStarted: "Solver successfully started! Running...",
    solvingStatus: "Solving...",
    sudoku: "Sudoku",
    tango: "Tango",
    queens: "Queens",
    zip: "Zip",
    patches: "Patches",
    crossclimb: "Crossclimb",
    pinpoint: "Pinpoint",
    titleSolve: "Solve $1",
    titleCompleted: "Completed today! Click to navigate to $1",
    titleOpen: "Open $1 to solve",
    perfectDay: "Perfect day! All $1 games completed! 🎉",
    dailyProgress: "Daily progress: $1 of $2 games completed today",
    dashboardTitle: "History & Statistics",
    settingModel: "Model",
    settingModelSelect: "Select Model",
    settingModelCustomOption: "Custom Model Name...",
    settingModelCustomLabel: "Custom Model Name",
    settingModelCustomPlaceholderLocal: "e.g. llama3, mistral",
    settingModelCustomPlaceholderOther: "Enter custom identifier...",
    settingEndpointLabel: "Endpoint URL",
    settingEndpointPlaceholder: "e.g. http://localhost:11434/v1",
    settingApiKeyGemini: "Gemini API Key",
    settingApiKeyOpenAI: "OpenAI API Key",
    settingApiKeyAnthropic: "Anthropic API Key",
    settingApiKeyDeepSeek: "DeepSeek API Key",
    settingApiKeyCustom: "API Key (Optional)",
    settingApiKeyPlaceholderCustom: "Optional credentials...",
    settingApiKeyPlaceholderDefault: "Enter credentials key...",
    settingApiKeyNotice:
      "Selected model solves Crossclimb & Pinpoint. The extension never shares your key."
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
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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

  const [solveHistory] = useStorage<SolveHistory>(
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
    const isActiveTabLinkedInGame = tab.url?.includes(
      `linkedin.com/games/${gamePath}`
    )

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
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-1.5 rounded-md border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none",
              showSettings &&
                "bg-accent text-accent-foreground border-emerald-500/30"
            )}
            title="AI Settings">
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button
            type="button"
            onClick={openDashboard}
            className="p-1.5 rounded-md border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none"
            title={getMessage("dashboardTitle")}>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm outline-none"
            title={getMessage(
              "switchThemeTitle",
              theme === "dark" ? "light" : "dark"
            )}>
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-orange-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-600" />
            )}
          </button>
        </div>
      </header>

      {/* Slide-out / Collapse API Settings panel */}
      {showSettings && (
        <div className="mb-5 p-4 rounded-lg border border-border bg-card/60 backdrop-blur-md text-card-foreground shadow-sm animate-in slide-in-from-top-2 duration-300 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Key className="w-3.5 h-3.5 text-emerald-500" />
            <h3 className="text-xs font-semibold text-foreground">
              AI Configuration
            </h3>
          </div>

          <div className="space-y-3">
            {/* AI Provider */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground block font-medium">
                AI Provider
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
                <SelectTrigger className="w-full text-xs h-8 bg-card/50 border border-border hover:border-emerald-500/30 justify-between">
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
                <span className="text-[10px] text-muted-foreground block font-medium">
                  {getMessage("settingModel")}
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
                  <SelectTrigger className="w-full text-xs h-8 bg-card/50 border border-border hover:border-emerald-500/30 justify-between">
                    <SelectValue placeholder={getMessage("settingModelSelect")}>
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
                  className="text-[10px] text-muted-foreground block font-medium">
                  {getMessage("settingModelCustomLabel")}
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
                />
              </div>
            )}

            {/* Custom Endpoint Input Slot */}
            {aiProvider === "custom" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="ai-custom-endpoint"
                  className="text-[10px] text-muted-foreground block font-medium">
                  {getMessage("settingEndpointLabel")}
                </label>
                <Input
                  id="ai-custom-endpoint"
                  type="text"
                  value={aiCustomEndpoint || ""}
                  onChange={(e) => setAiCustomEndpoint(e.target.value)}
                  placeholder={getMessage("settingEndpointPlaceholder")}
                />
              </div>
            )}

            {/* API Key */}
            <div className="space-y-1.5">
              <label
                htmlFor="ai-api-key"
                className="text-[10px] text-muted-foreground block font-medium">
                {aiProvider === "gemini" && getMessage("settingApiKeyGemini")}
                {aiProvider === "openai" && getMessage("settingApiKeyOpenAI")}
                {aiProvider === "anthropic" &&
                  getMessage("settingApiKeyAnthropic")}
                {aiProvider === "deepseek" &&
                  getMessage("settingApiKeyDeepSeek")}
                {aiProvider === "custom" && getMessage("settingApiKeyCustom")}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="ai-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey || ""}
                  onChange={(e) => {
                    setAiApiKey(e.target.value)
                    // If Gemini, sync to legacy key to support options pages
                    if (aiProvider === "gemini") {
                      setGeminiApiKey(e.target.value)
                    }
                  }}
                  placeholder={
                    aiProvider === "custom"
                      ? getMessage("settingApiKeyPlaceholderCustom")
                      : getMessage("settingApiKeyPlaceholderDefault")
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showApiKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/80 leading-relaxed pt-1.5 border-t border-border/40">
            {getMessage("settingApiKeyNotice")}
          </p>
        </div>
      )}

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
                    "p-2 rounded-md bg-secondary transition-colors duration-200 flex items-center justify-center shrink-0 w-8 h-8",
                    (isActive || isCompleted) && game.color.popupIconBg
                  )}>
                  <img src={game.icon} alt={localizedTitle} className="w-5 h-5 object-contain" />
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tracking-tight transition-colors",
                    (isActive || isCompleted) &&
                      `${game.color.popupTextAccent} font-semibold`
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
                      isActive &&
                        `${game.color.popupIndicatorDot} animate-pulse-slow`
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
              {getMessage("dailyProgress", [
                String(solvedCount),
                String(GAMES_CONFIG.length)
              ])}
            </span>
          )}
        </div>
      </footer>
    </main>
  )
}

export default IndexPopup
