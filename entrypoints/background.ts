import { askAI } from "~games/ai"
import { analytics } from "~lib/analytics"
import { getMessage, initLocale } from "~lib/i18n"
import { onMessage } from "~lib/messaging"
import { localStorage, syncStorage } from "~lib/storage"

const i18n = {
  t: getMessage
}

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

async function migrateSolveHistoryToLocal() {
  try {
    const syncHistory = await syncStorage.get<Record<string, Record<string, SolveRecord>>>("solveHistory")
    if (syncHistory) {
      const localHistory = await localStorage.get<Record<string, Record<string, SolveRecord>>>("solveHistory") || {}
      
      const mergedHistory = { ...syncHistory, ...localHistory }
      for (const dateKey of Object.keys(syncHistory)) {
        if (localHistory[dateKey]) {
          mergedHistory[dateKey] = {
            ...syncHistory[dateKey],
            ...localHistory[dateKey]
          }
        }
      }
      
      await localStorage.set("solveHistory", mergedHistory)
      await syncStorage.remove("solveHistory")
      console.log("[Storage Migration] Successfully migrated and merged solveHistory from sync to local storage.")
    }
  } catch (err) {
    console.error("[Storage Migration] Failed to migrate solveHistory:", err)
  }
}

console.log("[LinkedIn Games Solver] Background service worker initialized.")

// Helper to extract game name from a LinkedIn games URL
function getGameFromUrl(
  urlStr: string
): { gameId: string; baseGameId: string; isBonus: boolean } | null {
  try {
    const url = new URL(urlStr)
    if (
      !url.hostname.includes("linkedin.com") ||
      !url.pathname.includes("/games/")
    ) {
      return null
    }
    const parts = url.pathname.split("/").filter(Boolean)
    const gameIndex = parts.indexOf("games")
    if (gameIndex === -1 || gameIndex + 1 >= parts.length) {
      return null
    }
    const rawGame = parts[gameIndex + 1]
    if (rawGame === "results") {
      return null
    }

    let baseGameId = ""
    const isBonus =
      url.searchParams.get("bonus") === "true" || rawGame.endsWith("-bonus")
    const rawLower = rawGame.toLowerCase()

    if (rawLower.includes("queens")) {
      baseGameId = "queens"
    } else if (rawLower.includes("sudoku")) {
      baseGameId = "sudoku"
    } else if (rawLower.includes("tango")) {
      baseGameId = "tango"
    } else if (rawLower.includes("zip")) {
      baseGameId = "zip"
    } else if (rawLower.includes("patches")) {
      baseGameId = "patches"
    } else if (rawLower.includes("crossclimb")) {
      baseGameId = "crossclimb"
    } else if (rawLower.includes("pinpoint")) {
      baseGameId = "pinpoint"
    } else if (rawLower.includes("wend")) {
      baseGameId = "wend"
    } else {
      return null
    }

    const gameId = baseGameId + (isBonus ? "-bonus" : "")
    return { gameId, baseGameId, isBonus }
  } catch {
    return null
  }
}

async function safeUpdateContextMenus(updates: Record<string, boolean>) {
  if (typeof chrome === "undefined" || !chrome.contextMenus) return
  await Promise.allSettled(
    Object.entries(updates).map(([id, visible]) =>
      chrome.contextMenus.update(id, { visible })
    )
  )
}

function setupContextMenus() {
  if (typeof chrome !== "undefined" && chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "solve-active-game-menu",
        title: i18n.t("contextMenuSolve") || "⚡ Solve Active LinkedIn Game",
        contexts: ["page"],
        documentUrlPatterns: ["https://*.linkedin.com/games/*"]
      })

      chrome.contextMenus.create({
        id: "get-single-hint-menu",
        title: i18n.t("contextMenuHint") || "💡 Get a Hint",
        contexts: ["page"],
        documentUrlPatterns: ["https://*.linkedin.com/games/*"]
      })

      chrome.contextMenus.create({
        id: "view-results-menu",
        title: i18n.t("contextMenuViewResults") || "📊 View Results",
        contexts: ["page"],
        documentUrlPatterns: ["https://*.linkedin.com/games/*"]
      })

      // Update visibility for any active tab immediately
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0]
        if (tab?.id) {
          updateContextMenusForTab(tab.id, tab.url).catch(console.error)
        }
      })
    })
  }
}

