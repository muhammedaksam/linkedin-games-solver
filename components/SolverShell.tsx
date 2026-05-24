import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Home,
  Key,
  Moon,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  Undo2
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { DisclaimerFooter } from "~/components/disclaimer-footer"
import { LanguageSwitcher } from "~/components/LanguageSwitcher"
import { Button } from "~/components/ui/button"
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
import { localStorage, syncStorage } from "~/lib/storage"
import {
  cn,
  getLocalDateString,
  getPuzzleNumber,
  type SolveHistory
} from "~/lib/utils"
import { getMessage } from "~lib/i18n"

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

export function SolverShell({
  isSidePanel = false
}: {
  isSidePanel?: boolean
}) {
  const [activeTab, setActiveTab] = useState<"home" | "settings" | "debug">(
    "home"
  )
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [solving, setSolving] = useState<boolean>(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [solveSuccess, setSolveSuccess] = useState<boolean>(false)

  // Debug Panel States
  const [debugLogs, setDebugLogs] = useState<
    Array<{ type: string; message: string; timestamp: string }>
  >([])
  const [mainHtml, setMainHtml] = useState<string>("")
  const [debugError, setDebugError] = useState<string | null>(null)
  const [debugTabUrl, setDebugTabUrl] = useState<string>("")
  const [copyHtmlSuccess, setCopyHtmlSuccess] = useState<boolean>(false)
  const [copyLogsSuccess, setCopyLogsSuccess] = useState<boolean>(false)
  const [copyBothSuccess, setCopyBothSuccess] = useState<boolean>(false)

  // Reactive state hooks synchronized through @plasmohq/storage
  const [theme, setTheme] = useStorage<"light" | "dark">(
    {
      key: "theme",
      instance: syncStorage
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
      instance: syncStorage
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

  // Backward compatibility migration: copy legacy key if set
  useEffect(() => {
    if (geminiApiKey && !aiApiKey && aiProvider === "gemini") {
      setAiApiKey(geminiApiKey)
    }
  }, [geminiApiKey, aiApiKey, aiProvider, setAiApiKey])

  // AI Key configuration UI toggle
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

  // Periodic active game detection
  useEffect(() => {
    const checkInterval = setInterval(detectActiveGame, 2000)
    return () => clearInterval(checkInterval)
  }, [detectActiveGame])

  // Fetch debug logs and main html from content script
  const fetchDebugInfo = useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome.tabs) return

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.id && tab?.url) {
        setDebugTabUrl(tab.url)
        if (tab.url.includes("linkedin.com/games/")) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: "getDebugInfo" },
            (response) => {
              if (chrome.runtime.lastError) {
                setDebugError(getMessage("debugErrorInitializing"))
                return
              }
              if (response?.success) {
                setDebugLogs(response.logs || [])
                setMainHtml(response.mainHtml || "")
                setDebugError(null)
              } else {
                setDebugError(
                  response?.error || getMessage("debugErrorRetrieveFailed")
                )
              }
            }
          )
        } else {
          setDebugError(getMessage("debugErrorNotGamesPage"))
        }
      } else {
        setDebugError(getMessage("debugErrorNoActiveTab"))
      }
    } catch (e) {
      setDebugError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // Poll debug logs when debug tab is open
  useEffect(() => {
    if (activeTab === "debug" && isSidePanel) {
      const initialTimer = setTimeout(() => {
        fetchDebugInfo()
      }, 0)
      const interval = setInterval(fetchDebugInfo, 1200)
      return () => {
        clearTimeout(initialTimer)
        clearInterval(interval)
      }
    }
  }, [activeTab, fetchDebugInfo, isSidePanel])

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

  // Debug copying and cleaning actions
  const handleCopyHtml = () => {
    if (!mainHtml) return
    navigator.clipboard
      .writeText(mainHtml)
      .then(() => {
        setCopyHtmlSuccess(true)
        setTimeout(() => setCopyHtmlSuccess(false), 2000)
      })
      .catch((err) => console.error("Failed to copy HTML:", err))
  }

  const handleCopyLogs = () => {
    if (debugLogs.length === 0) return
    const logsText = debugLogs
      .map(
        (log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
      )
      .join("\n")
    navigator.clipboard
      .writeText(logsText)
      .then(() => {
        setCopyLogsSuccess(true)
        setTimeout(() => setCopyLogsSuccess(false), 2000)
      })
      .catch((err) => console.error("Failed to copy logs:", err))
  }

  const handleCopyBoth = () => {
    const logsText = debugLogs
      .map(
        (log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
      )
      .join("\n")
    const combinedText = `=== CONSOLE LOGS ===\n${logsText || "(No logs captured)"}\n\n=== <main> HTML CONTENT ===\n${mainHtml || "(No HTML captured)"}`
    navigator.clipboard
      .writeText(combinedText)
      .then(() => {
        setCopyBothSuccess(true)
        setTimeout(() => setCopyBothSuccess(false), 2000)
      })
      .catch((err) => console.error("Failed to copy combined info:", err))
  }

  const handleClearLogs = async () => {
    if (typeof chrome === "undefined" || !chrome.tabs) return
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.id && tab.url?.includes("linkedin.com/games/")) {
        chrome.tabs.sendMessage(tab.id, { action: "clearDebugLogs" }, (res) => {
          if (!chrome.runtime.lastError && res?.success) {
            setDebugLogs([])
          }
        })
      } else {
        setDebugLogs([])
      }
    } catch (e) {
      setDebugLogs([])
    }
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
      label: getMessage("navHome") || "Home",
      icon: Home,
      active: activeTab === "home",
      onClick: () => setActiveTab("home")
    },
    {
      id: "settings",
      label: getMessage("navAiConfig") || "Settings",
      icon: Settings,
      active: activeTab === "settings",
      onClick: () => setActiveTab("settings")
    }
  ]

  // Add the debug item only in the sidepanel
  if (isSidePanel) {
    navItems.push({
      id: "debug",
      label: getMessage("navDebug") || "Debug",
      icon: Terminal,
      active: activeTab === "debug",
      onClick: () => setActiveTab("debug")
    })
  }

  // Append background statistics and theme toggler
  navItems.push(
    {
      id: "dashboard",
      label: getMessage("navStats") || "Stats",
      icon: BarChart3,
      active: false,
      onClick: openDashboard
    },
    {
      id: "theme",
      label: getMessage("navTheme") || "Theme",
      icon: theme === "dark" ? Sun : Moon,
      active: false,
      onClick: toggleTheme
    }
  )

  return (
    <main
      className={cn(
        "flex flex-col select-none bg-background text-foreground transition-colors duration-200 overflow-hidden",
        isSidePanel ? "h-screen w-full" : "h-[520px] w-[470px]"
      )}>
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
            {getMessage("gamesSolverTitle") || "Games Solver"}
          </span>
        </div>

        {/* Right: LinkedIn Global Nav Links */}
        <div className="flex items-center gap-1.5 h-full">
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={item.onClick}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full text-muted-foreground hover:text-foreground hover:bg-transparent transition-all select-none outline-none border-none bg-transparent pt-1 rounded-none",
                  isSidePanel ? "px-1.5" : "px-1",
                  item.active && "text-foreground"
                )}
                title={item.label}>
                <IconComponent
                  className={cn(
                    "w-[17px] h-[17px] transition-transform active:scale-95",
                    item.active && "stroke-[2.2px]"
                  )}
                />
                {/* Hiding the long text labels completely in narrow sidepanel to prevent squishing */}
                {!isSidePanel && (
                  <span className="text-[9px] mt-[3px] font-medium leading-none tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {item.active && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground rounded-t" />
                )}
              </Button>
            )
          })}
          <div className="h-4 w-[1px] bg-border mx-0.5 shrink-0" />
          <LanguageSwitcher align="right" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 pb-6 space-y-4 overflow-y-auto">
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
              {getMessage("successSolverStarted") ||
                "Solver successfully started!"}
            </div>
          </div>
        )}

        {/* AI Config Tab View */}
        {activeTab === "settings" && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Key className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
              <h3 className="text-sm font-bold text-foreground">
                {getMessage("settingsHeaderTitle") || "AI Model Configuration"}
              </h3>
            </div>

            <div className="space-y-4">
              {/* AI Provider */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("labelAiProvider") || "AI PROVIDER"}
                </span>
                <Select
                  value={aiProvider || "gemini"}
                  onValueChange={(val) => {
                    setAiProvider(val)
                    if (val === "gemini") setAiModel("gemini-2.5-flash")
                    else if (val === "openai") setAiModel("gpt-4o-mini")
                    else if (val === "anthropic") setAiModel("claude-3-5-haiku")
                    else if (val === "deepseek") setAiModel("deepseek-chat")
                    else if (val === "chrome-builtin") setAiModel("gemini-nano")
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
                    <SelectItem value="chrome-builtin">
                      Chrome Built-in AI (Gemini Nano)
                    </SelectItem>
                    <SelectItem value="custom">
                      Custom / Local Endpoint
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Model */}
              {aiProvider !== "custom" && aiProvider !== "chrome-builtin" && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                    {getMessage("labelModelIdentifier") || "MODEL IDENTIFIER"}
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
                        placeholder={
                          getMessage("settingModelSelect") || "Select Model"
                        }>
                        {PROVIDER_MODELS[aiProvider]?.find(
                          (m) => m.value === aiModel
                        )?.label ||
                          (aiModel
                            ? aiModel
                            : getMessage("settingModelCustomOption") ||
                              "Custom Model Name...")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_MODELS[aiProvider]?.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom-input">
                        {getMessage("settingModelCustomOption") ||
                          "Custom Model Name..."}
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
                      className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                      {getMessage("labelCustomModel") || "CUSTOM MODEL NAME"}
                    </label>
                    <Input
                      id="ai-model-input"
                      type="text"
                      value={aiModel || ""}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder={
                        aiProvider === "custom"
                          ? getMessage("settingModelCustomPlaceholderLocal") ||
                            "e.g. llama3"
                          : getMessage("settingModelCustomPlaceholderOther") ||
                            "Enter custom identifier..."
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
                    {getMessage("labelEndpointUrl") || "ENDPOINT URL"}
                  </label>
                  <Input
                    id="ai-custom-endpoint"
                    type="text"
                    value={aiCustomEndpoint || ""}
                    onChange={(e) => setAiCustomEndpoint(e.target.value)}
                    placeholder={
                      getMessage("settingEndpointPlaceholder") ||
                      "e.g. http://localhost:11434/v1"
                    }
                    className="text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                  />
                </div>
              )}

              {/* API Key */}
              {aiProvider !== "chrome-builtin" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="ai-api-key"
                    className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                    {aiProvider === "gemini" &&
                      (getMessage("labelGeminiKey") || "GEMINI API KEY")}
                    {aiProvider === "openai" &&
                      (getMessage("labelOpenAiKey") || "OPENAI API KEY")}
                    {aiProvider === "anthropic" &&
                      (getMessage("labelAnthropicKey") || "ANTHROPIC API KEY")}
                    {aiProvider === "deepseek" &&
                      (getMessage("labelDeepSeekKey") || "DEEPSEEK API KEY")}
                    {aiProvider === "custom" &&
                      (getMessage("labelCustomKey") || "API KEY (OPTIONAL)")}
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
                          ? getMessage("settingApiKeyPlaceholderCustom") ||
                            "Optional credentials..."
                          : getMessage("settingApiKeyPlaceholderDefault") ||
                            "Enter credentials key..."
                      }
                      className="pr-10 text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] focus-visible:ring-[#0a66c2] dark:focus-visible:ring-[#70b5f9]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-1 text-muted-foreground hover:text-foreground transition-colors h-7 w-7 p-0 hover:bg-transparent">
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
                <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-[11px] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#0a66c2] dark:text-[#70b5f9]" />
                    {getMessage("settingsChromeBuiltInGuideTitle") ||
                      "Zero Cost & Fully Local AI"}
                  </div>
                  <div className="text-[10px] leading-relaxed">
                    {getMessage("settingsChromeBuiltInGuideDesc") ||
                      "Runs completely locally on your device inside Google Chrome."}
                  </div>
                </div>
              )}
            </div>

            <div className="h-[1px] bg-border/40 my-2" />

            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#0a66c2] dark:text-[#70b5f9]" />
                <h4 className="text-xs font-bold text-foreground block tracking-wide uppercase">
                  {getMessage("labelSolveSpeed") || "SOLVING SPEED & PACING"}
                </h4>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("settingSolveSpeed") || "Solving Speed / Delay"}
                </span>
                <Select
                  value={solveSpeed || "normal"}
                  onValueChange={(val) => setSolveSpeed(val)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                    <SelectValue placeholder="Select Solving Speed">
                      {solveSpeed === "instant" &&
                        (getMessage("solveSpeed_instant") ||
                          "Instant (Fastest)")}
                      {solveSpeed === "normal" &&
                        (getMessage("solveSpeed_normal") ||
                          "Normal (Standard)")}
                      {solveSpeed === "stealth" &&
                        (getMessage("solveSpeed_stealth") ||
                          "Stealth Mode (Human-like delays)")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">
                      {getMessage("solveSpeed_instant") || "Instant (Fastest)"}
                    </SelectItem>
                    <SelectItem value="normal">
                      {getMessage("solveSpeed_normal") || "Normal (Standard)"}
                    </SelectItem>
                    <SelectItem value="stealth">
                      {getMessage("solveSpeed_stealth") ||
                        "Stealth Mode (Human-like delays)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[8px] text-muted-foreground leading-normal mt-1">
                  {getMessage("settingSolveSpeedNotice") ||
                    "Instant mode completes in milliseconds; Stealth mimics human pacing."}
                </p>
              </div>

              {/* Default Solver Action */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block tracking-wider">
                  {getMessage("settingDefaultSolveMode") ||
                    "Default Solver Action"}
                </span>
                <Select
                  value={defaultSolveMode || "full"}
                  onValueChange={(val) => setDefaultSolveMode(val)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-card border border-border hover:border-[#0a66c2] dark:hover:border-[#70b5f9] justify-between">
                    <SelectValue placeholder="Select Default Solver Action">
                      {defaultSolveMode === "full" &&
                        (getMessage("solveMode_full") || "Full Auto-Solve")}
                      {defaultSolveMode === "hint" &&
                        (getMessage("solveMode_hint") ||
                          "Educational Hint Mode")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">
                      {getMessage("solveMode_full") || "Full Auto-Solve"}
                    </SelectItem>
                    <SelectItem value="hint">
                      {getMessage("solveMode_hint") || "Educational Hint Mode"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[8px] text-muted-foreground leading-normal mt-1">
                  {getMessage("settingDefaultSolveModeNotice") ||
                    "Choose whether solver solves entire game or places single item."}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-border/60" />

            <p className="text-[9px] text-muted-foreground leading-relaxed">
              {getMessage("settingApiKeyNotice") ||
                "The extension never shares your credentials."}
            </p>

            <Button
              type="button"
              onClick={() => setActiveTab("home")}
              className="w-full h-9 bg-[#0a66c2] hover:bg-[#004182] dark:bg-[#70b5f9] dark:hover:bg-[#5fa3e5] text-white dark:text-[#1d2226] text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {getMessage("saveAndBack") || "Save & Back to Games"}
            </Button>
          </div>
        )}

        {/* Home Tab View (Standard Solver List) */}
        {activeTab === "home" && (
          <>
            {/* Connect over fun, daily games Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold tracking-tight text-foreground leading-snug">
                  {getMessage("popupCardTitle") ||
                    "Connect over fun, daily games"}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {getMessage("popupCardDesc") ||
                    "Prep your mind for the workday and compare results."}
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
                    <Button
                      key={game.id}
                      type="button"
                      variant="outline"
                      onClick={() => handleSolve(game.id)}
                      className={cn(
                        "w-full text-left group relative flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 dark:hover:bg-[#222a30] transition-all duration-200 cursor-pointer select-none h-auto gap-0",
                        isActive &&
                          "border-[#0a66c2] dark:border-[#70b5f9] bg-[#f0f7fe] dark:bg-[#1a2b3c] shadow-sm",
                        isCompleted && "border-border/60 bg-card/60"
                      )}
                      title={
                        isActive
                          ? getMessage("titleSolve", localizedTitle) ||
                            `Solve ${localizedTitle}`
                          : isCompleted
                            ? getMessage("titleCompleted", localizedTitle) ||
                              `Completed! Click to navigate to ${localizedTitle}`
                            : getMessage("titleOpen", localizedTitle) ||
                              `Open ${localizedTitle} to solve`
                      }>
                      {/* Left side: Description & Title */}
                      <div className="flex flex-col items-start space-y-0.5 flex-1 pr-3">
                        <span className="text-[10px] text-muted-foreground leading-none font-normal">
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
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#0a66c2]/10 dark:bg-[#70b5f9]/10 text-[#0a66c2] dark:text-[#70b5f9] mt-1">
                            <Sparkles className="w-2.5 h-2.5 shrink-0 fill-current" />
                            {getMessage("solveActiveBoard") ||
                              "Solve Active Board"}
                          </span>
                        )}

                        {solving && isActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse mt-1">
                            <span className="w-1 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
                            {getMessage("solvingWorking") ||
                              "AI Solver working..."}
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-[#057642] mt-1">
                            {getMessage("completedToday") || "Completed Today"}
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
                    </Button>
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
                            {getMessage("markAsNotPlayed") ||
                              "Mark as Not Played"}
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
                    {getMessage("dailyProgressLabel") || "Daily Progress"}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {solvedCount} / {GAMES_CONFIG.length}{" "}
                  {getMessage("solvedCountSuffix") || "Solved"}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="w-full bg-muted dark:bg-[#293138] h-2 rounded-full overflow-hidden border border-border/30">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    solvedCount === GAMES_CONFIG.length
                      ? "bg-[#057642]"
                      : "bg-[#0a66c2] dark:bg-[#70b5f9]"
                  )}
                  style={{
                    width: `${(solvedCount / GAMES_CONFIG.length) * 100}%`
                  }}
                />
              </div>

              <div className="text-[11px] leading-relaxed text-muted-foreground text-center font-medium pt-3 border-t border-border/40">
                {solvedCount === GAMES_CONFIG.length ? (
                  <span className="text-[#057642] dark:text-emerald-400 font-bold">
                    {getMessage("perfectDay", String(GAMES_CONFIG.length)) ||
                      `Perfect day! All ${GAMES_CONFIG.length} games completed! 🎉`}
                  </span>
                ) : (
                  <span>
                    {getMessage("dailyProgress", [
                      String(solvedCount),
                      String(GAMES_CONFIG.length)
                    ]) ||
                      `Daily progress: ${solvedCount} of ${GAMES_CONFIG.length} games completed today`}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Developer Debug Tools Tab View */}
        {activeTab === "debug" && isSidePanel && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Active Game Debug State Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#0a66c2] dark:text-[#70b5f9]" />
                  <h3 className="text-sm font-bold text-foreground">
                    {getMessage("debugHeaderTitle")}
                  </h3>
                </div>
                {/* Live Connected Breathing Dot */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full relative",
                      debugError ? "bg-red-500" : "bg-emerald-500 animate-pulse"
                    )}>
                    {!debugError && (
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60 scale-150" />
                    )}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    {debugError
                      ? getMessage("debugStatusOffline")
                      : getMessage("debugStatusLive")}
                  </span>
                </div>
              </div>

              {/* Status Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">
                    {getMessage("debugDetectedGame")}:
                  </span>
                  <span className="font-bold text-foreground capitalize">
                    {activeGame ? (
                      activeGame
                    ) : (
                      <span className="text-muted-foreground italic font-normal">
                        {getMessage("debugNoneDetected")}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">
                    {getMessage("debugTargetUrl")}:
                  </span>
                  <span
                    className="font-semibold text-foreground truncate max-w-[200px]"
                    title={debugTabUrl}>
                    {debugTabUrl
                      ? debugTabUrl.replace("https://www.", "")
                      : getMessage("debugNoActiveTab")}
                  </span>
                </div>
                {debugError && (
                  <div className="text-[10px] text-destructive leading-relaxed font-semibold bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 mt-1">
                    {debugError}
                  </div>
                )}
              </div>

              {/* Quick Actions Feed */}
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mainHtml}
                  onClick={handleCopyHtml}
                  className={cn(
                    "h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 px-2.5",
                    copyHtmlSuccess
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                      : "border-border hover:bg-muted/40 text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  )}>
                  {copyHtmlSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copyHtmlSuccess
                    ? getMessage("debugHtmlCopied")
                    : getMessage("debugCopyHtml")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={debugLogs.length === 0}
                  onClick={handleCopyLogs}
                  className={cn(
                    "h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 px-2.5",
                    copyLogsSuccess
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                      : "border-border hover:bg-muted/40 text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  )}>
                  {copyLogsSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copyLogsSuccess
                    ? getMessage("debugLogsCopied")
                    : getMessage("debugCopyLogs")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!mainHtml && debugLogs.length === 0}
                  onClick={handleCopyBoth}
                  className={cn(
                    "col-span-2 h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 px-2.5",
                    copyBothSuccess
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                      : "border-border hover:bg-muted/40 text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  )}>
                  {copyBothSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copyBothSuccess
                    ? getMessage("debugBothCopied")
                    : getMessage("debugCopyBoth")}
                </Button>
              </div>
            </div>

            {/* DOM Element Analytics Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                <span className="font-bold text-foreground">
                  {getMessage("debugDomPreview")}
                </span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                  &lt;main&gt; :{" "}
                  {mainHtml
                    ? `${(mainHtml.length / 1024).toFixed(1)} KB`
                    : "0 KB"}
                </span>
              </div>

              {mainHtml ? (
                <div className="relative group">
                  <pre className="text-[9px] font-mono leading-normal p-3 rounded-lg bg-muted dark:bg-[#1a2025] text-muted-foreground overflow-x-auto max-h-[140px] border border-border/60">
                    <code>
                      {mainHtml.slice(0, 800) +
                        (mainHtml.length > 800
                          ? getMessage(
                              "debugHtmlTruncated",
                              String(mainHtml.length)
                            )
                          : "")}
                    </code>
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyHtml}
                    className="absolute right-2 top-2 h-7 w-7 rounded bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title={getMessage("debugCopyCompleteHtmlTooltip")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground italic text-center py-6 border border-dashed border-border rounded-lg bg-muted/20">
                  {getMessage("debugNoMainTagCaptured")}
                </div>
              )}
            </div>

            {/* Console Logger Window Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  {getMessage("debugConsoleOutput")}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-muted text-muted-foreground uppercase tracking-wider">
                    {getMessage("debugEventsCount", String(debugLogs.length))}
                  </span>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={fetchDebugInfo}
                    className="h-6 w-6 p-0 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title={getMessage("debugRefreshLogsTooltip")}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={debugLogs.length === 0}
                    onClick={handleClearLogs}
                    className="h-6 w-6 p-0 rounded hover:bg-muted text-muted-foreground hover:text-destructive disabled:opacity-40"
                    title={getMessage("debugClearLogsTooltip")}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {debugLogs.length > 0 ? (
                <div className="rounded-lg border border-border/80 bg-neutral-950 dark:bg-black p-3 font-mono text-[9px] leading-relaxed text-slate-300 overflow-y-auto max-h-[220px] space-y-1.5 scrollbar-thin">
                  {debugLogs.map((log, idx) => {
                    const isError = log.type === "error"
                    const isWarn = log.type === "warn"
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-1 pb-1 border-b border-white/5 break-all",
                          isError && "text-red-400 bg-red-950/20 px-1 rounded",
                          isWarn &&
                            "text-amber-400 bg-amber-950/15 px-1 rounded"
                        )}>
                        <span className="text-slate-500 select-none shrink-0">
                          {log.timestamp}
                        </span>
                        <span
                          className={cn(
                            "font-bold uppercase select-none shrink-0 px-1 rounded text-[8px]",
                            isError && "bg-red-500/20 text-red-500",
                            isWarn && "bg-amber-500/20 text-amber-500",
                            log.type === "log" &&
                              "bg-blue-500/10 text-blue-400",
                            log.type === "info" &&
                              "bg-teal-500/10 text-teal-400"
                          )}>
                          [{log.type}]
                        </span>
                        <span className="whitespace-pre-wrap">
                          {log.message}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground italic text-center py-8 border border-dashed border-border rounded-lg bg-muted/20">
                  {getMessage("debugNoLogsCaptured")}
                </div>
              )}

              <div className="flex items-center gap-1 justify-center text-[8px] font-semibold text-muted-foreground pt-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-0.5" />
                {getMessage("debugListeningEvents")}
              </div>
            </div>
          </div>
        )}
      </div>
      <DisclaimerFooter />
    </main>
  )
}
