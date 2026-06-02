#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const assetsDir = path.join(rootDir, "assets")
const localesDir = path.join(rootDir, "locales")
const outDir = path.join(rootDir, "store-assets")
const globalScreenshotsDir = path.join(outDir, "localized", "en", "screenshots")
const localizedDir = path.join(outDir, "localized")
const tmpDir = path.join(outDir, ".tmp")
const buildDir = path.join(rootDir, "build", "chrome-mv3-prod")

const gameIcons = [
  "tango",
  "queens",
  "pinpoint",
  "crossclimb",
  "sudoku",
  "zip",
  "patches"
] as const

function q(value: string | number | boolean): string {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`
}

function run(command: string): void {
  execSync(command, { stdio: "inherit" })
}

function hasTool(name: string): boolean {
  try {
    execFileSync("which", [name], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function _ensureTool(name: string): void {
  if (!hasTool(name)) {
    throw new Error(
      `Required tool '${name}' is not installed or not available in PATH.`
    )
  }
}

function resolveImageMagickCmd(): string {
  return hasTool("magick") ? "magick" : "convert"
}

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true })
}

function renderSvg(
  svgPath: string,
  pngPath: string,
  width: number,
  height: number
): void {
  execFileSync(
    "rsvg-convert",
    ["-w", String(width), "-h", String(height), "-o", pngPath, svgPath],
    {
      stdio: "inherit"
    }
  )
}

const imageMagickCmd = resolveImageMagickCmd()

// --- Locale Utility Helpers ---
interface LocaleMessage {
  message?: string
  description?: string
}

interface LocaleMessages {
  [key: string]: LocaleMessage | undefined
}

function readLocaleMessages(locale: string): LocaleMessages {
  const localeFile = path.join(localesDir, locale, "messages.json")
  if (!existsSync(localeFile)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(localeFile, "utf8")) as LocaleMessages
  } catch {
    return {}
  }
}

function getMessageValue(messages: LocaleMessages, key: string): string {
  const value = messages?.[key]?.message
  return typeof value === "string" ? value : ""
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function resolveFontPathForLocale(locale: string): string {
  if (!locale.toLowerCase().startsWith("zh")) {
    return ""
  }
  try {
    const fontPath = execFileSync(
      "fc-match",
      ["-f", "%{file}", "sans:lang=zh-cn:charset=4E2D"],
      { encoding: "utf8" }
    ).trim()
    return existsSync(fontPath) ? fontPath : ""
  } catch {
    return ""
  }
}

// --- Mock Solve History Generator ---
interface GameSolveInfo {
  solved: boolean
  solvedAt?: string
  time: number
}

interface DaySolveInfo {
  [game: string]: GameSolveInfo
}

interface SolveHistory {
  [date: string]: DaySolveInfo
}

function getLocalDateString(offsetDays: number = 0): string {
  const d = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function generateMockSolveHistory(): SolveHistory {
  const todayStr = getLocalDateString(0)
  const yesterdayStr = getLocalDateString(1)
  const dayBeforeStr = getLocalDateString(2)

  return {
    [dayBeforeStr]: {
      crossclimb: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:01:28.803Z`,
        time: 203
      },
      patches: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:00:54.135Z`,
        time: 2
      },
      pinpoint: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:00:16.358Z`,
        time: 1
      },
      queens: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:01:28.379Z`,
        time: 4
      },
      sudoku: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:01:25.733Z`,
        time: 3
      },
      tango: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:01:27.383Z`,
        time: 4
      },
      zip: {
        solved: true,
        solvedAt: `${dayBeforeStr}T23:01:26.288Z`,
        time: 248
      }
    },
    [yesterdayStr]: {
      crossclimb: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:26:06.460Z`,
        time: 18
      },
      patches: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:21:58.006Z`,
        time: 4
      },
      pinpoint: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:24:27.684Z`,
        time: 4
      },
      queens: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:22:33.075Z`,
        time: 3
      },
      sudoku: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:21:50.275Z`,
        time: 1
      },
      tango: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:22:16.477Z`,
        time: 2
      },
      zip: {
        solved: true,
        solvedAt: `${yesterdayStr}T07:22:07.854Z`,
        time: 2
      }
    },
    [todayStr]: {
      patches: {
        solved: true,
        time: 376,
        solvedAt: `${todayStr}T08:26:36.253Z`
      },
      pinpoint: {
        solved: true,
        solvedAt: `${todayStr}T10:09:08.440Z`,
        time: 9
      },
      sudoku: {
        solved: true,
        time: 7,
        solvedAt: `${todayStr}T09:55:41.476Z`
      },
      tango: {
        solved: true,
        solvedAt: `${todayStr}T09:55:50.067Z`,
        time: 2
      },
      zip: {
        solved: true,
        time: 259,
        solvedAt: `${todayStr}T09:55:32.936Z`
      },
      crossclimb: {
        solved: true,
        time: 447,
        solvedAt: `${todayStr}T10:49:55.224Z`
      },
      queens: {
        solved: true,
        time: 2,
        solvedAt: `${todayStr}T10:50:29.857Z`
      }
    }
  }
}

// Generate active progress history (today partially solved)
function generateMockActiveHistory(): SolveHistory {
  const todayStr = getLocalDateString(0)
  const base = generateMockSolveHistory()

  base[todayStr] = {
    patches: {
      solved: true,
      time: 120,
      solvedAt: `${todayStr}T08:26:36.253Z`
    },
    pinpoint: {
      solved: true,
      solvedAt: `${todayStr}T10:09:08.440Z`,
      time: 9
    },
    sudoku: {
      solved: false,
      time: 0
    },
    tango: {
      solved: true,
      solvedAt: `${todayStr}T09:55:50.067Z`,
      time: 2
    },
    zip: {
      solved: true,
      time: 259,
      solvedAt: `${todayStr}T09:55:32.936Z`
    },
    crossclimb: {
      solved: false,
      time: 0
    },
    queens: {
      solved: true,
      time: 2,
      solvedAt: `${todayStr}T10:50:29.857Z`
    }
  }

  return base
}

// Render SVGs to temporary PNGs for composite use
function prepIconRenders(): void {
  ensureDir(tmpDir)

  renderSvg(
    path.join(assetsDir, "icon.svg"),
    path.join(tmpDir, "icon-96.png"),
    96,
    96
  )
  renderSvg(
    path.join(assetsDir, "icon.svg"),
    path.join(tmpDir, "icon-140.png"),
    140,
    140
  )
  renderSvg(
    path.join(assetsDir, "icon.svg"),
    path.join(tmpDir, "icon-170.png"),
    170,
    170
  )
  renderSvg(
    path.join(assetsDir, "icon.svg"),
    path.join(tmpDir, "icon-300.png"),
    300,
    300
  )

  for (const game of gameIcons) {
    renderSvg(
      path.join(assetsDir, `${game}.svg`),
      path.join(tmpDir, `${game}-220.png`),
      220,
      220
    )
    renderSvg(
      path.join(assetsDir, `${game}.svg`),
      path.join(tmpDir, `${game}-148.png`),
      148,
      148
    )
    renderSvg(
      path.join(assetsDir, `${game}.svg`),
      path.join(tmpDir, `${game}-120.png`),
      120,
      120
    )
  }
}

// Generate the 128x128 store icon
function generateStoreIcon(): void {
  const output = path.join(outDir, "store-icon-128.png")

  run(
    [
      imageMagickCmd,
      "-size",
      "128x128",
      "xc:none",
      q(path.join(tmpDir, "icon-96.png")),
      "-gravity",
      "center",
      "-composite",
      q(output)
    ].join(" ")
  )
}

const promoTranslations: Record<
  string,
  { title: string; line1: string; line2: string }
> = {
  en: {
    title: "Games Solver",
    line1: "Auto-solve daily puzzles",
    line2: "with live stats dashboard"
  },
  tr: {
    title: "Oyun Çözücü",
    line1: "Günlük bulmacaları otomatik çöz",
    line2: "canlı istatistik paneli ile"
  },
  es: {
    title: "Games Solver",
    line1: "Resuelve acertijos diarios",
    line2: "con panel de estadísticas"
  },
  fr: {
    title: "Games Solver",
    line1: "Résous les puzzles quotidiens",
    line2: "avec tableau de bord en direct"
  },
  pt_BR: {
    title: "Games Solver",
    line1: "Resolva quebra-cabeças diários",
    line2: "com painel de estatísticas"
  },
  pt_PT: {
    title: "Games Solver",
    line1: "Resolva quebra-cabeças diários",
    line2: "com painel de estatísticas"
  },
  de: {
    title: "Games Solver",
    line1: "Tägliche Rätsel automatisch lösen",
    line2: "mit Live-Statistik-Dashboard"
  },
  zh_CN: {
    title: "游戏助手",
    line1: "一键自动解密每日谜题",
    line2: "配备实时数据统计仪表盘"
  },
  zh_TW: {
    title: "遊戲助手",
    line1: "一鍵自動解密每日謎題",
    line2: "配備即時數據統計儀表盤"
  }
}

const marqueeTranslations: Record<
  string,
  { title: string; line1: string; line2: string }
> = {
  en: {
    title: "LinkedIn Games Solver",
    line1: "Auto-solve daily puzzles & track your streak with rich analytics",
    line2:
      "Supports: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  tr: {
    title: "LinkedIn Oyun Çözücü",
    line1: "Günlük bulmacaları otomatik çöz & istatistiklerini takip et",
    line2:
      "Desteklenenler: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  es: {
    title: "LinkedIn Games Solver",
    line1: "Resuelve acertijos diarios y sigue tus estadísticas de racha",
    line2:
      "Soporta: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  fr: {
    title: "LinkedIn Games Solver",
    line1: "Résous les puzzles quotidiens & suis ta série avec des analyses",
    line2:
      "Supporte: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  pt_BR: {
    title: "LinkedIn Games Solver",
    line1: "Resolva quebra-cabeças diários e acompanhe suas estatísticas",
    line2:
      "Suporta: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  pt_PT: {
    title: "LinkedIn Games Solver",
    line1: "Resolva quebra-cabeças diários e acompanhe suas estatísticas",
    line2:
      "Suporta: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  de: {
    title: "LinkedIn Games Solver",
    line1: "Tägliche Rätsel automatisch lösen & Statistiken verfolgen",
    line2:
      "Unterstützt: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
  },
  zh_CN: {
    title: "LinkedIn 游戏解密助手",
    line1: "一键自动解答每日谜题，配以丰富的通关数据分析与记录",
    line2:
      "支持游戏: 迷你数独 • 皇后 • 关联词 • 爬梯词 • 探戈 • 路线 • 碎片拼图"
  },
  zh_TW: {
    title: "LinkedIn 遊戲解密助手",
    line1: "一鍵自動解答每日謎題，配以豐富的通關數據分析與記錄",
    line2:
      "支持遊戲: 迷你數獨 • 皇后 • 關聯詞 • 爬梯詞 • 探戈 • 路線 • 碎片拼圖"
  }
}

// Generate 440x280 small promo tile
function generatePromoSmall(localeCode: string = "global"): void {
  const isGlobal = localeCode === "global"
  const actualLocale = isGlobal ? "en" : localeCode

  const targetDir = isGlobal
    ? path.join(outDir, "global")
    : path.join(outDir, "localized", actualLocale)

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const output = path.join(targetDir, "small-promo-440x280.jpg")
  const outputPng = path.join(targetDir, "small-promo-440x280.png")

  const screenshotPath = isGlobal
    ? path.join(globalScreenshotsDir, "screenshot-1.jpg")
    : path.join(
        outDir,
        "localized",
        actualLocale,
        "screenshots",
        "screenshot-1.jpg"
      )

  const translation = promoTranslations[actualLocale] || promoTranslations["en"]
  const localeFontPath = resolveFontPathForLocale(actualLocale)

  if (!existsSync(screenshotPath)) {
    console.log(
      `Screenshot-1 not found for ${actualLocale}, generating base Small Promo without screenshot...`
    )
    const cmdArgs = [
      imageMagickCmd,
      "-size",
      "440x280",
      q("gradient:#0a66c2-#1e3a8a"),
      "\\(",
      "-size",
      "440x280",
      "xc:none",
      "-fill",
      q("rgba(255,255,255,0.07)"),
      "-draw",
      q("circle 370,18 560,218"),
      "\\)",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "icon-170.png")),
      "\\)",
      "-gravity",
      "west",
      "-geometry",
      "+34+0",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "tango-120.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+30-56",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "queens-120.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+90+36",
      "-composite",
      ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
      "-strip"
    ]

    run([...cmdArgs, "-quality", "93", q(output)].join(" "))
    run([...cmdArgs, q(outputPng)].join(" "))
    return
  }

  console.log(
    `Generating premium Small Promo Tile (${actualLocale}) with embedded browser screenshot...`
  )
  const premiumArgs = [
    imageMagickCmd,
    "-size",
    "440x280",
    q("gradient:#0a66c2-#0f172a"),
    // Glowing decorative elements
    "\\(",
    "-size",
    "440x280",
    "xc:none",
    "-fill",
    q("rgba(255,255,255,0.05)"),
    "-draw",
    q("circle 380,180 440,240"),
    "\\)",
    "-composite",
    // Embed popup screenshot
    "\\(",
    q(screenshotPath),
    "-resize",
    "166x",
    "-bordercolor",
    q("rgba(255,255,255,0.15)"),
    "-border",
    "1",
    "\\)",
    "-gravity",
    "east",
    "-geometry",
    "+36+0",
    "-composite",
    // Embed extension icon logo
    "\\(",
    q(path.join(tmpDir, "icon-96.png")),
    "-resize",
    "60x60",
    "\\)",
    "-gravity",
    "west",
    "-geometry",
    "+36-36",
    "-composite",
    // Render clean, modern typography
    ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
    "-pointsize",
    "22",
    "-fill",
    "white",
    "-gravity",
    "northwest",
    "-annotate",
    "+36+154",
    q(translation.title),
    "-pointsize",
    "11",
    "-fill",
    q("#94a3b8"),
    "-annotate",
    "+36+186",
    q(translation.line1),
    "-annotate",
    "+36+202",
    q(translation.line2),
    "-strip"
  ]

  run([...premiumArgs, "-quality", "93", q(output)].join(" "))
  run([...premiumArgs, q(outputPng)].join(" "))
}

// Generate 1400x560 marquee promo tile
function generatePromoMarquee(localeCode: string = "global"): void {
  const isGlobal = localeCode === "global"
  const actualLocale = isGlobal ? "en" : localeCode

  const targetDir = isGlobal
    ? path.join(outDir, "global")
    : path.join(outDir, "localized", actualLocale)

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const output = path.join(targetDir, "marquee-promo-1400x560.jpg")
  const outputPng = path.join(targetDir, "marquee-promo-1400x560.png")

  const popupPath = isGlobal
    ? path.join(globalScreenshotsDir, "screenshot-1.jpg")
    : path.join(
        outDir,
        "localized",
        actualLocale,
        "screenshots",
        "screenshot-1.jpg"
      )
  const dashboardPath = isGlobal
    ? path.join(globalScreenshotsDir, "screenshot-3.jpg")
    : path.join(
        outDir,
        "localized",
        actualLocale,
        "screenshots",
        "screenshot-3.jpg"
      )

  const translation =
    marqueeTranslations[actualLocale] || marqueeTranslations["en"]
  const localeFontPath = resolveFontPathForLocale(actualLocale)

  if (!existsSync(popupPath) || !existsSync(dashboardPath)) {
    console.log(
      `Screenshots not found for ${actualLocale}, generating base Marquee Promo without screenshots...`
    )
    const baseArgs = [
      imageMagickCmd,
      "-size",
      "1400x560",
      q("gradient:#0a66c2-#0f172a"),
      "\\(",
      "-size",
      "1400x560",
      "xc:none",
      "-fill",
      q("rgba(255,255,255,0.06)"),
      "-draw",
      q("circle 1180,-30 1620,420"),
      "\\)",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "icon-300.png")),
      "\\)",
      "-gravity",
      "west",
      "-geometry",
      "+120+0",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "tango-220.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+280-120",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "pinpoint-220.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+120+0",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "queens-220.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+340+140",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "zip-220.png")),
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+30+150",
      "-composite",
      ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
      "-strip"
    ]

    run([...baseArgs, "-quality", "93", q(output)].join(" "))
    run([...baseArgs, q(outputPng)].join(" "))
    return
  }

  console.log(
    `Generating premium Marquee Promo Tile (${actualLocale}) with layered screenshot mockups...`
  )
  const premiumArgs = [
    imageMagickCmd,
    "-size",
    "1400x560",
    q("gradient:#0a66c2-#0f172a"),
    // Glowing decorative circles
    "\\(",
    "-size",
    "1400x560",
    "xc:none",
    "-fill",
    q("rgba(255,255,255,0.04)"),
    "-draw",
    q("circle 1150,280 1280,360"),
    "\\)",
    "-composite",
    // Layer the large Dashboard screenshot in the background (center-right)
    "\\(",
    q(dashboardPath),
    "-resize",
    "560x",
    "-bordercolor",
    q("rgba(255,255,255,0.12)"),
    "-border",
    "2",
    "\\)",
    "-gravity",
    "east",
    "-geometry",
    "+130-10",
    "-composite",
    // Layer the smaller Popup screenshot overlapping it in the foreground
    "\\(",
    q(popupPath),
    "-resize",
    "210x",
    "-bordercolor",
    q("rgba(255,255,255,0.2)"),
    "-border",
    "2",
    "\\)",
    "-gravity",
    "east",
    "-geometry",
    "+64+76",
    "-composite",
    // Brand logo icon on the left (shifted slightly up to increase vertical margin)
    "\\(",
    q(path.join(tmpDir, "icon-300.png")),
    "-resize",
    "120x120",
    "\\)",
    "-gravity",
    "west",
    "-geometry",
    "+90-135",
    "-composite",
    // Premium Titles & Text overlay (shifted slightly down to give breathing room under the logo)
    ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
    "-pointsize",
    "52",
    "-fill",
    "white",
    "-gravity",
    "northwest",
    "-annotate",
    "+90+245",
    q(translation.title),
    "-pointsize",
    "18",
    "-fill",
    q("#94a3b8"),
    "-annotate",
    "+90+320",
    q(translation.line1),
    "-pointsize",
    "13",
    "-fill",
    q("#38bdf8"),
    "-annotate",
    "+90+360",
    q(translation.line2),
    "-strip"
  ]

  run([...premiumArgs, "-quality", "93", q(output)].join(" "))
  run([...premiumArgs, q(outputPng)].join(" "))
}

// --- Puppeteer Screenshot Engine ---
async function captureScreenshots(locale: string = "en"): Promise<void> {
  console.log(`\nGenerating screenshots for locale: [${locale.toUpperCase()}]`)

  if (!existsSync(buildDir)) {
    console.log("No built extension found. Building extension...")
    run("pnpm build")
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: [
      `--disable-extensions-except=${buildDir}`,
      `--load-extension=${buildDir}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--single-process"
    ]
  })

  try {
    const workerTarget = await browser.waitForTarget(
      (target) =>
        target.type() === "service_worker" ||
        target.url().startsWith("chrome-extension://"),
      { timeout: 10000 }
    )
    const extensionId = new URL(workerTarget.url()).hostname

    const popupUrl = `chrome-extension://${extensionId}/popup.html`
    const dashboardUrl = `chrome-extension://${extensionId}/tabs/dashboard.html`

    const saveDir = path.join(localizedDir, locale, "screenshots")
    ensureDir(saveDir)

    const page = await browser.newPage()

    const takeDualScreenshot = async (name: string) => {
      await page.screenshot({
        path: path.join(saveDir, `${name}.jpg`),
        type: "jpeg",
        quality: 92
      })
      await page.screenshot({
        path: path.join(saveDir, `${name}.png`),
        type: "png"
      })
    }

    // ----------------------------------------------------
    // SCENE 1: Popup Showcase - Perfect Day Progress
    // ----------------------------------------------------
    console.log("Capturing Scene 1: Popup - Perfect Day...")
    await page.goto(popupUrl, { waitUntil: "networkidle2" })

    const perfectHistory = generateMockSolveHistory()
    await page.evaluate(
      (historyData: SolveHistory, loc: string) => {
        localStorage.setItem("user-locale", loc)
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              theme: "dark",
              solveHistory: historyData,
              aiProvider: "gemini",
              aiModel: "gemini-2.5-flash",
              aiApiKey: "AIzaSyD-mocked-gemini-key-for-aesthetic"
            },
            () => {
              chrome.storage.sync.set(
                {
                  theme: "dark",
                  solveHistory: historyData
                },
                resolve
              )
            }
          )
        })
      },
      perfectHistory,
      locale
    )

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await page.evaluate((loc: string) => {
      const originalContent = document.body.innerHTML
      document.body.innerHTML = ""

      Object.assign(document.body.style, {
        width: "1280px",
        height: "800px",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a66c2 0%, #0b1220 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      })

      const titleWrapper = document.createElement("div")
      titleWrapper.style.textAlign = "center"
      titleWrapper.style.marginBottom = "24px"
      titleWrapper.style.color = "#ffffff"

      const extensionNameMap: Record<string, string> = {
        en: "LinkedIn Games Solver",
        tr: "LinkedIn Oyun Çözücü",
        es: "Solucionador de Juegos de LinkedIn",
        fr: "Résolveur de Jeux LinkedIn",
        pt_BR: "Solucionador de Jogos do LinkedIn",
        pt_PT: "Solucionador de Jogos do LinkedIn",
        de: "LinkedIn-Spiele-Löser",
        zh_CN: "LinkedIn 游戏求解器",
        zh_TW: "LinkedIn 遊戲助手"
      }
      const subtitleMap: Record<string, string> = {
        en: "Power up your workday puzzles with premium AI reasoning",
        tr: "Gelişmiş yapay zeka ile günlük bulmacalarınızı tek tıkla çözün",
        es: "Resuelva sus acertijos diarios con IA de primera calidad",
        fr: "Résolvez vos puzzles quotidiens avec une IA premium",
        pt_BR: "Resolva seus quebra-cabeças diários com IA premium",
        pt_PT: "Resolva os seus quebra-cabeças diários com IA premium",
        de: "Lösen Sie Ihre täglichen Rätsel mit Premium-KI-Logik",
        zh_CN: "借助优质人工智能推理能力，轻松解决每日难题",
        zh_TW: "一鍵自動求解當前 LinkedIn 遊戲"
      }

      titleWrapper.innerHTML = `
        <h1 style="font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${extensionNameMap[loc] || "LinkedIn Games Solver"}</h1>
        <p style="font-size: 15px; color: rgba(255,255,255,0.75); margin: 8px 0 0 0; font-weight: 500;">${subtitleMap[loc] || subtitleMap.en}</p>
      `
      document.body.appendChild(titleWrapper)

      const windowFrame = document.createElement("div")
      Object.assign(windowFrame.style, {
        width: "470px",
        height: "550px",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        background: "#1d2226",
        display: "flex",
        flexDirection: "column"
      })

      const macHeader = document.createElement("div")
      Object.assign(macHeader.style, {
        height: "28px",
        background: "#1f2226",
        display: "flex",
        alignItems: "center",
        paddingLeft: "12px",
        gap: "6px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
      })
      macHeader.innerHTML = `
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #ff5f56;"></div>
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #ffbd2e;"></div>
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #27c93f;"></div>
      `
      windowFrame.appendChild(macHeader)

      const contentContainer = document.createElement("div")
      Object.assign(contentContainer.style, {
        flex: "1",
        overflow: "auto",
        position: "relative"
      })
      contentContainer.innerHTML = originalContent
      windowFrame.appendChild(contentContainer)

      document.body.appendChild(windowFrame)
    }, locale)

    await new Promise((r) => setTimeout(r, 1200))
    await takeDualScreenshot("screenshot-1")

    // ----------------------------------------------------
    // SCENE 2: Popup Showcase - Active Board Blinking
    // ----------------------------------------------------
    console.log("Capturing Scene 2: Popup - Active Board Detected...")
    await page.goto(popupUrl, { waitUntil: "networkidle2" })

    const activeHistory = generateMockActiveHistory()
    await page.evaluate(
      (historyData: SolveHistory, loc: string) => {
        localStorage.setItem("user-locale", loc)
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              theme: "dark",
              solveHistory: historyData,
              aiProvider: "gemini",
              aiModel: "gemini-2.5-flash",
              aiApiKey: "AIzaSyD-mocked-gemini-key-for-aesthetic"
            },
            () => {
              chrome.storage.sync.set(
                {
                  theme: "dark",
                  solveHistory: historyData
                },
                resolve
              )
            }
          )
        })
      },
      activeHistory,
      locale
    )

    await page.evaluate(() => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        ;(chrome.tabs as Record<string, unknown>).sendMessage = (
          _tabId: number,
          msg: Record<string, unknown>,
          cb: (response: unknown) => void
        ) => {
          if (msg && msg.action === "detectGame") {
            setTimeout(() => cb({ game: "sudoku" }), 30)
          } else {
            setTimeout(() => cb(null), 30)
          }
        }
      }
    })

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await page.evaluate((loc: string) => {
      const originalContent = document.body.innerHTML
      document.body.innerHTML = ""

      Object.assign(document.body.style, {
        width: "1280px",
        height: "800px",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f766e 0%, #0b1220 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      })

      const titleWrapper = document.createElement("div")
      titleWrapper.style.textAlign = "center"
      titleWrapper.style.marginBottom = "24px"
      titleWrapper.style.color = "#ffffff"

      const tagMap: Record<string, string> = {
        en: "NATIVE INTEGRATION",
        tr: "DOĞAL ENTEGRASYON",
        es: "INTEGRACIÓN NATIVA",
        fr: "INTÉGRATION NATIVE",
        pt_BR: "INTEGRAÇÃO NATIVA",
        pt_PT: "INTEGRAÇÃO NATIVA",
        de: "NATIVE INTEGRATION",
        zh_CN: "原生集成",
        zh_TW: "原生內嵌整合"
      }
      const subtitleMap: Record<string, string> = {
        en: "Detects open LinkedIn boards and solves them right on the screen",
        tr: "Açık olan LinkedIn panolarını anında tespit eder ve ekranda çözer",
        es: "Detecta los tableros de LinkedIn abiertos y los resuelve directamente",
        fr: "Detecte les plateaux LinkedIn ouverts et les résout sur l'écran",
        pt_BR:
          "Detecta tabuleiros abertos do LinkedIn e os resolve diretamente na tela",
        pt_PT:
          "Deteta tabuleiros abertos do LinkedIn e resolve-os diretamente no ecrã",
        de: "Erkennt geöffnete LinkedIn-Spiele und löst sie direkt auf dem Bildschirm",
        zh_CN: "自动检测已打开的 LinkedIn 游戏盘并直接在屏幕上求解",
        zh_TW: "自動偵測開啟的 LinkedIn 棋盤並直接在螢幕上求解"
      }

      titleWrapper.innerHTML = `
        <span style="font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.12); color: #ffffff; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">${tagMap[loc] || "NATIVE INTEGRATION"}</span>
        <h1 style="font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${subtitleMap[loc] || subtitleMap.en}</h1>
      `
      document.body.appendChild(titleWrapper)

      const windowFrame = document.createElement("div")
      Object.assign(windowFrame.style, {
        width: "470px",
        height: "550px",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        background: "#1d2226",
        display: "flex",
        flexDirection: "column"
      })

      const macHeader = document.createElement("div")
      Object.assign(macHeader.style, {
        height: "28px",
        background: "#1f2226",
        display: "flex",
        alignItems: "center",
        paddingLeft: "12px",
        gap: "6px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
      })
      macHeader.innerHTML = `
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #ff5f56;"></div>
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #ffbd2e;"></div>
        <div style="width: 9px; height: 9px; border-radius: 50%; background: #27c93f;"></div>
      `
      windowFrame.appendChild(macHeader)

      const contentContainer = document.createElement("div")
      Object.assign(contentContainer.style, {
        flex: "1",
        overflow: "auto",
        position: "relative"
      })
      contentContainer.innerHTML = originalContent
      windowFrame.appendChild(contentContainer)

      document.body.appendChild(windowFrame)
    }, locale)

    await new Promise((r) => setTimeout(r, 1200))
    await takeDualScreenshot("screenshot-2")

    // ----------------------------------------------------
    // SCENE 3: Desktop Dashboard - History & Statistics
    // ----------------------------------------------------
    console.log("Capturing Scene 3: Desktop Dashboard - Stats...")
    await page.goto(dashboardUrl, { waitUntil: "networkidle2" })

    await page.evaluate(
      (historyData: SolveHistory, loc: string) => {
        localStorage.setItem("user-locale", loc)
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              theme: "dark",
              solveHistory: historyData,
              aiProvider: "gemini",
              aiModel: "gemini-2.5-flash",
              aiApiKey: "AIzaSyD-mocked-gemini-key-for-aesthetic"
            },
            () => {
              chrome.storage.sync.set(
                {
                  theme: "dark",
                  solveHistory: historyData
                },
                resolve
              )
            }
          )
        })
      },
      perfectHistory,
      locale
    )

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await new Promise((r) => setTimeout(r, 1200))
    await takeDualScreenshot("screenshot-3")

    // ----------------------------------------------------
    // SCENE 4: Desktop Dashboard - Options AI Config Settings
    // ----------------------------------------------------
    console.log("Capturing Scene 4: Desktop Dashboard - Options settings...")
    await page.goto(dashboardUrl, { waitUntil: "networkidle2" })

    await page.evaluate(
      (historyData: SolveHistory, loc: string) => {
        localStorage.setItem("user-locale", loc)
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              theme: "dark",
              solveHistory: historyData,
              aiProvider: "gemini",
              aiModel: "gemini-2.5-flash",
              aiApiKey: "AIzaSyD-mocked-gemini-key-for-aesthetic"
            },
            () => {
              chrome.storage.sync.set(
                {
                  theme: "dark",
                  solveHistory: historyData
                },
                resolve
              )
            }
          )
        })
      },
      perfectHistory,
      locale
    )

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await page.evaluate(() => {
      // Find settings button language-agnostically by checking for the Lucide Settings icon
      const settingsIcon = document.querySelector("svg.lucide-settings")
      if (settingsIcon) {
        const btn = settingsIcon.closest("button")
        if (btn) {
          btn.click()
          return
        }
      }

      // Fallback: search for buttons containing common text combinations
      const buttons = Array.from(document.querySelectorAll("button"))
      const settingsBtn = buttons.find(
        (b) =>
          b.querySelector("svg.lucide-settings") ||
          b.textContent?.includes("AI Config") ||
          b.textContent?.includes("Options") ||
          b.textContent?.includes("Optionen") ||
          b.textContent?.includes("Einstellungen") ||
          b.textContent?.includes("Ayarlar") ||
          b.textContent?.includes("Configur") ||
          b.textContent?.includes("Configuration") ||
          b.textContent?.includes("Konfiguration") ||
          b.textContent?.includes("设置")
      )
      if (settingsBtn) {
        settingsBtn.click()
      }
    })

    await new Promise((r) => setTimeout(r, 1000))
    await takeDualScreenshot("screenshot-4")

    // ----------------------------------------------------
    // SCENE 5: Side Panel Showcase
    // ----------------------------------------------------
    console.log("Capturing Scene 5: Side Panel Showcase...")
    const sidepanelUrl = `chrome-extension://${extensionId}/sidepanel.html`
    await page.goto(sidepanelUrl, { waitUntil: "networkidle2" })

    await page.evaluate(
      (historyData: SolveHistory, loc: string) => {
        localStorage.setItem("user-locale", loc)
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              theme: "dark",
              solveHistory: historyData,
              aiProvider: "gemini",
              aiModel: "gemini-2.5-flash",
              aiApiKey: "AIzaSyD-mocked-gemini-key-for-aesthetic"
            },
            () => {
              chrome.storage.sync.set(
                {
                  theme: "dark",
                  solveHistory: historyData
                },
                resolve
              )
            }
          )
        })
      },
      activeHistory,
      locale
    )

    await page.evaluate(`() => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.sendMessage = function(_tabId, msg, cb) {
          if (msg && msg.action === "detectGame") {
            setTimeout(function() { cb({ game: "queens" }); }, 30);
          } else {
            setTimeout(function() { cb(null); }, 30);
          }
        };
      }
    }`)

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await page.evaluate((loc: string) => {
      const originalContent = document.body.innerHTML
      document.body.innerHTML = ""

      Object.assign(document.body.style, {
        width: "1280px",
        height: "800px",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e3a8a 0%, #0b1220 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      })

      const titleWrapper = document.createElement("div")
      titleWrapper.style.textAlign = "center"
      titleWrapper.style.marginBottom = "20px"
      titleWrapper.style.color = "#ffffff"

      const tagMap: Record<string, string> = {
        en: "SIDEBAR INTEGRATION",
        tr: "YAN PANEL ENTEGRASYONU",
        es: "INTEGRACIÓN DE PANEL LATERAL",
        fr: "INTEGRATION PANNEAU LATÉRAL",
        pt_BR: "INTEGRAÇÃO DO PAINEL LATERAL",
        pt_PT: "INTEGRAÇÃO DO PAINEL LATERAL",
        de: "SEITENLEISTEN-INTEGRATION",
        zh_CN: "侧边栏原生集成",
        zh_TW: "側邊欄原生整合"
      }
      const subtitleMap: Record<string, string> = {
        en: "Keep your solver open on the side while playing on the main screen",
        tr: "Ana ekranda oynarken çözücüyü yan panelde açık tutun",
        es: "Mantenga el solucionador abierto a un lado mientras juega en la pantalla principal",
        fr: "Gardez le résolveur ouvert sur le côté tout en jouant sur l'écran principal",
        pt_BR:
          "Mantenha o solucionador aberto na lateral enquanto joga na tela principal",
        pt_PT:
          "Mantenha o solucionador aberto na lateral enquanto joga no ecrã principal",
        de: "Halten Sie den Löser an der Seite geöffnet, während Sie auf dem Hauptbildschirm spielen",
        zh_CN: "在主屏幕游戏时，可在侧边栏保持求解器常驻开启",
        zh_TW: "在主畫面遊戲時，可在側邊欄保持求解器常駐開啟"
      }

      titleWrapper.innerHTML = `
        <span style="font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.12); color: #ffffff; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">${tagMap[loc] || "SIDEBAR INTEGRATION"}</span>
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${subtitleMap[loc] || subtitleMap.en}</h1>
      `
      document.body.appendChild(titleWrapper)

      const browserMock = document.createElement("div")
      Object.assign(browserMock.style, {
        width: "1100px",
        height: "600px",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        background: "#1d2226",
        display: "flex",
        flexDirection: "column"
      })

      const browserHeader = document.createElement("div")
      Object.assign(browserHeader.style, {
        height: "36px",
        background: "#1f2226",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        justifyContent: "space-between"
      })

      const windowControls = `
        <div style="display: flex; gap: 6px;">
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #ff5f56;"></div>
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #ffbd2e;"></div>
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #27c93f;"></div>
        </div>
      `
      const urlBar = `
        <div style="background: rgba(0, 0, 0, 0.25); border-radius: 6px; font-size: 10px; color: rgba(255,255,255,0.65); padding: 4px 120px; border: 1px solid rgba(255, 255, 255, 0.05); font-family: monospace;">
          linkedin.com/games/queens/
        </div>
      `
      browserHeader.innerHTML = `${windowControls}${urlBar}<div style="width: 38px;"></div>`
      browserMock.appendChild(browserHeader)

      const splitWorkspace = document.createElement("div")
      Object.assign(splitWorkspace.style, {
        flex: "1",
        display: "flex",
        overflow: "hidden"
      })

      // Left column: Mock LinkedIn Queens board
      const mockGamePane = document.createElement("div")
      Object.assign(mockGamePane.style, {
        width: "760px",
        height: "100%",
        background: "#090d16",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        boxSizing: "border-box",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)"
      })

      // Generate 8x8 colored cells
      const regionsColors = [
        "#1e3a8a",
        "#1e3a8a",
        "#1e3a8a",
        "#0369a1",
        "#0369a1",
        "#0369a1",
        "#0369a1",
        "#0369a1",
        "#1d4ed8",
        "#1e3a8a",
        "#1e3a8a",
        "#0369a1",
        "#0284c7",
        "#0284c7",
        "#0f766e",
        "#0f766e",
        "#1d4ed8",
        "#1d4ed8",
        "#1e3a8a",
        "#0284c7",
        "#0284c7",
        "#0f766e",
        "#0f766e",
        "#0f766e",
        "#3b82f6",
        "#1d4ed8",
        "#1d4ed8",
        "#6366f1",
        "#6366f1",
        "#4f46e5",
        "#0f766e",
        "#0f766e",
        "#3b82f6",
        "#3b82f6",
        "#1d4ed8",
        "#6366f1",
        "#4f46e5",
        "#4f46e5",
        "#4f46e5",
        "#0f766e",
        "#059669",
        "#3b82f6",
        "#6366f1",
        "#6366f1",
        "#4f46e5",
        "#065f46",
        "#065f46",
        "#065f46",
        "#059669",
        "#059669",
        "#059669",
        "#059669",
        "#065f46",
        "#065f46",
        "#065f46",
        "#065f46",
        "#059669",
        "#059669",
        "#059669",
        "#065f46",
        "#065f46",
        "#065f46",
        "#065f46",
        "#065f46"
      ]

      let cellsHtml = ""
      for (let i = 0; i < 64; i++) {
        const r = Math.floor(i / 8)
        const c = i % 8
        const color = regionsColors[i]
        let txt = ""
        if (r === 0 && c === 3) txt = "👑"
        else if (
          (r === 0 && Math.abs(c - 3) === 1) ||
          (c === 3 && Math.abs(r - 0) === 1)
        )
          txt = "×"
        cellsHtml += `
          <div style="background: ${color}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: #ffffff; cursor: default;">${txt}</div>
        `
      }

      mockGamePane.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: #ffffff;">LinkedIn Queens</h2>
            <p style="font-size: 11px; color: rgba(255,255,255,0.55); margin: 3px 0 0 0;">Crown each region. One queen per row, column, and colored region.</p>
          </div>
          <div style="background: rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 4px 10px; font-size: 9px; font-weight: bold; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 4px;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #0a66c2; display: inline-block;"></span> Active Board
          </div>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
          <div style="display: grid; grid-template-columns: repeat(8, 38px); grid-template-rows: repeat(8, 38px); gap: 2px; background: rgba(0, 0, 0, 0.3); padding: 6px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08);">
            ${cellsHtml}
          </div>
        </div>
      `
      splitWorkspace.appendChild(mockGamePane)

      // Right column: Elongated Side Panel
      const mockSidepanelPane = document.createElement("div")
      Object.assign(mockSidepanelPane.style, {
        width: "340px",
        height: "100%",
        overflow: "auto",
        position: "relative",
        background: "#1d2226"
      })
      mockSidepanelPane.innerHTML = originalContent
      splitWorkspace.appendChild(mockSidepanelPane)

      browserMock.appendChild(splitWorkspace)
      document.body.appendChild(browserMock)
    }, locale)

    await new Promise((r) => setTimeout(r, 1200))
    await takeDualScreenshot("screenshot-5")

    // ----------------------------------------------------
    // SCENE 6: DevTools diagnostics and telemetry panel
    // ----------------------------------------------------
    console.log("Capturing Scene 6: DevTools diagnostics panel...")
    const devtoolsUrl = `chrome-extension://${extensionId}/tabs/devtools-panel.html`
    await page.goto(devtoolsUrl, { waitUntil: "networkidle2" })

    await page.evaluate(`() => {
      // Mock window.chrome.devtools
      var mockChrome = window.chrome || {};
      mockChrome.devtools = {
        inspectedWindow: {
          tabId: 42,
          eval: function(script, callback) {
            if (script.includes("window.location.href")) {
              callback("https://www.linkedin.com/games/queens/");
            } else if (script.includes("Queens") || script.includes("queens")) {
              callback("Queens");
            } else if (script.includes("cellInspectScript") || script.includes("cellSelectors")) {
              // Beautiful 8x8 colored cells mockup for Queens F12 Inspector
              var mockCells = [];
              var regionsColors = [
                "rgba(30, 58, 138, 0.8)",   // blue
                "rgba(3, 105, 161, 0.8)",   // light blue
                "rgba(29, 78, 216, 0.8)",   // dark blue
                "rgba(2, 132, 199, 0.8)",   // sky
                "rgba(15, 118, 110, 0.8)",  // teal
                "rgba(59, 130, 246, 0.8)",  // indigo
                "rgba(99, 102, 241, 0.8)",  // violet
                "rgba(6, 95, 70, 0.8)"      // green
              ];
              for (var i = 0; i < 64; i++) {
                var r = Math.floor(i / 8);
                var c = i % 8;
                var color = regionsColors[r % regionsColors.length];
                var text = "";
                var ariaLabel = "cell region";
                if (r === 0 && c === 3) {
                  text = "👑";
                  ariaLabel = "Queen";
                } else if ((r === 0 && Math.abs(c - 3) === 1) || (c === 3 && Math.abs(r - 0) === 1)) {
                  text = "x";
                  ariaLabel = "empty marker";
                }
                mockCells.push({
                  id: "cell-position-" + r + "-" + c,
                  text: text,
                  ariaLabel: ariaLabel,
                  disabled: false,
                  color: color
                });
              }
              callback(mockCells);
            } else if (script.includes("mainHtmlScript")) {
              callback("<main class='queens-board'>...</main>");
            } else {
              callback(null);
            }
          }
        }
      };

      // Mock window.chrome.storage.session
      mockChrome.storage = mockChrome.storage || {};
      mockChrome.storage.session = {
        get: function(key, callback) {
          callback({
            solverLogs: [
              { timestamp: "12:04:15", type: "info", message: "Queens solver engine initialized successfully." },
              { timestamp: "12:04:16", type: "log", message: "Scanning grid DOM looking for .queens-cell nodes..." },
              { timestamp: "12:04:16", type: "info", message: "Found 64 active board cells with 8 color regions." },
              { timestamp: "12:04:17", type: "log", message: "Formulating integer programming constraint matrix..." },
              { timestamp: "12:04:17", type: "log", message: "Running back-tracking solver thread (pacing: Stealth Mode)..." },
              { timestamp: "12:04:18", type: "info", message: "Validating column/row constraints: no conflicts found." },
              { timestamp: "12:04:19", type: "info", message: "Placing Queen at cell (0, 3) in region 1." },
              { timestamp: "12:04:19", type: "log", message: "Triggering mouse clicks on LinkedIn game grid..." },
              { timestamp: "12:04:20", type: "info", message: "Board solved successfully in 4.8 seconds! 🎉" }
            ]
          });
        },
        remove: function(key) { return Promise.resolve(); },
        onChanged: {
          addListener: function() {},
          removeListener: function() {}
        }
      };
      window.chrome = mockChrome;
    }`)

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await page.evaluate((loc: string) => {
      const originalContent = document.body.innerHTML
      document.body.innerHTML = ""

      Object.assign(document.body.style, {
        width: "1280px",
        height: "800px",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4f46e5 0%, #09090b 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      })

      const titleWrapper = document.createElement("div")
      titleWrapper.style.textAlign = "center"
      titleWrapper.style.marginBottom = "20px"
      titleWrapper.style.color = "#ffffff"

      const tagMap: Record<string, string> = {
        en: "DIAGNOSTICS & TELEMETRY",
        tr: "TEŞHİS VE TELEMETRİ",
        es: "DIAGNÓSTICOS Y TELEMETRÍA",
        fr: "DIAGNOSTICS & TÉLÉMÉTRIE",
        pt_BR: "DIAGNÓSTICOS E TELEMETRIA",
        pt_PT: "DIAGNÓSTICOS E TELEMETRIA",
        de: "DIAGNOSE & TELEMETRIE",
        zh_CN: "开发者调试与遥测面板",
        zh_TW: "開發者調試與遙測面板"
      }
      const subtitleMap: Record<string, string> = {
        en: "Inspect live grid coordinates, cells, and constraint state in DevTools",
        tr: "Geliştirici Araçları'nda canlı hücre koordinatlarını ve kısıtlama durumlarını izleyin",
        es: "Inspeccione coordenadas, celdas y estados de restricciones en vivo en DevTools",
        fr: "Inspectez les coordonnées de la grille, les cellules et les contraintes en direct dans DevTools",
        pt_BR:
          "Inspecione coordenadas, células e restrições em tempo real no DevTools",
        pt_PT:
          "Inspecione coordenadas, células e restrições em tempo real no DevTools",
        de: "Überwachen Sie Koordinaten, Zellen und Bedingungen live in den DevTools",
        zh_CN: "在 F12 开发者工具中实时查看棋盘单元格属性、条件状态和调试日志",
        zh_TW: "在 F12 開發者工具中即時查看棋盤儲存格屬性、條件狀態與偵錯日誌"
      }

      titleWrapper.innerHTML = `
        <span style="font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.12); color: #ffffff; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">${tagMap[loc] || "DIAGNOSTICS & TELEMETRY"}</span>
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${subtitleMap[loc] || subtitleMap.en}</h1>
      `
      document.body.appendChild(titleWrapper)

      const f12Mock = document.createElement("div")
      Object.assign(f12Mock.style, {
        width: "1000px",
        height: "560px",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        background: "#09090b",
        display: "flex",
        flexDirection: "column"
      })

      const f12Header = document.createElement("div")
      Object.assign(f12Header.style, {
        height: "36px",
        background: "#18181b",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        gap: "16px"
      })

      const windowControls = `
        <div style="display: flex; gap: 6px; margin-right: 12px;">
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #ff5f56;"></div>
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #ffbd2e;"></div>
          <div style="width: 9px; height: 9px; border-radius: 50%; background: #27c93f;"></div>
        </div>
      `
      const devtoolsTab = `
        <div style="display: flex; items-center; font-size: 10px; gap: 12px; color: rgba(255,255,255,0.4); font-weight: bold;">
          <span>Elements</span>
          <span>Console</span>
          <span>Sources</span>
          <span>Network</span>
          <span style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: -8px;">LinkedIn Games Solver</span>
        </div>
      `
      f12Header.innerHTML = `${windowControls}${devtoolsTab}`
      f12Mock.appendChild(f12Header)

      const f12Content = document.createElement("div")
      Object.assign(f12Content.style, {
        flex: "1",
        overflow: "hidden",
        position: "relative"
      })
      f12Content.innerHTML = originalContent
      f12Mock.appendChild(f12Content)

      document.body.appendChild(f12Mock)
    }, locale)

    await new Promise((r) => setTimeout(r, 1200))
    await takeDualScreenshot("screenshot-6")
  } catch (error) {
    console.error(`Error generating screenshots for locale [${locale}]:`, error)
  } finally {
    await browser.close()
  }
}

// --- Global Social Previews Generator ---
function generateSocialPreviews(): void {
  const socialDir = path.join(outDir, "social")
  ensureDir(socialDir)

  const globalLarge = path.join(socialDir, "social-1280x640.jpg")
  const globalSmall = path.join(socialDir, "social-640x320.jpg")

  run(
    [
      imageMagickCmd,
      "-size",
      "1280x640",
      q("gradient:#0a66c2-#0f172a"),
      "-gravity",
      "center",
      "-fill",
      q("#0b1220"),
      "-draw",
      q("roundrectangle 80,80 1200,560 28,28"),
      "\\(",
      q(path.join(tmpDir, "tango-220.png")),
      "-resize",
      "260x260",
      "\\)",
      "-gravity",
      "west",
      "-geometry",
      "+160+0",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "queens-220.png")),
      "-resize",
      "260x260",
      "\\)",
      "-gravity",
      "center",
      "-geometry",
      "+0+0",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "icon-300.png")),
      "-resize",
      "180x180",
      "\\)",
      "-gravity",
      "east",
      "-geometry",
      "+160+0",
      "-composite",
      "-strip",
      "-quality",
      "92",
      q(globalLarge)
    ].join(" ")
  )

  run(
    [
      imageMagickCmd,
      q(globalLarge),
      "-resize",
      "640x320",
      "-strip",
      "-quality",
      "92",
      q(globalSmall)
    ].join(" ")
  )
}

