#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const assetsDir = path.join(rootDir, "assets")
const localesDir = path.join(rootDir, "locales")
const outDir = path.join(rootDir, "store-assets")
const globalScreenshotsDir = path.join(outDir, "global", "screenshots")
const localizedDir = path.join(outDir, "localized")
const tmpDir = path.join(outDir, ".tmp")

const gameIcons = [
  "tango",
  "queens",
  "pinpoint",
  "crossclimb",
  "sudoku",
  "zip",
  "patches"
]

function q(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}` + "'"
}

function run(command) {
  execSync(command, { stdio: "inherit" })
}

function hasTool(name) {
  try {
    execFileSync("which", [name], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function ensureTool(name) {
  if (!hasTool(name)) {
    throw new Error(
      `Required tool '${name}' is not installed or not available in PATH.`
    )
  }
}

function resolveImageMagickCmd() {
  return hasTool("magick") ? "magick" : "convert"
}

function resolveFontPathForLocale(locale) {
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

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true })
}

function renderSvg(svgPath, pngPath, width, height) {
  execFileSync(
    "rsvg-convert",
    ["-w", String(width), "-h", String(height), "-o", pngPath, svgPath],
    {
      stdio: "inherit"
    }
  )
}

const imageMagickCmd = resolveImageMagickCmd()

function readLocaleMessages(locale) {
  const localeFile = path.join(localesDir, locale, "messages.json")

  if (!existsSync(localeFile)) {
    return {}
  }

  try {
    return JSON.parse(readFileSync(localeFile, "utf8"))
  } catch {
    return {}
  }
}

function getMessageValue(messages, key) {
  const value = messages?.[key]?.message
  return typeof value === "string" ? value : ""
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim()
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function prepIconRenders() {
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

function generateStoreIcon() {
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

function generatePromoSmall() {
  const output = path.join(outDir, "global", "small-promo-440x280.jpg")

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
}

function generatePromoMarquee() {
  const output = path.join(outDir, "global", "marquee-promo-1400x560.jpg")

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
}

function generateScreenshot(index, leadIcon, secondaryIcon, accentColor) {
  const output = path.join(globalScreenshotsDir, `screenshot-${index}.jpg`)

  run(
    [
      imageMagickCmd,
      "-size",
      "1280x800",
      q(`gradient:${accentColor}-#0f172a`),
      "-fill",
      q("rgba(255,255,255,0.08)"),
      "-draw",
      q("roundrectangle 60,60 1220,740 32,32"),
      "-fill",
      q("#0b1220"),
      "-draw",
      q("roundrectangle 110,120 1170,700 24,24"),
      "-fill",
      q("#1e293b"),
      "\\(",
      q(path.join(tmpDir, `${leadIcon}-220.png`)),
      "\\)",
      "-gravity",
      "center",
      "-geometry",
      "-220+20",
      "-composite",
      "\\(",
      q(path.join(tmpDir, `${secondaryIcon}-220.png`)),
      "\\)",
      "-gravity",
      "center",
      "-geometry",
      "+80+20",
      "-composite",
      "\\(",
      q(path.join(tmpDir, "icon-140.png")),
      "\\)",
      "-gravity",
      "center",
      "-geometry",
      "+300+20",
      "-composite",
      "-strip",
      "-quality",
      "92",
      q(output)
    ].join(" ")
  )
}

function generateGlobalScreenshots() {
  const scenes = [
    { lead: "tango", secondary: "queens", accent: "#0a66c2" },
    { lead: "pinpoint", secondary: "crossclimb", accent: "#0369a1" },
    { lead: "sudoku", secondary: "zip", accent: "#0f766e" },
    { lead: "patches", secondary: "queens", accent: "#1d4ed8" },
    { lead: "tango", secondary: "pinpoint", accent: "#0e7490" }
  ]

  scenes.forEach((scene, index) => {
    generateScreenshot(index + 1, scene.lead, scene.secondary, scene.accent)
  })
}

function generateLocalizedScreenshots() {
  if (!existsSync(localesDir)) {
    return
  }

  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const source = path.join(globalScreenshotsDir, "screenshot-1.jpg")
  const fallbackMessages = readLocaleMessages("en")

  for (const locale of locales) {
    const localeShotDir = path.join(localizedDir, locale, "screenshots")
    ensureDir(localeShotDir)

    const destination = path.join(localeShotDir, "screenshot-1.jpg")
    const localeMessages = readLocaleMessages(locale)
    const localeFontPath = resolveFontPathForLocale(locale)

    const localizedTitle = cleanText(
      getMessageValue(localeMessages, "extensionName") ||
        getMessageValue(localeMessages, "title") ||
        getMessageValue(fallbackMessages, "extensionName") ||
        getMessageValue(fallbackMessages, "title") ||
        "LinkedIn Games Solver"
    )

    const localizedDescription = cleanText(
      getMessageValue(localeMessages, "extensionDescription") ||
        getMessageValue(localeMessages, "subtitle") ||
        getMessageValue(fallbackMessages, "extensionDescription") ||
        getMessageValue(fallbackMessages, "subtitle") ||
        "A helper for LinkedIn Games."
    )

    const titleText = truncateText(localizedTitle, 46)
    const descriptionText = truncateText(localizedDescription, 78)

    run(
      [
        imageMagickCmd,
        q(source),
        "-fill",
        q("rgba(10,102,194,0.9)"),
        "-draw",
        q("roundrectangle 56,622 1224,760 24,24"),
        "-fill",
        q("#ffffff"),
        ...(localeFontPath ? ["-font", q(localeFontPath)] : []),
        "-pointsize",
        "42",
        "-gravity",
        "southwest",
        "-annotate",
        "+88+120",
        q(titleText),
        "-fill",
        q("#e2e8f0"),
        "-pointsize",
        "28",
        "-gravity",
        "southwest",
        "-annotate",
        "+88+68",
        q(descriptionText),
        "-strip",
        "-quality",
        "92",
        q(destination)
      ].join(" ")
    )
  }
}

function generateSocialPreviews() {
  const socialDir = path.join(outDir, "social")
  ensureDir(socialDir)

  // Global: large and small
  const globalLarge = path.join(socialDir, "social-1280x640.jpg")
  const globalSmall = path.join(socialDir, "social-640x320.jpg")

  // Create a simple social hero using same accent gradient and centered icons
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

  // Resize for small social preview
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

  // Localized social previews: overlay translated title/description
  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const fallbackMessages = readLocaleMessages("en")

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

    // Generate large localized social image
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

    // Small localized social
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

function main() {
  ensureTool("rsvg-convert")
  ensureTool(imageMagickCmd)

  rmSync(tmpDir, { recursive: true, force: true })

  ensureDir(outDir)
  ensureDir(path.join(outDir, "global"))
  ensureDir(globalScreenshotsDir)
  ensureDir(localizedDir)

  prepIconRenders()
  generateStoreIcon()
  generatePromoSmall()
  generatePromoMarquee()
  generateGlobalScreenshots()
  generateLocalizedScreenshots()
  generateSocialPreviews()

  rmSync(tmpDir, { recursive: true, force: true })

  console.log("\nGenerated Chrome Web Store assets in ./store-assets")
  console.log("- store icon: store-assets/store-icon-128.png")
  console.log("- global promo tiles: store-assets/global/*.jpg")
  console.log("- global screenshots: store-assets/global/screenshots/*.jpg")
  console.log(
    "- localized screenshots: store-assets/localized/<locale>/screenshots/screenshot-1.jpg"
  )
}

main()