// Dynamically updates context menu visibility based on tab URL and solving status
async function updateContextMenusForTab(tabId: number, urlStr?: string) {
  if (typeof chrome === "undefined" || !chrome.contextMenus) return

  try {
    if (!urlStr) {
      const tab = await chrome.tabs.get(tabId).catch(() => null)
      urlStr = tab?.url
    }

    if (!urlStr) {
      await safeUpdateContextMenus({
        "solve-active-game-menu": false,
        "get-single-hint-menu": false,
        "view-results-menu": false
      })
      return
    }

    const gameInfo = getGameFromUrl(urlStr)
    if (!gameInfo) {
      await safeUpdateContextMenus({
        "solve-active-game-menu": false,
        "get-single-hint-menu": false,
        "view-results-menu": false
      })
      return
    }

    const history =
      (await localStorage.get<Record<string, Record<string, SolveRecord>>>(
        "solveHistory"
      )) || {}

    const getLocalStr = (d: Date): string => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    const todayStr = getLocalStr(new Date())
    const isSolved = !!history[todayStr]?.[gameInfo.gameId]?.solved

    if (isSolved) {
      // Already solved today: hide Solve & Hint, show View Results
      await safeUpdateContextMenus({
        "solve-active-game-menu": false,
        "get-single-hint-menu": false,
        "view-results-menu": true
      })
    } else {
      // Not yet solved today: show Solve & Hint, hide View Results
      await safeUpdateContextMenus({
        "solve-active-game-menu": true,
        "get-single-hint-menu": true,
        "view-results-menu": false
      })
    }
  } catch (err) {
    console.warn("[ContextMenus] Update failed:", err)
  }
}

// Alarms management for Streak Protector Reminders
const getNextAlarmTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)
  if (target.getTime() <= now.getTime()) {
    // Scheduled hour has passed today, move to tomorrow
    target.setDate(target.getDate() + 1)
  }
  return target.getTime()
}

const setupStreakAlarm = async () => {
  try {
    const enabled = await syncStorage.get<boolean>("streakRemindersEnabled")
    const time =
      (await syncStorage.get<string>("streakReminderTime")) || "20:00"

    await chrome.alarms.clear("streak-reminder-alarm")

    if (enabled) {
      const triggerAt = getNextAlarmTime(time)
      chrome.alarms.create("streak-reminder-alarm", {
        when: triggerAt,
        periodInMinutes: 1440 // Repeat every 24 hours
      })
      console.log(
        `[Streak Protector] Alarm scheduled for: ${new Date(triggerAt).toString()}`
      )
    } else {
      console.log("[Streak Protector] Alarm disabled.")
    }
  } catch (err) {
    console.error("[Streak Protector] Error configuring alarm:", err)
  }
}

const calculateStreak = (
  rawHistory: Record<string, Record<string, SolveRecord>>
): number => {
  let activeStreak = 0
  const dateKeys = Object.keys(rawHistory || {}).sort()
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
  return activeStreak
}

