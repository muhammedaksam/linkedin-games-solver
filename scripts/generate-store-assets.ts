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
const globalScreenshotsDir = path.join(outDir, "global", "screenshots")
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
  return `'${String(value).replace(/'/g, `'"'"'`)}` + "'"
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

// Generate 440x280 small promo tile
function generatePromoSmall(): void {
  const output = path.join(outDir, "global", "small-promo-440x280.jpg")
  const screenshotPath = path.join(globalScreenshotsDir, "screenshot-1.jpg")

  if (!existsSync(screenshotPath)) {
    console.log(
      "Screenshot-1 not found, generating base Small Promo without screenshot..."
    )
    run(
      [
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
        "-strip",
        "-quality",
        "93",
        q(output)
      ].join(" ")
    )
    return
  }

  console.log(
    "Generating premium Small Promo Tile with embedded browser screenshot..."
  )
  run(
    [
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
      "-pointsize",
      "22",
      "-fill",
      "white",
      "-gravity",
      "northwest",
      "-annotate",
      "+36+154",
      q("Games Solver"),
      "-pointsize",
      "11",
      "-fill",
      q("#94a3b8"),
      "-annotate",
      "+36+186",
      q("Auto-solve daily puzzles"),
      "-annotate",
      "+36+202",
      q("with live stats dashboard"),
      "-strip",
      "-quality",
      "93",
      q(output)
    ].join(" ")
  )
}

// Generate 1400x560 marquee promo tile
function generatePromoMarquee(): void {
  const output = path.join(outDir, "global", "marquee-promo-1400x560.jpg")
  const popupPath = path.join(globalScreenshotsDir, "screenshot-1.jpg")
  const dashboardPath = path.join(globalScreenshotsDir, "screenshot-3.jpg")

  if (!existsSync(popupPath) || !existsSync(dashboardPath)) {
    console.log(
      "Screenshots not found, generating base Marquee Promo without screenshots..."
    )
    run(
      [
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
        "-strip",
        "-quality",
        "93",
        q(output)
      ].join(" ")
    )
    return
  }

  console.log(
    "Generating premium Marquee Promo Tile with layered screenshot mockups..."
  )
  run(
    [
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
      "-pointsize",
      "52",
      "-fill",
      "white",
      "-gravity",
      "northwest",
      "-annotate",
      "+90+245",
      q("LinkedIn Games Solver"),
      "-pointsize",
      "18",
      "-fill",
      q("#94a3b8"),
      "-annotate",
      "+90+320",
      q("Auto-solve daily puzzles & track your streak with rich analytics"),
      "-pointsize",
      "13",
      "-fill",
      q("#38bdf8"),
      "-annotate",
      "+90+360",
      q(
        "Supports: Sudoku • Queens • Pinpoint • Crossclimb • Tango • Zip • Patches"
      ),
      "-strip",
      "-quality",
      "93",
      q(output)
    ].join(" ")
  )
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
    args: [
      `--disable-extensions-except=${buildDir}`,
      `--load-extension=${buildDir}`,
      "--no-sandbox",
      "--disable-setuid-sandbox"
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

    const saveDir =
      locale === "en"
        ? globalScreenshotsDir
        : path.join(localizedDir, locale, "screenshots")
    ensureDir(saveDir)

    const page = await browser.newPage()

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
            resolve
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
        <p style="font-size: 15px; color: rgba(255,255,255,0.75); margin: 8px 0 0 0; font-weight: 500;">${subtitleMap[loc] || subtitleMap["en"]}</p>
      `
      document.body.appendChild(titleWrapper)

      const windowFrame = document.createElement("div")
      Object.assign(windowFrame.style, {
        width: "470px",
        height: "520px",
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
    await page.screenshot({
      path: path.join(saveDir, "screenshot-1.jpg"),
      type: "jpeg",
      quality: 92
    })

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
            resolve
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
        <h1 style="font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">${subtitleMap[loc] || subtitleMap["en"]}</h1>
      `
      document.body.appendChild(titleWrapper)

      const windowFrame = document.createElement("div")
      Object.assign(windowFrame.style, {
        width: "470px",
        height: "520px",
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
    await page.screenshot({
      path: path.join(saveDir, "screenshot-2.jpg"),
      type: "jpeg",
      quality: 92
    })

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
            resolve
          )
        })
      },
      perfectHistory,
      locale
    )

    await page.reload({ waitUntil: "networkidle2" })
    await page.setViewport({ width: 1280, height: 800 })

    await new Promise((r) => setTimeout(r, 1200))
    await page.screenshot({
      path: path.join(saveDir, "screenshot-3.jpg"),
      type: "jpeg",
      quality: 92
    })

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
            resolve
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
    await page.screenshot({
      path: path.join(saveDir, "screenshot-4.jpg"),
      type: "jpeg",
      quality: 92
    })
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