// --- Localized Social Previews Generator ---
function generateLocalizedSocialPreviews(): void {
  if (!existsSync(localesDir)) {
    return
  }

  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const fallbackMessages = readLocaleMessages("en")
  const globalLarge = path.join(outDir, "social", "social-1280x640.jpg")

  if (!existsSync(globalLarge)) {
    console.error("Global social preview template not found! Cannot localize.")
    return
  }

  for (const locale of locales) {
    const localeSocialDir = path.join(localizedDir, locale, "social")
    ensureDir(localeSocialDir)

    const msgs = readLocaleMessages(locale)
    const title = truncateText(
      cleanText(
        getMessageValue(msgs, "extensionName") ||
          getMessageValue(msgs, "title") ||
          getMessageValue(fallbackMessages, "extensionName") ||
          getMessageValue(fallbackMessages, "title") ||
          "LinkedIn Games Solver"
      ),
      48
    )

    const desc = truncateText(
      cleanText(
        getMessageValue(msgs, "extensionDescription") ||
          getMessageValue(msgs, "subtitle") ||
          getMessageValue(fallbackMessages, "extensionDescription") ||
          getMessageValue(fallbackMessages, "subtitle") ||
          "A helper for LinkedIn Games."
      ),
      100
    )

    const localeFontPath = resolveFontPathForLocale(locale)
    const outLarge = path.join(localeSocialDir, "social-1280x640.jpg")

    run(
      [
        imageMagickCmd,
        q(globalLarge),
        "-fill",
        q("rgba(0,0,0,0.45)"),
        "-draw",
        q("roundrectangle 64,448 1216,608 20,20"),
        "-fill",
        q("#ffffff"),
        ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
        "-pointsize",
        "44",
        "-gravity",
        "southwest",
        "-annotate",
        "+88+120",
        q(title),
        "-pointsize",
        "26",
        "-gravity",
        "southwest",
        "-annotate",
        "+88+68",
        q(desc),
        "-strip",
        "-quality",
        "92",
        q(outLarge)
      ].join(" ")
    )

    run(
      [
        imageMagickCmd,
        q(outLarge),
        "-resize",
        "640x320",
        "-strip",
        "-quality",
        "92",
        q(path.join(localeSocialDir, "social-640x320.jpg"))
      ].join(" ")
    )
  }
}

