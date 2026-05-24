import { Storage } from "@plasmohq/storage"

import { askAI } from "~games/ai"

console.log("[LinkedIn Games Solver] Background service worker initialized.")

const syncStorage = new Storage({ area: "sync" })

// Helper to handle dynamic side panel enablement
if (typeof chrome !== "undefined" && chrome.sidePanel) {
  if (chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error("Failed to set side panel behavior:", err))
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
        // If URL is undefined, we lack host permissions (on other domains)
        // or the URL is not resolved yet. Disable the side panel for this tab.
        await chrome.sidePanel.setOptions({ tabId, enabled: false })
        return
      }

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
      } else {
        await chrome.sidePanel.setOptions({ tabId, enabled: false })
      }
    } catch (err) {
      console.error("Error updating side panel options:", err)
    }
  })
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

// Listen to storage changes to update the alarm reactively
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes.streakRemindersEnabled || changes.streakReminderTime) {
      setupStreakAlarm().catch(console.error)
    }
  }
})

// Initialize alarm on sw load / startup
chrome.runtime.onInstalled.addListener(() => {
  setupStreakAlarm().catch(console.error)
})
chrome.runtime.onStartup.addListener(() => {
  setupStreakAlarm().catch(console.error)
})
setupStreakAlarm().catch(console.error)

// Trigger notification on alarm fire
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "streak-reminder-alarm") {
    checkAndNotifyStreak().catch(console.error)
  }
})

interface SolveRecord {
  solved: boolean
  time: number
  solvedAt?: string
}

const checkAndNotifyStreak = async () => {
  try {
    const enabled = await syncStorage.get<boolean>("streakRemindersEnabled")
    if (!enabled) return

    const history =
      (await syncStorage.get<Record<string, Record<string, SolveRecord>>>(
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
      checkDay && Object.values(checkDay).some((g: SolveRecord) => g?.solved)

    if (!solvedToday) {
      chrome.notifications.create("streak-protector-reminder", {
        type: "basic",
        iconUrl: "icon.png",
        title: "Streak Protector 🚀",
        message:
          "Don't lose your solving streak! You haven't solved today's LinkedIn games yet.",
        buttons: [{ title: "Solve Now!" }],
        priority: 2
      })
    }
  } catch (err) {
    console.error("[Streak Protector] Verification check failed:", err)
  }
}

// Handle notification interaction
const handleNotificationClick = () => {
  chrome.tabs.query({ url: "*://*.linkedin.com/games/*" }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // Focus existing tab
      chrome.tabs.update(tabs[0].id!, { active: true }, (tab) => {
        if (tab && tab.windowId) {
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "askAI") {
    askAI(message.prompt, message.jsonMode)
      .then((text) => {
        sendResponse({ success: true, text })
      })
      .catch((error) => {
        const errMsg = error instanceof Error ? error.message : String(error)
        sendResponse({ success: false, error: errMsg })
      })
    return true // Keep channel open for async response
  }
})
