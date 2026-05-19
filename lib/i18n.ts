export function getMessage(
  key: string,
  substitutions?: string | string[]
): string {
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
      "Selected model solves Crossclimb & Pinpoint. The extension never shares your key.",
    popupCardTitle: "Connect over fun, daily games",
    popupCardDesc:
      "Prep your mind for the workday and compare results. Your scores are private unless you share them.",
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
    navAiConfig: "Settings / Options",
    navStats: "Stats",
    navTheme: "Theme",
    dailyProgressLabel: "Daily Progress",
    solveActiveBoard: "Solve Active Board",
    backToGames: "Back to LinkedIn Games",
    dashboardLabel: "Dashboard",
    gamesSolverTitle: "Games Solver",
    dashboardDescText:
      "Analyze your performance metrics, record streaks, and trace your daily completed puzzle paths.",
    completedSuccessfully: "Completed Successfully",
    solveBtn_withAi: "Solve with AI",
    solveBtn_game: "Solve Game",
    solveBtn_solving: "Solving...",
    solveBtn_solved: "Solved!",
    disclaimerText:
      "Disclaimer: This is an independent, open-source educational project. It is not affiliated with, sponsored by, or endorsed by LinkedIn Corporation. 'LinkedIn' is a registered trademark of LinkedIn Corporation.",
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
    activityCalendar: "Activity Calendar",
    clearFilter: "Clear Filter",
    settingsCredentialsTitle: "Credentials & Models",
    settingsModelGuideTitle: "Model Guide & Info",
    settingsConnectionStatusTitle: "Connection Status",
    settingsActiveSolverLabel: "Active Solver:",
    settingsModelIdentifierLabel: "Model Identifier:",
    settingsAutoSavedNotification: "Settings auto-saved!",
    settingsSubtitleDesc:
      "Configure AI model integration endpoints and credentials for advanced puzzle-solving reasoning.",
    settingsGeminiGuideDesc:
      "Outstanding performance at near-zero costs. Solves Crossclimb and Pinpoint with excellent logic. Recommended default: gemini-2.5-flash.",
    settingsOpenaiGuideDesc:
      "Fast, responsive, and extremely reliable with general knowledge patterns. Recommended default: gpt-4o-mini.",
    settingsAnthropicGuideDesc:
      "Maximum reasoning capacity. Handles very complex word associations flawlessly. Recommended default: claude-3-5-haiku.",
    settingsCustomGuideDesc:
      "Connect to local LLM frameworks like Ollama or LM Studio. Point your endpoint URL (e.g., http://localhost:11434/v1) and custom model name.",
    showMoreDates: "Show more dates",
    showLessDates: "Show less"
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
