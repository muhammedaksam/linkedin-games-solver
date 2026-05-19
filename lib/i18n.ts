import deMessages from "../locales/de/messages.json"
import enMessages from "../locales/en/messages.json"
import esMessages from "../locales/es/messages.json"
import frMessages from "../locales/fr/messages.json"
import ptMessages from "../locales/pt/messages.json"
import trMessages from "../locales/tr/messages.json"
import zh_CNMessages from "../locales/zh_CN/messages.json"

const localesData: Record<string, unknown> = {
  en: enMessages,
  tr: trMessages,
  de: deMessages,
  es: esMessages,
  fr: frMessages,
  pt: ptMessages,
  zh_CN: zh_CNMessages
}

// Map locale keys to display metadata (labels and flags)
export interface LocaleOption {
  code: string
  label: string
  flag: string
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "zh_CN", label: "中文", flag: "🇨🇳" }
]

// Get default browser/system base language
function getSystemBaseLanguage(): string {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    try {
      const uiLang = chrome.i18n.getUILanguage()
      if (uiLang) {
        const base = uiLang.split("-")[0].split("_")[0].toLowerCase()
        if (localesData[base]) return base
      }
    } catch (e) {
      console.warn("Failed to get chrome UI language:", e)
    }
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const base = navigator.language.split("-")[0].toLowerCase()
    if (localesData[base]) return base
  }

  return "en"
}

// Initial state load
const systemLocale = getSystemBaseLanguage()

export function getActiveLocale(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem("user-locale")
    if (saved && localesData[saved]) {
      return saved
    }
  }
  return systemLocale
}

export function setActiveLocale(code: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("user-locale", code)
  }
  // Dispatch custom event for reactive elements in the same window context
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("localeChanged", { detail: code }))
  }
}

export function getMessage(
  key: string,
  substitutions?: string | string[]
): string {
  const activeLoc = getActiveLocale()

  // 1. Fetch from selected locale dictionary
  const dictionary = localesData[activeLoc] || localesData.en
  let item = dictionary[key]

  // 2. Fallback to English dictionary if key is missing in active locale
  if ((!item || !item.message) && activeLoc !== "en") {
    item = localesData.en[key]
  }

  // 3. Fallback to key itself if not found anywhere
  if (!item || !item.message) {
    return key
  }

  let msg = item.message
  if (substitutions) {
    const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
    subs.forEach((sub, index) => {
      msg = msg.replace(`$${index + 1}`, sub)
    })
  }
  return msg
}

export const locale = getActiveLocale()