LinkedIn Games Solver is the ultimate companion for your daily LinkedIn puzzles. It instantly scans and solves your favorite daily puzzle boards directly on the page. Powered by advanced local and cloud AI models (like Google Gemini, OpenAI, and Anthropic), it cracks complex trivia challenges and word associations in a blink.

## Why Install It?
* Never Lose a Streak: Keep your daily momentum going and secure your streak even on the toughest days or when you're short on time.
* Master Trivia & Word Puzzles: Games like Crossclimb and Pinpoint require deep trivia knowledge and quick association. The built-in AI solves them with high accuracy.
* Completely Native Integration: The solver overlay appears directly on your active game tab. One click, and you see the solved board right on the screen.
* Educational Hint Mode: Learn how to solve puzzles naturally. Instead of auto-completing, get a single logical move suggested, and catch mistakes instantly with on-screen red highlights.
* Stealth Solve Speed (Stealth Mode): Emulate human click behaviors with randomized, natural delays (1–3 seconds) to shield your daily solving streak from bot-detection flags.
* Beautiful Analytics Dashboard: Track your solving history, average times, streaks, and personal bests with our premium, modern calendar dashboard.
* Private & Secure: Runs completely in your browser. Your API keys are saved securely in your local storage and are never shared with any server.`,

    tr: `# LinkedIn Oyun Çözücü

LinkedIn Oyun Çözücü, günlük LinkedIn bulmacalarınız için mükemmel bir yardımcıdır. En sevdiğiniz oyun tahtalarını doğrudan sayfa üzerinde anında tarar ve çözer. Google Gemini, OpenAI ve Anthropic gibi gelişmiş yapay zeka modellerini kullanarak karmaşık bilgi yarışmalarını ve kelime ilişkilendirmelerini göz açıp kapayıncaya kadar çözer.

## Neden Yüklemelisiniz?
* Serinizi Asla Kaybetmeyin: En zor günlerde veya zamanınız kısıtlı olduğunda bile günlük serinizi güvence altına alın.
* Bilgi Yarışması ve Kelime Bulmacalarında Ustalaşın: Crossclimb ve Pinpoint gibi oyunlar derin bilgi birikimi ve hızlı çağrışım gerektirir. Dahili yapay zeka bunları yüksek doğrulukla çözer.
* Doğal Entegrasyon: Çözücü arayüzü doğrudan aktif oyun sekmenizde belirir. Tek bir tıklama ile çözülmüş panoyu ekranda görürsünüz.
* Eğitici İpucu Modu (Hint Mode): Panoyu otomatik olarak çözmek yerine, bir sonraki mantıklı hamleyi ipucu olarak alın ve yaptığınız hataları ekranda kırmızı vurgularla anında keşfederek oyunu kendi başınıza öğrenin.
* İnsansı Gizli Mod (Stealth Mode): Otomatik bot algılama korumalarını atlatmak için tıklamalar arasına insansı ve rastgele zamanlanmış gecikmeler (1-3 saniye) ekleyin.
* Harika Analiz Paneli: Premium, modern takvim panelimizle çözme geçmişinizi, ortalama sürelerinizi, serilerinizi ve kişisel en iyilerinizi takip edin.
* Gizli ve Güvenli: Tamamen tarayıcınızda çalışır. API anahtarlarınız yerel depolama alanınızda güvenli bir şekilde saklanır ve asla harici sunucularla paylaşılmaz.`,

    es: `# Solucionador de Juegos de LinkedIn

Solucionador de Juegos de LinkedIn es el compañero definitivo para tus acertijos diarios de LinkedIn. Escanea y resuelve instantáneamente tus tableros de juego favoritos directamente en la página. Potenciado por modelos avanzados de IA locales y en la nube (como Google Gemini, OpenAI y Anthropic), resuelve complejos desafíos de preguntas y asociaciones de palabras en un abrir y cerrar de ojos.