// --- Store Description Markdown Generator ---
function generateStoreDescriptions(): void {
  console.log("\nGenerating store descriptions...")
  const descriptions: Record<string, string> = {
    en: `# LinkedIn Games Solver

LinkedIn Games Solver is the ultimate companion for your daily LinkedIn puzzles. It instantly scans and solves your favorite daily puzzle boards directly on the page. Powered by advanced local and cloud AI models (like Google Gemini, OpenAI, and Anthropic), combined with an ultra-fast Remote Answers Registry, it cracks complex trivia challenges and word associations in a blink.

## Why Install It?
* Never Lose a Streak: Keep your daily momentum going and secure your streak even on the toughest days or when you're short on time.
* Master Trivia & Word Puzzles: Games like Crossclimb and Pinpoint require deep trivia knowledge and quick association. The built-in AI solves them with high accuracy.
* Hybrid Answers Registry: Solve Crossclimb and Pinpoint instantly with zero API cost using our remote answers database, no personal AI keys required.
* Full Bonus Games Support: Seamlessly solve both standard daily puzzles and localized bonus levels (Queens, Sudoku, etc.) with independent streak tracking and a dedicated dashboard "Bonus" badge.
* Completely Native Integration: The solver overlay appears directly on your active game tab. One click, and you see the solved board right on the screen.
* Educational Hint Mode: Learn how to solve puzzles naturally. Instead of auto-completing, get a single logical move suggested, and catch mistakes instantly with on-screen red highlights.
* Stealth Solve Speed (Stealth Mode): Emulate human click behaviors with randomized, natural delays (1–3 seconds) to shield your daily solving streak from bot-detection flags.
* Context-Aware Shortcuts: Enjoy right-click context menu options like "Mark as Not Played", "Solve", or "Get Hint" directly from game cards.
* Local Chrome Built-in AI: Connect Google Chrome's built-in Gemini Nano model for a zero-cost, fully local, and private puzzle-solving experience.
* Beautiful Analytics Dashboard: Track your solving history, average times, streaks, and personal bests with our premium, modern calendar dashboard.
* Private & Secure: Runs completely in your browser. Your API keys are encrypted locally using AES-256 and are never shared with any server. Opt-in or out of anonymous telemetry at any time.`,

    tr: `# LinkedIn Oyun Çözücü

LinkedIn Oyun Çözücü, günlük LinkedIn bulmacalarınız için mükemmel bir yardımcıdır. En sevdiğiniz oyun tahtalarını doğrudan sayfa üzerinde anında tarar ve çözer. Google Gemini, OpenAI ve Anthropic gibi gelişmiş yapay zeka modelleri ve ultra hızlı Uzak Cevap Kayıt Defteri entegrasyonu sayesinde karmaşık bilgi yarışmalarını ve kelime ilişkilendirmelerini göz açıp kapayıncaya kadar çözer.

## Neden Yüklemelisiniz?
* Serinizi Asla Kaybetmeyin: En zor günlerde veya zamanınız kısıtlı olduğunda bile günlük serinizi güvence altına alın.
* Bilgi Yarışması ve Kelime Bulmacalarında Ustalaşın: Crossclimb ve Pinpoint gibi oyunlar derin bilgi birikimi ve hızlı çağrışım gerektirir. Dahili yapay zeka bunları yüksek doğrulukla çözer.
* Hibrit Cevap Kayıt Defteri: Kişisel yapay zeka API anahtarlarına gerek kalmadan, uzak cevap veritabanımız sayesinde Crossclimb ve Pinpoint bulmacalarını sıfır API maliyetiyle anında çözün.
* Tam Bonus Oyun Desteği: Hem standart günlük bulmacaları hem de özel bonus seviyelerini (Queens, Sudoku vb.) bağımsız seri takibi ve takvim panelindeki özel "Bonus" rozetiyle sorunsuz bir şekilde çözün.
* Doğal Entegrasyon: Çözücü arayüzü doğrudan aktif oyun sekmenizde belirir. Tek bir tıklama ile çözülmüş panoyu ekranda görürsünüz.
* Eğitici İpucu Modu (Hint Mode): Panoyu otomatik olarak çözmek yerine, bir sonraki mantıklı hamleyi ipucu olarak alın ve yaptığınız hataları ekranda kırmızı vurgularla anında keşfederek oyunu kendi başınıza öğrenin.
* İnsansı Gizli Mod (Stealth Mode): Otomatik bot algılama korumalarını atlatmak için tıklamalar arasına insansı ve rastgele zamanlanmış gecikmeler (1-3 saniye) ekleyin.
* Bağlama Duyarlı Kısayollar: Oyun kartlarına sağ tıklayarak doğrudan "Oynanmadı Olarak İşaretle", "Çöz" veya "İpucu Al" gibi seçeneklere hızla erişin.
* Yerleşik Chrome Yapay Zekası: Tamamen ücretsiz, yerel ve gizli bir bulmaca çözme deneyimi için Google Chrome'un yerleşik Gemini Nano modelini bağlayın.
* Harika Analiz Paneli: Premium, modern takvim panelimizle çözme geçmişinizi, ortalama sürelerinizi, serilerinizi ve kişisel en iyilerinizi takip edin.
* Gizli ve Güvenli: Tamamen tarayıcınızda çalışır. API anahtarlarınız AES-256 ile yerel olarak şifrelenir ve asla harici sunucularla paylaşılmaz. İstediğiniz zaman anonim telemetriyi açıp kapatabilirsiniz.`,

    es: `# Solucionador de Juegos de LinkedIn

Solucionador de Juegos de LinkedIn es el compañero definitivo para tus acertijos diarios de LinkedIn. Escanea y resuelve instantáneamente tus tableros de juego favoritos directamente en la página. Potenciado por modelos avanzados de IA locales y en la nube (como Google Gemini, OpenAI y Anthropic), combinado con un Registro de Respuestas Remoto ultrarrápido, resuelve complejos desafíos de preguntas y asociaciones de palabras en un abrir y cerrar de ojos.

## ¿Por qué instalarlo?
* Nunca pierda su racha: Mantenga su impulso diario y asegure su racha de juego incluso en los días más difíciles o cuando tenga poco tiempo.
* Domine los juegos de palabras y preguntas: Juegos como Crossclimb y Pinpoint requieren conocimientos profundos y asociaciones rápidas. La IA integrada los resuelve con una precisión asombrosa.
* Registro de Respuestas Híbrido: Resuelva Crossclimb y Pinpoint al instante con costo de API cero utilizando nuestra base de datos remota de respuestas, sin necesidad de claves de IA personales.
* Soporte Completo para Juegos Bonus: Resuelva sin problemas tanto los rompecabezas diarios estándar como los niveles especiales de bonificación (Queens, Sudoku, etc.) con seguimiento de rachas independiente y una etiqueta "Bonus" dedicada en el panel.
* Integración totalmente nativa: El solucionador aparece directamente en la pestaña del juego activo. Con un solo clic, verá el tablero resuelto directamente en su pantalla.
* Modo de sugerencia educativo (Hint Mode): Aprenda a resolver acertijos de forma natural. En lugar de autocompletar el tablero, reciba sugerencias de movimientos lógicos individuales y detecte errores al instante con resaltados en rojo en la pantalla.
* Velocidad de resolución sigilosa (Stealth Mode): Emule el comportamiento de clics humanos con retrasos aleatorios y naturales (1–3 segundos) para proteger su racha diaria de resolución de los sistemas de detección de bots.
* Accesos Directos según el Contexto: Disfrute de opciones en el menú contextual con clic derecho como "Marcar como no jugado", "Resolver" o "Obtener pista" directamente desde las tarjetas de juego.
* IA integrada de Google Chrome: Conecte el modelo local Gemini Nano integrado en Google Chrome para una experiencia de resolución de rompecabezas privada, local y completamente gratuita.
* Panel de estadísticas prémium: Realice un seguimiento de su historial de resolución, tiempos promedio, rachas y récords personales con nuestro moderno calendario y panel analítico.
* Privado y seguro: Se ejecuta completamente en su navegador. Sus claves de API se cifran localmente mediante AES-256 y nunca se comparten. Active o desactive la telemetría anónima en cualquier momento.`,

    fr: `# Résolveur de Jeux LinkedIn

Résolveur de Jeux LinkedIn est le compagnon ultime pour vos énigmes quotidiennes sur LinkedIn. Il analyse et résout instantanément vos plateaux de jeux préférés directement sur la page. Grâce à des modèles d'IA locaux et cloud avancés (tels que Google Gemini, OpenAI et Anthropic), combinés à un registre de réponses à distance ultra-rapide, il résout les questionnaires complexes et les associations de mots en un clin d'œil.

## Pourquoi l'installer ?
* Ne perdez jamais votre série: Gardez votre élan quotidien et sécurisez votre série de victoires, même les jours les plus difficiles ou lorsque vous manquez de temps.
* Maîtrisez les jeux de lettres et de culture: Des jeux comme Crossclimb et Pinpoint exigent une grande culture générale et des associations d'idées rapides. L'IA intégrée les résout avec une haute précision.
* Registre de Réponses Hybride: Résolvez Crossclimb et Pinpoint instantanément et sans coût d'API grâce à notre base de données de réponses à distance, sans clé API personnelle requise.
* Support Complet des Jeux Bonus: Résolvez en toute fluidité les puzzles quotidiens standard ainsi que les niveaux de bonus (Queens, Sudoku, etc.) avec suivi indépendant des séries et un badge "Bonus" dédié dans le tableau de bord.
* Intégration 100 % native: L'interface du résolveur s'affiche directement sur l'onglet de votre jeu actif. En un clic, le tableau résolu apparaît à l'écran.
* Mode indice éducatif (Hint Mode): Apprenez à résoudre les énigmes naturellement. Au lieu de compléter automatiquement, obtenez une suggestion de coup logique et repérez instantanément les erreurs grâce aux surbrillances rouges à l'écran.
* Vitesse de résolution furtive (Stealth Mode): Émulez les comportements de clics humains avec des délais aléatoires et naturels (1 à 3 secondes) pour protéger votre série de résolutions quotidiennes contre la détection de bots.
* Raccourcis Contextuels Dynamiques: Accédez aux options via clic droit comme "Marquer comme non joué", "Résoudre" ou "Obtenir un indice" directement depuis les cartes de jeu.
* IA intégrée de Google Chrome: Connectez le modèle local Gemini Nano intégré à Google Chrome pour une expérience de résolution 100% locale, privée et gratuite.
* Tableau de bord analytique moderne: Suivez votre historique de résolution, vos temps moyens, vos séries et vos records personnels grâce à notre calendrier interactif haut de gamme.
* Privé et sécurisé: Fonctionne entièrement dans votre navigateur. Vos clés API sont chiffrées localement en AES-256 et ne sont jamais partagées. Activez ou désactivez la télémétrie anonyme à tout moment.`,

    pt_BR: `# Solucionador de Jogos do LinkedIn

Solucionador de Jogos do LinkedIn é o companheiro definitivo para os seus desafios diários no LinkedIn. Ele analisa e resolve instantaneamente seus jogos favoritos diretamente na página. Alimentado por modelos avançados de IA locais e na nuvem (como Google Gemini, OpenAI e Anthropic), combinados com um Registro de Respostas Remoto ultra-rápido, resolve testes complexos e associações de palavras em um piscar de olhos.

## Por que instalar?
* Nunca perca sua sequência: Mantenha seu ritmo diário e garanta sua sequência de vitórias mesmo nos dias mais difíceis ou quando estiver sem tempo.
* Domine jogos de conhecimentos gerais e palavras: Jogos como Crossclimb e Pinpoint exigem conhecimentos profundos e associações rápidas. A IA integrada resolve-os com alta precisão.
* Registro de Respostas Híbrido: Resolva Crossclimb e Pinpoint instantaneamente com custo zero de API usando nosso banco de dados remoto de respostas, sem necessidade de chaves de IA pessoais.
* Suporte Total a Jogos de Bônus: Resolva facilmente os quebra-cabeças diários padrão e as fases de bônus especiais (Queens, Sudoku, etc.) com rastreamento de sequência independente e um selo "Bônus" exclusivo no painel.
* Integração totalmente nativa: A sobreposição do solucionador aparece diretamente na aba ativa do jogo. Com um clique, você vê o tabuleiro resolvido na tela.
* Modo de dica educativo (Hint Mode): Aprenda a resolver os quebra-cabeças naturalmente. Em vez de preencher tudo automaticamente, receba sugestões de movimentos lógicos únicos e identifique erros instantaneamente com destaques vermelhos na tela.
* Velocidade de resolução furtiva (Stealth Mode): Emule o comportamento de cliques humanos com atrasos aleatórios e naturais (1 a 3 segundos) para proteger sua sequência de resolução diária de detecções de bots.
* Atalhos Contextuais Úteis: Aproveite as opções do menu de clique com botão direito, como "Marcar como não jogado", "Resolver" ou "Obter dica" diretamente nos cartões de jogo.
* IA Integrada do Google Chrome: Conecte o modelo Gemini Nano local integrado do Google Chrome para uma experiência de resolução de desafios totalmente local, gratuita e privada.
* Painel analítico moderno: Acompanhe seu histórico de resoluções, tempos médios, sequências e recordes pessoais com nosso painel moderno e interativo.
* Privado e seguro: Funciona totalmente no seu navegador. Suas chaves de API são criptografadas localmente usando AES-256 e nunca são compartilhadas. Ative ou desative a telemetria anônima quando quiser.`,

    pt_PT: `# Solucionador de Jogos do LinkedIn

Solucionador de Jogos do LinkedIn é o companheiro definitivo para os seus desafios diários no LinkedIn. Ele analisa e resolve instantaneamente seus jogos favoritos diretamente na página. Alimentado por modelos avançados de IA locais e na nuvem (como Google Gemini, OpenAI e Anthropic), combinados com um Registro de Respostas Remoto ultra-rápido, resolve testes complexos e associações de palavras em um piscar de olhos.

## Por que instalar?
* Nunca perca sua sequência: Mantenha seu ritmo diário e garanta sua sequência de vitórias mesmo nos dias mais difíceis ou quando estiver sem tempo.
* Domine jogos de conhecimentos gerais e palavras: Jogos como Crossclimb e Pinpoint exigem conhecimentos profundos e associações rápidas. A IA integrada resolve-os com alta precisão.
* Registro de Respostas Híbrido: Resolva Crossclimb e Pinpoint instantaneamente com custo zero de API usando o nosso banco de dados remoto de respostas, sem necessidade de chaves de IA pessoais.
* Suporte Total a Jogos de Bónus: Resolva facilmente os quebra-cabeças diários padrão e as fases de bónus especiais (Queens, Sudoku, etc.) com rastreio de sequência independente e um selo "Bónus" exclusivo no painel.
* Integração totalmente nativa: A sobreposição do solucionador aparece diretamente na aba ativa do jogo. Com um clique, você vê o tabuleiro resolvido na tela.
* Modo de dica educativo (Hint Mode): Aprenda a resolver os quebra-cabeças naturalmente. Em vez de preencher tudo automaticamente, receba sugestões de movimentos lógicos únicos e identifique erros instantaneamente com destaques vermelhos no ecrã.
* Velocidade de resolução furtiva (Stealth Mode): Emule o comportamento de cliques humanos com atrasos aleatórios e naturais (1 a 3 segundos) para proteger a sua sequência de resolução diária de deteções de bots.
* Atalhos Contextuais Úteis: Aproveite as opções do menu de clique com botão direito, como "Marcar como não jogado", "Resolver" ou "Obter dica" diretamente nos cartões de jogo.
* IA Integrada do Google Chrome: Conecte o modelo Gemini Nano local integrado do Google Chrome para uma experiência de resolução de desafios totalmente local, gratuita e privada.
* Painel analítico moderno: Acompanhe o seu histórico de resoluções, tempos médios, sequências e recordes pessoais com o nosso painel moderno e interativo.
* Privado e seguro: Funciona totalmente no seu navegador. As suas chaves de API são encriptadas localmente usando AES-256 e nunca são partilhadas. Ative ou desative a telemetria anónima quando quiser.`,

    de: `# LinkedIn-Spielelöser

LinkedIn-Spielelöser ist der ultimative Begleiter für Ihre täglichen LinkedIn-Rätsel. Er scannt und löst Ihre Lieblingsspielbretter sofort direkt auf der Seite. Unterstützt durch fortschrittliche lokale und Cloud-KI-Modelle (wie Google Gemini, OpenAI und Anthropic) in Kombination mit einer ultraschnellen Remote-Antwortdatenbank knackt er komplexe Trivia-Leiter und Wortassoziationen im Handumdrehen.

## Warum installieren?
* Verlieren Sie nie Ihre Serie: Halten Sie Ihre tägliche Serie aufrecht, selbst an den stressigsten Tagen oder wenn die Rätsel besonders knifflig sind.
* Meistern Sie Quiz- und Worträtsel: Spiele wie Crossclimb und Pinpoint erfordern tiefes Allgemeinwissen und schnelle Assoziationen. Die integrierte KI löst diese mit herausragender Präzision.
* Hybride Antwortdatenbank: Lösen Sie Crossclimb und Pinpoint sofort und ohne API-Kosten über unsere Remote-Datenbank – ganz ohne persönliche KI-Schlüssel.
* Volle Unterstützung für Bonusspiele: Lösen Sie sowohl Standardrätsel als auch spezielle Bonus-Herausforderungen (Queens, Sudoku usw.) nahtlos mit separater Serienverfolgung und einem dedizierten "Bonus"-Abzeichen auf dem Dashboard.
* Nahtlose native Integration: Das Lösungs-Overlay erscheint direkt auf Ihrem aktiven Spiele-Tab. Ein Klick genügt, und das gelöste Spielfeld wird auf dem Bildschirm angezeigt.
* Pädagogischer Hinweis-Modus (Hint Mode): Lernen Sie, Rätsel auf natürliche Weise zu lösen. Erhalten Sie Vorschläge für einzelne logische Züge, statt das Spielfeld automatisch komplett auszufüllen, und erkennen Sie Fehler sofort durch rote Markierungen auf dem Bildschirm.
* Getarnte Lösungsgeschwindigkeit (Stealth Mode): Ahmen Sie menschliches Klickverhalten mit zufälligen, natürlichen Verzögerungen (1–3 Sekunden) nach, um Ihre tägliche Löseserie vor Bot-Erkennungs-Systemen zu schützen.
* Kontextbezogene Tastenkombinationen: Nutzen Sie praktische Rechtsklick-Aktionen wie "Als nicht gespielt markieren", "Lösen" oder "Hinweis holen" direkt auf den Spielkarten.
* Lokale integrierte Chrome-KI: Verbinden Sie das integrierte Gemini Nano-Modell von Google Chrome für eine kostenlose, vollständig lokale und private Lösungserfahrung.
* Modernes Statistik-Dashboard: Verfolgen Sie Ihren Löseverlauf, Ihre Durchschnittszeiten, Ihre aktuellen Serien und Ihre persönlichen Bestleistungen auf einem modernen Aktivitätskalender.
* Privat und Sicher: Läuft vollständig lokal in Ihrem Browser. Ihre API-Schlüssel werden lokal mit AES-256 verschlüsselt und niemals übertragen. Die anonyme Telemetrie kann jederzeit ein- oder ausgeschaltet werden.`,

    zh_CN: `# LinkedIn 游戏求解器

LinkedIn 游戏求解器是您解决每日 LinkedIn 谜题的终极助手。它能直接在页面上瞬间扫描并自动解开您喜爱的游戏面板。依托先进的本地和云端人工智能模型（如 Google Gemini、OpenAI 和 Anthropic），并配合极速的远程答案数据库，它可以在转瞬之间破解复杂的问答和词意联想。

## 为什么选择安装？
* 保持您的每日连胜: 确保您的每日连胜记录，即使在最繁忙或谜题最难的日子里也绝不中断。
* 轻松应对常识与单词挑战: 像 Crossclimb 和 Pinpoint 这类游戏需要深厚的常识储备和敏捷的联想能力。内置的人工智能能够以极高的准确度完美解答。
* 混合型答案数据库: 无需配置个人 AI API 密钥，即可使用我们的远程答案库瞬间且免 API 成本地解开 Crossclimb 和 Pinpoint 游戏。
* 完美支持 Bonus 附加赛: 无缝求解标准每日谜题与特殊的本地化 Bonus 关卡（Queens、Sudoku 等），并提供独立的连胜统计与专属的“Bonus”日历数据徽章。
* 原生无缝集成: 求解器悬浮窗直接显示在您的游戏标签页上。只需轻轻一点，解出的答案就会呈现在屏幕中。
* 寓教于乐的提示模式 (Hint Mode): 帮助您自然地掌握解题技巧。它不会一键自动填满所有空格，而是为您指出下一步最合理的逻辑走法，并通过屏幕上的红色高亮瞬间纠错。
* 隐形防检测求解速度 (Stealth Mode): 模拟真实的真人点击操作行为，并在点击间加入随机、自然的延迟（1-3秒），有效保护您的每日连胜战绩免遭机器人检测。
* 上下文快捷操作: 在游戏卡片上右键点击，即可直接“标记为未玩”、“一键求解”或“获取提示”。
* 谷歌 Chrome 内置 AI: 可无缝连接 Chrome 浏览器内置的 Gemini Nano 本地模型，体验完全免费、100%本地与隐私安全的求解功能。
* 精美的数据看板: 通过现代化的日历数据面板，追踪您的求解历史、平均时间、连胜纪录以及个人最佳成绩。
* 隐私与安全保护: 完全在您的本地浏览器中运行。您的 API 密钥在本地使用 AES-256 加密存储，绝对不会上传。您可以随时选择开启或关闭遥测。`,

    zh_TW: `# LinkedIn 遊戲求解器

LinkedIn 遊戲求解器是您解決每日 LinkedIn 謎題的終極助手。它能直接在頁面上瞬間掃描並自動解開您喜愛的遊戲面板。依托先進的本地和雲端人工智慧模型（如 Google Gemini、OpenAI 和 Anthropic），配合極速的遠端答案資料庫，它可以在極短時間內破解複雜的問答與詞意聯想。

## 為什麼選擇安裝？
* 保持您的每日連勝: 確保您的每日連勝記錄，即使在最繁忙或謎題最難的日子里也絕不中斷。
* 輕鬆應對常識與單字挑戰: 像 Crossclimb 和 Pinpoint 這類遊戲需要深厚的常識儲備和敏捷的聯想能力。內置的人工智慧能夠以極高的準確度完美解答。
* 混合型答案資料庫: 無需配置個人 AI API 金鑰，即可使用遠端答案庫瞬間且免 API 成本地解開 Crossclimb 和 Pinpoint 遊戲。
* 完美支援 Bonus 附加賽: 無縫求解標準每日謎題與特殊的在地化 Bonus 關卡（Queens、Sudoku 等），並提供獨立的連勝統計與專屬的「Bonus」日曆數據徽章。
* 原生無縫整合: 求解器懸浮窗直接顯示在您的遊戲標籤頁上。只需輕輕一點，解出的答案就會呈現螢幕中。
* 寓教於樂的提示模式 (Hint Mode): 幫助您自然地掌握解題技巧。它不會一鍵自動填滿所有空格，而是為您指出下一步最合理的邏輯走法，並透過螢幕上的紅色高亮瞬間糾正您的錯誤。
* 隱形防檢測求解速度 (Stealth Mode): 模擬真實的真人點擊操作行為，並在點擊間加入隨機、自然的延遲（1-3秒），有效保護您的每日連勝戰績免遭機器人檢測。
* 精美的數據看板: 透過現代化的日曆數據面板，追蹤您的求解歷史、平均時間、連勝紀錄以及個人最佳成績。
* 隱私與安全保護: 完全在您的本地瀏覽器中運行。您的 API 金鑰安全保存在本地儲存中，絕對不會被上傳或分享給任何第三方。`
  }

  // Save global/English description for backward compatibility
  const enMessages = readLocaleMessages("en")
  const enDisclaimer = getMessageValue(enMessages, "disclaimerText")
  const enContent =
    descriptions.en + (enDisclaimer ? `\n\n---\n\n*${enDisclaimer}*` : "")
  ensureDir(path.join(outDir, "global"))
  writeFileSync(path.join(outDir, "global", "description.md"), enContent)

  // Save localized descriptions (including English)
  for (const [locale, content] of Object.entries(descriptions)) {
    const localeMessages = readLocaleMessages(locale)
    const localeDisclaimer = getMessageValue(localeMessages, "disclaimerText")
    const localizedContent =
      content + (localeDisclaimer ? `\n\n---\n\n*${localeDisclaimer}*` : "")

    const localePath = path.join(localizedDir, locale)
    ensureDir(localePath)
    writeFileSync(path.join(localePath, "description.md"), localizedContent)
  }
  console.log(
    "Store descriptions generated successfully in both global and localized folders!"
  )
}

