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

import amMessages from "~locales/am/messages.json"
import arMessages from "~locales/ar/messages.json"
import bgMessages from "~locales/bg/messages.json"
import bnMessages from "~locales/bn/messages.json"
import caMessages from "~locales/ca/messages.json"
import csMessages from "~locales/cs/messages.json"
import daMessages from "~locales/da/messages.json"
import deMessages from "~locales/de/messages.json"
import elMessages from "~locales/el/messages.json"
import en_AUMessages from "~locales/en_AU/messages.json"
import en_GBMessages from "~locales/en_GB/messages.json"
import en_USMessages from "~locales/en_US/messages.json"
import enMessages from "~locales/en/messages.json"
import es_419Messages from "~locales/es_419/messages.json"
import esMessages from "~locales/es/messages.json"
import etMessages from "~locales/et/messages.json"
import faMessages from "~locales/fa/messages.json"
import fiMessages from "~locales/fi/messages.json"
import filMessages from "~locales/fil/messages.json"
import frMessages from "~locales/fr/messages.json"
import guMessages from "~locales/gu/messages.json"
import heMessages from "~locales/he/messages.json"
import hiMessages from "~locales/hi/messages.json"
import hrMessages from "~locales/hr/messages.json"
import huMessages from "~locales/hu/messages.json"
import idMessages from "~locales/id/messages.json"
import itMessages from "~locales/it/messages.json"
import jaMessages from "~locales/ja/messages.json"
import knMessages from "~locales/kn/messages.json"
import koMessages from "~locales/ko/messages.json"
import ltMessages from "~locales/lt/messages.json"
import lvMessages from "~locales/lv/messages.json"
import mlMessages from "~locales/ml/messages.json"
import mrMessages from "~locales/mr/messages.json"
import msMessages from "~locales/ms/messages.json"
import nlMessages from "~locales/nl/messages.json"
import noMessages from "~locales/no/messages.json"
import plMessages from "~locales/pl/messages.json"
import pt_BRMessages from "~locales/pt_BR/messages.json"
import pt_PTMessages from "~locales/pt_PT/messages.json"
import roMessages from "~locales/ro/messages.json"
import ruMessages from "~locales/ru/messages.json"
import skMessages from "~locales/sk/messages.json"
import slMessages from "~locales/sl/messages.json"
import srMessages from "~locales/sr/messages.json"
import svMessages from "~locales/sv/messages.json"
import swMessages from "~locales/sw/messages.json"
import taMessages from "~locales/ta/messages.json"
import teMessages from "~locales/te/messages.json"
import thMessages from "~locales/th/messages.json"
import trMessages from "~locales/tr/messages.json"
import ukMessages from "~locales/uk/messages.json"
import viMessages from "~locales/vi/messages.json"
import zh_CNMessages from "~locales/zh_CN/messages.json"
import zh_TWMessages from "~locales/zh_TW/messages.json"

interface MessageItem {
  message: string
  description?: string
}

const localesData: Record<string, Record<string, MessageItem>> = {
  ar: arMessages as Record<string, MessageItem>,
  am: amMessages as Record<string, MessageItem>,
  bg: bgMessages as Record<string, MessageItem>,
  bn: bnMessages as Record<string, MessageItem>,
  ca: caMessages as Record<string, MessageItem>,
  cs: csMessages as Record<string, MessageItem>,
  da: daMessages as Record<string, MessageItem>,
  de: deMessages as Record<string, MessageItem>,
  el: elMessages as Record<string, MessageItem>,
  en: enMessages as Record<string, MessageItem>,
  en_AU: en_AUMessages as Record<string, MessageItem>,
  en_GB: en_GBMessages as Record<string, MessageItem>,
  en_US: en_USMessages as Record<string, MessageItem>,
  es: esMessages as Record<string, MessageItem>,
  es_419: es_419Messages as Record<string, MessageItem>,
  et: etMessages as Record<string, MessageItem>,
  fa: faMessages as Record<string, MessageItem>,
  fi: fiMessages as Record<string, MessageItem>,
  fil: filMessages as Record<string, MessageItem>,
  fr: frMessages as Record<string, MessageItem>,
  gu: guMessages as Record<string, MessageItem>,
  he: heMessages as Record<string, MessageItem>,
  hi: hiMessages as Record<string, MessageItem>,
  hr: hrMessages as Record<string, MessageItem>,
  hu: huMessages as Record<string, MessageItem>,
  id: idMessages as Record<string, MessageItem>,
  it: itMessages as Record<string, MessageItem>,
  ja: jaMessages as Record<string, MessageItem>,
  kn: knMessages as Record<string, MessageItem>,
  ko: koMessages as Record<string, MessageItem>,
  lt: ltMessages as Record<string, MessageItem>,
  lv: lvMessages as Record<string, MessageItem>,
  ml: mlMessages as Record<string, MessageItem>,
  mr: mrMessages as Record<string, MessageItem>,
  ms: msMessages as Record<string, MessageItem>,
  nl: nlMessages as Record<string, MessageItem>,
  no: noMessages as Record<string, MessageItem>,
  pl: plMessages as Record<string, MessageItem>,
  pt_BR: pt_BRMessages as Record<string, MessageItem>,
  pt_PT: pt_PTMessages as Record<string, MessageItem>,
  ro: roMessages as Record<string, MessageItem>,
  ru: ruMessages as Record<string, MessageItem>,
  sk: skMessages as Record<string, MessageItem>,
  sl: slMessages as Record<string, MessageItem>,
  sr: srMessages as Record<string, MessageItem>,
  sv: svMessages as Record<string, MessageItem>,
  sw: swMessages as Record<string, MessageItem>,
  ta: taMessages as Record<string, MessageItem>,
  te: teMessages as Record<string, MessageItem>,
  th: thMessages as Record<string, MessageItem>,
  tr: trMessages as Record<string, MessageItem>,
  uk: ukMessages as Record<string, MessageItem>,
  vi: viMessages as Record<string, MessageItem>,
  zh_CN: zh_CNMessages as Record<string, MessageItem>,
  zh_TW: zh_TWMessages as Record<string, MessageItem>
}

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
        if (localesData[cleaned]) return cleaned
        const base = uiLang.split("-")[0].split("_")[0].toLowerCase()
        if (base === "pt") return "pt_BR"
        if (base === "zh")
          return uiLang.toLowerCase().includes("tw") ||
            uiLang.toLowerCase().includes("hk")
            ? "zh_TW"
            : "zh_CN"
        if (localesData[base]) return base
      }
    } catch (e) {
      console.warn("Failed to get chrome UI language:", e)
    }
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const uiLang = navigator.language
    const cleaned = uiLang.replace("-", "_")
    if (localesData[cleaned]) return cleaned
    const base = uiLang.split("-")[0].toLowerCase()
    if (base === "pt") return "pt_BR"
    if (base === "zh")
      return uiLang.toLowerCase().includes("tw") ||
        uiLang.toLowerCase().includes("hk")
        ? "zh_TW"
        : "zh_CN"
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

const RTL_LOCALES = ["ar", "fa", "he"]

export function isRtlLocale(code: string): boolean {
  return RTL_LOCALES.includes(code)
}

export function getLocaleDirection(code: string): "rtl" | "ltr" {
  return isRtlLocale(code) ? "rtl" : "ltr"
}