## ¿Por qué instalarlo?
* Nunca pierda su racha: Mantenga su impulso diario y asegure su racha de juego incluso en los días más difíciles o cuando tenga poco tiempo.
* Domine los juegos de palabras y preguntas: Juegos como Crossclimb y Pinpoint requieren conocimientos profundos y asociaciones rápidas. La IA integrada los resuelve con una precisión asombrosa.
* Integración totalmente nativa: El solucionador aparece directamente en la pestaña del juego activo. Con un solo clic, verá el tablero resuelto directamente en su pantalla.
* Modo de sugerencia educativo (Hint Mode): Aprenda a resolver acertijos de manera natural. En lugar de autocompletar el tablero, reciba sugerencias de movimientos lógicos individuales y detecte errores al instante con resaltados en rojo en la pantalla.
* Velocidad de resolución sigilosa (Stealth Mode): Emule el comportamiento de clics humanos con retrasos aleatorios y naturales (1–3 segundos) para proteger su racha diaria de resolución de los sistemas de detección de bots.
* Panel de estadísticas prémium: Realice un seguimiento de su historial de resolución, tiempos promedio, rachas y récords personales con nuestro moderno calendario y panel analítico.
* Privado y seguro: Se ejecuta completamente en su navegador. Sus claves de API se guardan de forma segura en su almacenamiento local y nunca se comparten.`,

    fr: `# Résolveur de Jeux LinkedIn

Résolveur de Jeux LinkedIn est le compagnon ultime pour vos énigmes quotidiennes sur LinkedIn. Il analyse et résout instantanément vos plateaux de jeux préférés directement sur la page. Grâce à des modèles d'IA locaux et cloud avancés (tels que Google Gemini, OpenAI et Anthropic), il résout les questionnaires complexes et les associations de mots en un clin d'œil.

## Pourquoi l'installer ?
* Ne perdez jamais votre série: Gardez votre élan quotidien et sécurisez votre série de victoires, même les jours les plus difficiles ou lorsque vous manquez de temps.
* Maîtrisez les jeux de lettres et de culture: Des jeux comme Crossclimb et Pinpoint exigent une grande culture générale et des associations d'idées rapides. L'IA intégrée les résout avec une haute précision.
* Intégration 100 % native: L'interface du résolveur s'affiche directement sur l'onglet de votre jeu actif. En un clic, le tableau résolu apparaît à l'écran.
* Mode indice éducatif (Hint Mode): Apprenez à résoudre les énigmes naturellement. Au lieu de compléter automatiquement, obtenez une suggestion de coup logique et repérez instantanément les erreurs grâce aux surbrillances rouges à l'écran.
* Vitesse de résolution furtive (Stealth Mode): Émulez les comportements de clics humains avec des délais aléatoires et naturels (1 à 3 secondes) pour protéger votre série de résolutions quotidiennes contre la détection de bots.
* Tableau de bord analytique moderne: Suivez votre historique de résolution, vos temps moyens, vos séries et vos records personnels grâce à notre calendrier interactif haut de gamme.
* Privé et sécurisé: Fonctionne entièrement dans votre navigateur. Vos clés API sont stockées localement et en toute sécurité, sans jamais être partagées.`,

    pt_BR: `# Solucionador de Jogos do LinkedIn

Solucionador de Jogos do LinkedIn é o companheiro definitivo para os seus desafios diários no LinkedIn. Ele analisa e resolve instantaneamente seus jogos favoritos diretamente na página. Alimentado por modelos avançados de IA locais e na nuvem (como Google Gemini, OpenAI e Anthropic), resolve testes complexos e associações de palavras em um piscar de olhos.

## Por que instalar?
* Nunca perca sua sequência: Mantenha seu ritmo diário e garanta sua sequência de vitórias mesmo nos dias mais difíceis ou quando estiver sem tempo.
* Domine jogos de conhecimentos gerais e palavras: Jogos como Crossclimb e Pinpoint exigem conhecimentos profundos e associações rápidas. A IA integrada resolve-os com alta precisão.
* Integração totalmente nativa: A sobreposição do solucionador aparece diretamente na aba ativa do jogo. Com um clique, você vê o tabuleiro resolvido na tela.
* Modo de dica educativo (Hint Mode): Aprenda a resolver os quebra-cabeças naturalmente. Em vez de preencher tudo automaticamente, receba sugestões de movimentos lógicos únicos e identifique erros instantaneamente com destaques vermelhos na tela.
* Velocidade de resolução furtiva (Stealth Mode): Emule o comportamento de cliques humanos com atrasos aleatórios e naturais (1 a 3 segundos) para proteger sua sequência de resolução diária de detecções de bots.
* Painel analítico moderno: Acompanhe seu histórico de resoluções, tempos médios, sequências e recordes pessoais com nosso painel moderno e interativo.
* Privado e seguro: Funciona totalmente no seu navegador. Suas chaves de API são salvas com segurança no armazenamento local e nunca são compartilhadas.`,

    pt_PT: `# Solucionador de Jogos do LinkedIn