// --- Main Program Execution ---
async function main(): Promise<void> {
  const hasRsvg = hasTool("rsvg-convert")
  const hasMagick = hasTool(imageMagickCmd)

  console.log("Completely clearing store-assets folder for a clean slate...")
  if (existsSync(outDir)) {
    // If image tools are missing, do not clear the whole folder completely
    // since screenshots/icons might already exist. Just clear descriptions or create if empty.
    if (hasRsvg && hasMagick) {
      rmSync(outDir, { recursive: true, force: true })
    }
  }

  // Build target directories fresh
  ensureDir(outDir)
  ensureDir(path.join(outDir, "global"))
  ensureDir(globalScreenshotsDir)
  ensureDir(localizedDir)

  if (!hasRsvg || !hasMagick) {
    console.log(
      "\n⚠️ WARNING: 'rsvg-convert' or 'ImageMagick' is missing in PATH. Skipping visual assets generation."
    )
    console.log("Generating Markdown store descriptions directly...\n")
    generateStoreDescriptions()
    console.log("\nSuccessfully generated Markdown store descriptions!")
    return
  }

  // Step 1: Pre-render vector assets and compose store icons
  console.log("Preparing icons and rendering basic assets...")
  prepIconRenders()
  generateStoreIcon()

  // Step 2: Ensure built extension exists
  console.log("Ensuring built extension target exists...")
  if (!existsSync(buildDir)) {
    console.log("Building extension...")
    run("pnpm build")
  }

  // Step 3: Capture beautifully mock-fed browser screenshots (Global/English)
  // This must run before promo composites so screenshots exist for mockups
  await captureScreenshots("en")

  // Step 4: Compose premium promo banners and social previews with embedded screenshots
  console.log("Generating premium promo tiles and social previews...")
  generatePromoSmall("global")
  generatePromoMarquee("global")
  generatePromoSmall("en")
  generatePromoMarquee("en")
  generateSocialPreviews()

  // Step 5: Capture screenshots and generate localized promotional tiles for all other localized directories
  const locales = ["tr", "es", "fr", "pt_BR", "pt_PT", "de", "zh_CN", "zh_TW"]
  for (const locale of locales) {
    await captureScreenshots(locale)
    generatePromoSmall(locale)
    generatePromoMarquee(locale)
  }

  // Step 5: Render localized social media OG cards using ImageMagick
  console.log("\nGenerating localized social headers...")
  generateLocalizedSocialPreviews()

  // Step 6: Generate clean Markdown store descriptions for all locales
  generateStoreDescriptions()

  // Cleanup temp files
  rmSync(tmpDir, { recursive: true, force: true })

  console.log("\n=======================================================")
  console.log("Successfully generated all Chrome Web Store assets!")
  console.log("=======================================================")
  console.log("- Store icon: store-assets/store-icon-128.png")
  console.log("- Global promo tiles: store-assets/global/*.jpg")
  console.log(
    "- Global screenshots: store-assets/global/screenshots/*.{jpg,png}"
  )
  console.log(
    "- Localized screenshots: store-assets/localized/<locale>/screenshots/*.{jpg,png}"
  )
  console.log("- Social media card pre-renders: store-assets/social/*.jpg")
  console.log(
    "- Localized social media: store-assets/localized/<locale>/social/*.jpg"
  )
  console.log(
    "- Store listings text (Markdown): store-assets/global/description.md & store-assets/localized/<locale>/description.md"
  )
  console.log("All screenshots are beautifully rendered inside a browser!")
  console.log("=======================================================")
}

main().catch(console.error)