export const updateActionBadge = async (
  streakValue?: number,
  status?: "solving" | "idle",
  tabId?: number
) => {
  if (typeof chrome === "undefined" || !chrome.action) return

  let cachedStreakValue = 0
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      const sessionData = await chrome.storage.session.get("cachedStreakValue")
      cachedStreakValue = sessionData.cachedStreakValue || 0
    } catch (err) {
      console.warn("[Badge] Failed to read from session storage:", err)
    }
  }

  if (streakValue !== undefined) {
    cachedStreakValue = streakValue
    if (typeof chrome !== "undefined" && chrome.storage?.session) {
      try {
        await chrome.storage.session.set({ cachedStreakValue })
      } catch (err) {
        console.warn("[Badge] Failed to write to session storage:", err)
      }
    }
  }

  if (status === "solving") {
    await chrome.action.setBadgeText({
      text: "...",
      tabId
    })
    await chrome.action.setBadgeBackgroundColor({
      color: "#0a66c2",
      tabId
    })
    return
  }

  // If status is idle, clear the tab-specific badge to let it inherit the global badge
  if (status === "idle" && tabId !== undefined) {
    await chrome.action.setBadgeText({
      text: "",
      tabId
    })
    return
  }

  // Update global badge based on streak
  if (cachedStreakValue > 0) {
    await chrome.action.setBadgeText({ text: String(cachedStreakValue) })
    await chrome.action.setBadgeBackgroundColor({ color: "#ffb74d" }) // Warm Orange
  } else {
    await chrome.action.setBadgeText({ text: "" })
  }
}

// Reactively compute and initialize the badge on SW load
const initBadge = async () => {
  try {
    const history =
      (await localStorage.get<Record<string, Record<string, SolveRecord>>>(
        "solveHistory"
      )) || {}
    const streak = calculateStreak(history)
    await updateActionBadge(streak)
  } catch (err) {
    console.error("[Badge] Failed to initialize action badge:", err)
  }
}

const checkAndNotifyStreak = async () => {
  try {
    const enabled = await syncStorage.get<boolean>("streakRemindersEnabled")
    if (!enabled) return

    const history =
      (await localStorage.get<Record<string, Record<string, SolveRecord>>>(
        "solveHistory"
      )) || {}

    // Get today's local date string (yyyy-mm-dd)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const todayStr = `${year}-${month}-${day}`

    const checkDay = history[todayStr]
    const solvedToday =
      checkDay &&
      (Object.values(checkDay) as SolveRecord[]).some((g) => g?.solved)

    if (!solvedToday) {
      chrome.notifications.create("streak-protector-reminder", {
        type: "basic",
        iconUrl: "icon.png",
        title: i18n.t("notificationTitle") || "Streak Protector 🚀",
        message:
          i18n.t("notificationMessage") ||
          "Don't lose your solving streak! You haven't solved today's LinkedIn games yet.",
        buttons: [
          {
            title: i18n.t("notificationButton") || "Solve Now!"
          }
        ],
        priority: 2
      })
    }
  } catch (err) {
    console.error("[Streak Protector] Verification check failed:", err)
  }
}

// Safe helper to dispatch messages to content script, catching connection errors gracefully
async function safeSendMessage(tabId: number, message: unknown) {
  try {
    await chrome.tabs.sendMessage(tabId, message)
  } catch (err) {
    console.warn("[Messaging] Tab script not ready or responsive:", err)
  }
}

// Handle notification interaction
const handleNotificationClick = () => {
  chrome.tabs.query({ url: "*://*.linkedin.com/games/*" }, (tabs) => {
    const tabId = tabs?.[0]?.id
    if (tabId !== undefined) {
      // Focus existing tab
      chrome.tabs.update(tabId, { active: true }, (tab) => {
        if (tab?.windowId) {
          chrome.windows.update(tab.windowId, { focused: true })
        }
      })
    } else {
      // Open new tab
      chrome.tabs.create({ url: "https://www.linkedin.com/games/" })
    }
  })
  chrome.notifications.clear("streak-protector-reminder")
}

const GAME_URL_MAP: Record<string, string> = {
  queens: "queens/",
  sudoku: "mini-sudoku/",
  "mini-sudoku": "mini-sudoku/",
  tango: "tango/",
  zip: "zip/",
  patches: "patches/",
  crossclimb: "crossclimb/",
  pinpoint: "pinpoint/",
  wend: "wend/"
}