Solucionador de Jogos do LinkedIn é o companheiro definitivo para os seus desafios diários no LinkedIn. Ele analisa e resolve instantaneamente seus jogos favoritos diretamente na página. Alimentado por modelos avançados de IA locais e na nuvem (como Google Gemini, OpenAI e Anthropic), resolve testes complexos e associações de palavras em um piscar de olhos.

## Por que instalar?
* Nunca perca sua sequência: Mantenha seu ritmo diário e garanta sua sequência de vitórias mesmo nos dias mais difíceis ou quando estiver sem tempo.
* Domine jogos de conhecimentos gerais e palavras: Jogos como Crossclimb e Pinpoint exigem conhecimentos profundos e associações rápidas. A IA integrada resolve-os com alta precisão.
* Integração totalmente nativa: A sobreposição do solucionador aparece diretamente na aba ativa do jogo. Com um clique, você vê o tabuleiro resolvido na tela.
* Modo de dica educativo (Hint Mode): Aprenda a resolver os quebra-cabeças naturalmente. Em vez de preencher tudo automaticamente, receba sugestões de movimentos lógicos únicos e identifique erros instantaneamente com destaques vermelhos na tela.
* Velocidade de resolução furtiva (Stealth Mode): Emule o comportamento de cliques humanos com atrasos aleatórios e naturais (1 a 3 segundos) para proteger sua sequência de resolução diária de detecções de bots.
* Painel analítico moderno: Acompanhe seu histórico de resoluções, tempos médios, sequências e recordes pessoais com nosso painel moderno e interativo.
* Privado e seguro: Funciona totalmente no seu navegador. Suas chaves de API são salvas com segurança no armazenamento local e nunca são compartilhadas.`,

    de: `# LinkedIn-Spielelöser

LinkedIn-Spielelöser ist der ultimative Begleiter für Ihre täglichen LinkedIn-Rätsel. Er scannt und löst Ihre Lieblingsspielbretter sofort direkt auf der Seite. Unterstützt durch fortschrittliche lokale und Cloud-KI-Modelle (wie Google Gemini, OpenAI und Anthropic) knackt er komplexe Trivia-Leiter und Wortassoziationen im Handumdrehen.

## Warum installieren?
* Verlieren Sie nie Ihre Serie: Halten Sie Ihre tägliche Serie aufrecht, selbst an den stressigsten Tagen oder wenn die Rätsel besonders knifflig sind.
* Meistern Sie Quiz- und Worträtsel: Spiele wie Crossclimb und Pinpoint erfordern tiefes Allgemeinwissen und schnelle Assoziationen. Die integrierte KI löst diese mit herausragender Präzision.
* Nahtlose native Integration: Das Lösungs-Overlay erscheint direkt auf Ihrem aktiven Spiele-Tab. Ein Klick genügt, und das gelöste Spielfeld wird auf dem Bildschirm angezeigt.
* Pädagogischer Hinweis-Modus (Hint Mode): Lernen Sie, Rätsel auf natürliche Weise zu lösen. Erhalten Sie Vorschläge für einzelne logische Züge, statt das Spielfeld automatisch komplett auszufüllen, und erkennen Sie Fehler sofort durch rote Markierungen auf dem Bildschirm.
* Getarnte Lösungsgeschwindigkeit (Stealth Mode): Ahmen Sie menschliches Klickverhalten mit zufälligen, natürlichen Verzögerungen (1–3 Sekunden) nach, um Ihre tägliche Löseserie vor Bot-Erkennungs-Systemen zu schützen.
* Modernes Statistik-Dashboard: Verfolgen Sie Ihren Löseverlauf, Ihre Durchschnittszeiten, Ihre aktuellen Serien und Ihre persönlichen Bestleistungen auf einem modernen Aktivitätskalender.
* Privat und Sicher: Läuft vollständig lokal in Ihrem Browser. Ihre API-Schlüssel werden sicher in Ihrem lokalen Speicher gesichert und niemals an externe Server übertragen.`,

    zh_CN: `# LinkedIn 游戏求解器

LinkedIn 游戏求解器是您解决每日 LinkedIn 谜题的终极助手。它能直接在页面上瞬间扫描并自动解开您喜爱的游戏面板。依托先进的本地和云端人工智能模型（如 Google Gemini、OpenAI 和 Anthropic），它可以在转瞬之间破解复杂的问答和词意联想。

