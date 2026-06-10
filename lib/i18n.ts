import { i18n } from "#i18n"
import type { Locale } from "react-day-picker"
import {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  enAU,
  enGB,
  enUS,
  es,
  et,
  faIR,
  fi,
  fr,
  gu,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  kn,
  ko,
  lt,
  lv,
  ms,
  nb,
  nl,
  pl,
  pt,
  ptBR,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  ta,
  te,
  th,
  tr,
  uk,
  vi,
  zhCN,
  zhTW
} from "react-day-picker/locale"

// Map locale keys to display metadata (labels and flags)
export interface LocaleOption {
  code: string
  label: string
  flag: string
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "am", label: "አማርኛ", flag: "🇪🇹" },
  { code: "bg", label: "Български", flag: "🇧🇬" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "ca", label: "Català", flag: "🇪🇸" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "en_AU", label: "English (Australia)", flag: "🇦🇺" },
  { code: "en_GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "en_US", label: "English (US)", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "es_419", label: "Español (Latinoamérica)", flag: "🌎" },
  { code: "et", label: "Eesti", flag: "🇪🇪" },
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "lt", label: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", label: "Latviešu", flag: "🇱🇻" },
  { code: "ml", label: "മലയാളം", flag: "🇮🇳" },
  { code: "mr", label: "मराठी", flag: "🇮🇳" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "pt_BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "pt_PT", label: "Português (PT)", flag: "🇵🇹" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", label: "Slovenščina", flag: "🇸🇮" },
  { code: "sr", label: "Srpski", flag: "🇷🇸" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh_CN", label: "简体中文", flag: "🇨🇳" },
  { code: "zh_TW", label: "繁體中文", flag: "🇹🇼" }
]

export const DAY_PICKER_LOCALES: Record<string, Partial<Locale>> = {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  en: enUS,
  en_AU: enAU,
  en_GB: enGB,
  en_US: enUS,
  es,
  et,
  fa: faIR,
  fi,
  fr,
  gu,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  kn,
  ko,
  lt,
  lv,
  ms,
  nl,
  no: nb,
  pl,
  pt_BR: ptBR,
  pt_PT: pt,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  ta,
  te,
  th,
  tr,
  uk,
  vi,
  zh_CN: zhCN,
  zh_TW: zhTW
}

export function getDayPickerLocale(code?: string): Partial<Locale> {
  if (!code) return enUS
  return DAY_PICKER_LOCALES[code] ?? enUS
}

// Get default browser/system base language
function getSystemBaseLanguage(): string {
  const chromeApi = globalThis.chrome
  if (chromeApi?.i18n) {
    try {
      const uiLang = chromeApi.i18n.getUILanguage()
      if (uiLang) {
        const cleaned = uiLang.replace("-", "_")
        if (SUPPORTED_LOCALES.some((l) => l.code === cleaned)) return cleaned
        const base = uiLang.split("-")[0].split("_")[0].toLowerCase()
        if (base === "pt") return "pt_BR"
        if (base === "zh")
          return uiLang.toLowerCase().includes("tw") ||
            uiLang.toLowerCase().includes("hk")
            ? "zh_TW"
            : "zh_CN"
        if (SUPPORTED_LOCALES.some((l) => l.code === base)) return base
      }
    } catch (e) {
      console.warn("Failed to get chrome UI language:", e)
    }
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const uiLang = navigator.language
    const cleaned = uiLang.replace("-", "_")
    if (SUPPORTED_LOCALES.some((l) => l.code === cleaned)) return cleaned
    const base = uiLang.split("-")[0].toLowerCase()
    if (base === "pt") return "pt_BR"
    if (base === "zh")
      return uiLang.toLowerCase().includes("tw") ||
        uiLang.toLowerCase().includes("hk")
        ? "zh_TW"
        : "zh_CN"
    if (SUPPORTED_LOCALES.some((l) => l.code === base)) return base
  }

  return "en"
}

// Initial state load
const systemLocale = getSystemBaseLanguage()

export function getActiveLocale(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem("user-locale")
    if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
      return saved
    }
  }
  return systemLocale
}

export function setActiveLocale(code: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("user-locale", code)
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("localeChanged", { detail: code }))
  }
}

export function getMessage(
  key: string,
  substitutions?: string | string[]
): string {
  try {
    if (substitutions != null) {
      const subs = Array.isArray(substitutions)
        ? substitutions
        : [substitutions]
      return (i18n.t as unknown as (k: string, s: string[]) => string)(
        key,
        subs
      )
    }
    return (i18n.t as unknown as (k: string) => string)(key)
  } catch (err) {
    console.warn(`[i18n] Failed to get message for "${key}":`, err)
    return key
  }
}

export const locale = getActiveLocale()

const RTL_LOCALES = ["ar", "fa", "he"]

export function isRtlLocale(code: string): boolean {
  return RTL_LOCALES.includes(code)
}

export function getLocaleDirection(code: string): "rtl" | "ltr" {
  return isRtlLocale(code) ? "rtl" : "ltr"
}