export default defineBackground({
  async main() {
    await migrateSolveHistoryToLocal()
    await initLocale()
    // Allow content scripts to access chrome.storage.session
    if (
      typeof chrome !== "undefined" &&
      chrome.storage?.session?.setAccessLevel
    ) {
      chrome.storage.session
        .setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
        .catch((err) =>
          console.error(
            "[Storage] Failed to set session storage access level:",
            err
          )
        )
    }

    // Helper to handle dynamic side panel enablement
    if (typeof chrome !== "undefined" && chrome.sidePanel) {
      if (chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel
          .setPanelBehavior({ openPanelOnActionClick: true })
          .catch((err) =>
            console.error("Failed to set side panel behavior:", err)
          )
      }

      // Set default behavior: disable side panel globally by default
      chrome.sidePanel.setOptions({ enabled: false }).catch((err) => {
        console.error("Failed to disable global side panel by default:", err)
      })

      // Restrict sidepanel dynamically to LinkedIn Games page
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        try {
          const urlStr = tab.url || changeInfo.url
          if (!urlStr) {
            await chrome.sidePanel.setOptions({ tabId, enabled: false })
            return
          }

          // Update context menu visibility on URL change
          updateContextMenusForTab(tabId, urlStr).catch(console.error)

          const url = new URL(urlStr)
          const isGamesPage =
            url.hostname.includes("linkedin.com") &&
            url.pathname.includes("/games/")

          if (isGamesPage) {
            await chrome.sidePanel.setOptions({
              tabId,
              path: "sidepanel.html",
              enabled: true
            })

            // Programmatically auto-open the sidebar panel if enabled and page is fully loaded
            if (changeInfo.status === "complete") {
              const autoOpen =
                (await syncStorage.get<boolean>("autoOpenSidepanel")) ?? true
              if (autoOpen) {
                await chrome.sidePanel.open({ tabId }).catch((err) => {
                  console.warn(
                    "[SidePanel] Failed programmatic open (gesture restriction may apply):",
                    err
                  )
                })
              }
            }
          } else {
            await chrome.sidePanel.setOptions({ tabId, enabled: false })
          }
        } catch (err) {
          console.error("Error updating side panel options:", err)
        }
      })
    }

    // Listen to storage changes to update the alarm reactively
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync") {
        if (changes["sync:userLocale"]) {
          initLocale()
            .then(() => {
              setupContextMenus()
            })
            .catch(console.error)
        }
        if (changes["sync:streakRemindersEnabled"] || changes["sync:streakReminderTime"]) {
          setupStreakAlarm().catch(console.error)
        }
      }
      if (areaName === "local") {
        if (changes["local:solveHistory"]) {
          const newHistory = changes["local:solveHistory"].newValue || {}
          const streak = calculateStreak(newHistory)
          updateActionBadge(streak).catch(console.error)

          // Update context menus reactively on active tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs?.[0]
            if (tab?.id) {
              updateContextMenusForTab(tab.id, tab.url).catch(console.error)
            }
          })
        }
      }
    })

    // Initialize alarm and context menus on sw load / startup
    chrome.runtime.onInstalled.addListener(async (details) => {
      setupStreakAlarm().catch(console.error)

      try {
        if (details.reason === "install") {
          const platform = await chrome.runtime.getPlatformInfo()
          await analytics.track("new_install", {
            operating_system: platform.os
          })
        } else if (details.reason === "update") {
          await analytics.track("extension_update", {
            previous_version: details.previousVersion
          })
        }
      } catch (err) {
        console.warn("[Analytics] Installation track failed:", err)
      }

      await initLocale()
      setupContextMenus()
    })

    // Listen to active tab changes to update context menus
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onActivated.addListener((activeInfo) => {
        updateContextMenusForTab(activeInfo.tabId).catch(console.error)
      })

      // Trigger active tab context menu update on service worker wake up
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0]
        if (tab?.id) {
          updateContextMenusForTab(tab.id, tab.url).catch(console.error)
        }
      })
    }

    chrome.runtime.onStartup.addListener(() => {
      setupStreakAlarm().catch(console.error)
    })
    setupStreakAlarm().catch(console.error)
    initBadge().catch(console.error)
    setupContextMenus()

    // Trigger notification on alarm fire
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "streak-reminder-alarm") {
        checkAndNotifyStreak().catch(console.error)
      }
    })

    // Handle Context Menu clicks
    if (typeof chrome !== "undefined" && chrome.contextMenus) {
      chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (!tab || !tab.id) return

        if (info.menuItemId === "solve-active-game-menu") {
          await safeSendMessage(tab.id, { action: "solve", mode: "full" })
        } else if (info.menuItemId === "get-single-hint-menu") {
          await safeSendMessage(tab.id, { action: "solve", mode: "hint" })
        } else if (info.menuItemId === "view-results-menu") {
          const gameInfo = getGameFromUrl(tab.url || "")
          if (gameInfo) {
            const gamePath =
              gameInfo.baseGameId === "sudoku"
                ? "mini-sudoku"
                : gameInfo.baseGameId
            const resultsUrl = `https://www.linkedin.com/games/${gamePath}/results/`
            chrome.tabs.update(tab.id, { url: resultsUrl })
          }
        }
      })
    }

    chrome.notifications.onClicked.addListener((id) => {
      if (id === "streak-protector-reminder") {
        handleNotificationClick()
      }
    })

    chrome.notifications.onButtonClicked.addListener((id, index) => {
      if (id === "streak-protector-reminder" && index === 0) {
        handleNotificationClick()
      }
    })

    // Listen to keyboard shortcut commands from Chrome Commands API
    chrome.commands.onCommand.addListener(async (command) => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (!tab || !tab.id || !tab.url?.includes("linkedin.com/games/")) return

        if (command === "solve-active-game") {
          await safeSendMessage(tab.id, { action: "solve", mode: "full" })
        } else if (command === "get-single-hint") {
          await safeSendMessage(tab.id, { action: "solve", mode: "hint" })
        }
      } catch (err) {
        console.error(
          "[Commands] Error dispatching hotkey command message:",
          err
        )
      }
    })

    // Listen to Omnibox suggestion input events
    chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
      const clean = text.trim().toLowerCase()
      const allSuggestions: Array<{
        content: string
        descKey:
          | "omniboxSuggestionQueens"
          | "omniboxSuggestionSudoku"
          | "omniboxSuggestionTango"
          | "omniboxSuggestionPinpoint"
          | "omniboxSuggestionCrossclimb"
          | "omniboxSuggestionZip"
          | "omniboxSuggestionPatches"
          | "omniboxSuggestionWend"
          | "omniboxSuggestionStats"
        defaultDesc: string
      }> = [
        {
          content: "queens",
          descKey: "omniboxSuggestionQueens",
          defaultDesc: "👑 Play & Solve Queens today!"
        },
        {
          content: "sudoku",
          descKey: "omniboxSuggestionSudoku",
          defaultDesc: "🔢 Open mini-Sudoku Solver"
        },
        {
          content: "tango",
          descKey: "omniboxSuggestionTango",
          defaultDesc: "🔄 Open Tango Solver"
        },
        {
          content: "pinpoint",
          descKey: "omniboxSuggestionPinpoint",
          defaultDesc: "📍 Open Pinpoint Solver"
        },
        {
          content: "crossclimb",
          descKey: "omniboxSuggestionCrossclimb",
          defaultDesc: "🧗 Open Crossclimb Solver"
        },
        {
          content: "zip",
          descKey: "omniboxSuggestionZip",
          defaultDesc: "⚡ Open Zip Solver"
        },
        {
          content: "patches",
          descKey: "omniboxSuggestionPatches",
          defaultDesc: "🧩 Open Patches Solver"
        },
        {
          content: "wend",
          descKey: "omniboxSuggestionWend",
          defaultDesc: "🔤 Open Wend Solver"
        },
        {
          content: "stats",
          descKey: "omniboxSuggestionStats",
          defaultDesc: "📊 Open Streaks & Performance Dashboard"
        }
      ]

      const filtered = allSuggestions
        .filter((item) => !clean || item.content.includes(clean))
        .map((item) => ({
          content: item.content,
          description: i18n.t(item.descKey) || item.defaultDesc
        }))

      suggest(filtered)
    })

    // Listen to Omnibox input selection events to navigate or open dashboard
    chrome.omnibox.onInputEntered.addListener((text) => {
      const clean = text.trim().toLowerCase()

      if (clean === "stats" || clean === "dashboard" || clean === "panel") {
        chrome.tabs.create({
          url: `chrome-extension://${chrome.runtime.id}/sidepanel.html`
        })
        return
      }

      const gamePath = GAME_URL_MAP[clean]
      const url = `https://www.linkedin.com/games/${gamePath || ""}`

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0]
        if (tab?.url?.includes("linkedin.com") && tab.id !== undefined) {
          chrome.tabs.update(tab.id, { url })
        } else {
          chrome.tabs.create({ url })
        }
      })
    })

    onMessage("askAI", async (message) => {
      const { prompt, jsonMode } = message.data
      try {
        await analytics.track("ask_ai", {
          promptLength: String(prompt?.length || 0)
        })
      } catch (trackErr) {
        console.warn("[Analytics] askAI track failed:", trackErr)
      }

      try {
        const text = await askAI(prompt || "", jsonMode)
        return { success: true, text }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    })

    onMessage("captureTab", async (message) => {
      const windowId =
        message.sender?.tab?.windowId || chrome.windows.WINDOW_ID_CURRENT
      const { cropRect, targetWidth, targetHeight } = message.data

      try {
        const rawUrl = await new Promise<string>((resolve, reject) => {
          chrome.tabs.captureVisibleTab(
            windowId,
            { format: "jpeg", quality: 85 },
            (capturedUrl) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else if (!capturedUrl) {
                reject(new Error("Captured URL is empty"))
              } else {
                resolve(capturedUrl)
              }
            }
          )
        })

        if (!cropRect) {
          return { success: true, dataUrl: rawUrl }
        }

        const OFFSCREEN_PATH = "offscreen.html"
        const swSelf = self as unknown as {
          clients: { matchAll: () => Promise<Array<{ url: string }>> }
        }
        const matchedClients = await swSelf.clients.matchAll()
        const hasDocument = matchedClients.some((c) =>
          c.url.endsWith(OFFSCREEN_PATH)
        )

        if (!hasDocument) {
          await chrome.offscreen.createDocument({
            url: OFFSCREEN_PATH,
            reasons: [chrome.offscreen.Reason.BLOBS],
            justification:
              "Crop and compress puzzle screenshots for multimodal AI processing"
          })
        }

        const processedResponse = await new Promise<
          | {
              success?: boolean
              dataUrl?: string
            }
          | null
          | undefined
        >((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "preprocess-image",
              data: {
                dataUrl: rawUrl,
                cropRect,
                targetWidth,
                targetHeight
              }
            },
            (response) => {
              resolve(response)
            }
          )
        })

        try {
          await chrome.offscreen.closeDocument()
        } catch (closeErr) {
          console.warn("[Offscreen] Failed to close document:", closeErr)
        }

        if (processedResponse?.success && processedResponse?.dataUrl) {
          return {
            success: true,
            dataUrl: processedResponse.dataUrl
          }
        } else {
          return { success: true, dataUrl: rawUrl }
        }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    })

    onMessage("fetchRegistry", async (message) => {
      const { game } = message.data
      try {
        await analytics.track("fetch_registry", { game })
      } catch (trackErr) {
        console.warn("[Analytics] fetchRegistry track failed:", trackErr)
      }
      const registryUrl = `https://raw.githubusercontent.com/muhammedaksam/linkedin-games-solver/main/registry/${game}.json`

      try {
        const res = await fetch(registryUrl)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        return { success: true, data }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    })

    onMessage("solverStatus", async (message) => {
      const { status } = message.data
      const tabId = message.sender?.tab?.id
      try {
        await updateActionBadge(undefined, status, tabId)
        return { success: true }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    })
  }
})