## 为什么选择安装？
* 保持您的每日连胜: 确保您的每日连胜记录，即使在最繁忙或谜题最难的日子里也绝不中断。
* 轻松应对常识与单词挑战: 像 Crossclimb 和 Pinpoint 这类游戏需要深厚的常识储备和敏捷的联想能力。内置的人工智能能够以极高的准确度完美解答。
* 原生无缝集成: 求解器悬浮窗直接显示在您的游戏标签页上。只需轻轻一点，解出的答案就会呈现在屏幕中。
* 寓教于乐的提示模式 (Hint Mode): 帮助您自然地掌握解题技巧。它不会一键自动填满所有空格，而是为您指出下一步最合理的逻辑走法，并通过屏幕上的红色高亮瞬间纠错。
* 隐形防检测求解速度 (Stealth Mode): 模拟真实的真人点击操作行为，并在点击间加入随机、自然的延迟（1-3秒），有效保护您的每日连胜战绩免遭机器人检测。
* 精美的数据看板: 通过现代化的日历数据面板，追踪您的求解历史、平均时间、连胜纪录以及个人最佳成绩。
* 隐私与安全保护: 完全在您的本地浏览器中运行。您的 API 密钥安全保存在本地存储中，绝对不会被上传或分享给任何第三方。`,

    zh_TW: `# LinkedIn 遊戲求解器

LinkedIn 遊戲求解器是您解決每日 LinkedIn 謎題的終極助手。它能直接在頁面上瞬間掃描並自動解開您喜愛的遊戲面板。依托先進的本地和雲端人工智慧模型（如 Google Gemini、OpenAI 和 Anthropic），它可以在轉瞬之間破解複雜的問答和詞意聯想。

## 為什麼選擇安裝？
* 保持您的每日連勝: 確保您的每日連勝記錄，即使在最繁忙或謎題最難的日子里也絕不中斷。
* 輕鬆應對常識與單字挑戰: 像 Crossclimb 和 Pinpoint 這類遊戲需要深厚的常識儲備和敏捷的聯想能力。內置的人工智慧能夠以極高的準確度完美解答。
* 原生無縫整合: 求解器懸浮窗直接顯示在您的遊戲標籤頁上。只需輕輕一點，解出的答案就會呈現在螢幕中。
* 寓教於樂的提示模式 (Hint Mode): 幫助您自然地掌握解題技巧。它不會一键自動填滿所有空格，而是為您指出下一步最合理的邏輯走法，並透過螢幕上的紅色高亮瞬間糾正您的錯誤。
* 隱形防檢測求解速度 (Stealth Mode): 模擬真實的真人點擊操作行為，並在點擊間加入隨機、自然的延遲（1-3秒），有效保護您的每日連勝戰績免遭機器人檢測。
* 精美的數據看板: 透過現代化的日曆數據面板，追蹤您的求解歷史、平均時間、連勝紀錄以及個人最佳成績。
* 隱私與安全保護: 完全在您的本地瀏覽器中運行。您的 API 金鑰安全保存在本地儲存中，絕對不會被上傳或分享給任何第三方。`
  }

  // Save global/English description
  const enMessages = readLocaleMessages("en")
  const enDisclaimer = getMessageValue(enMessages, "disclaimerText")
  const enContent =
    descriptions.en + (enDisclaimer ? `\n\n---\n\n*${enDisclaimer}*` : "")
  writeFileSync(path.join(outDir, "global", "description.md"), enContent)

  // Save localized descriptions
  for (const [locale, content] of Object.entries(descriptions)) {
    if (locale !== "en") {
      const localeMessages = readLocaleMessages(locale)
      const localeDisclaimer = getMessageValue(localeMessages, "disclaimerText")
      const localizedContent =
        content + (localeDisclaimer ? `\n\n---\n\n*${localeDisclaimer}*` : "")

      const localePath = path.join(localizedDir, locale)
      ensureDir(localePath)
      writeFileSync(path.join(localePath, "description.md"), localizedContent)
    }
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

  // Step 4: Compose premium global promo banners and social previews with embedded screenshots
  console.log("Generating premium promo tiles and social previews...")
  generatePromoSmall()
  generatePromoMarquee()
  generateSocialPreviews()

  // Step 5: Capture screenshots for all other localized directories
  const locales = ["tr", "es", "fr", "pt_BR", "pt_PT", "de", "zh_CN", "zh_TW"]
  for (const locale of locales) {
    await captureScreenshots(locale)
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
  console.log("- Global screenshots: store-assets/global/screenshots/*.jpg")
  console.log(
    "- Localized screenshots: store-assets/localized/<locale>/screenshots/*.jpg"
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
