#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer"
import type { Browser, ElementHandle, Page } from "puppeteer"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const outDir = path.join(rootDir, "store-assets")

// Parse .env and .env.local to load environment variables
function loadEnv() {
  const envPath = path.join(rootDir, ".env")
  const envLocalPath = path.join(rootDir, ".env.local")
  let envContent = ""
  if (existsSync(envLocalPath)) {
    envContent = readFileSync(envLocalPath, "utf-8")
  } else if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8")
  }
  if (envContent) {
    const lines = envContent.split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const firstEqual = trimmed.indexOf("=")
      if (firstEqual > 0) {
        const key = trimmed.slice(0, firstEqual).trim()
        const value = trimmed
          .slice(firstEqual + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "")
        process.env[key] = value
      }
    }
  }
}

loadEnv()

// Command Line Arguments parsing
const args = process.argv.slice(2)
const storeArgIndex = args.indexOf("--store")
const store =
  storeArgIndex !== -1 && args[storeArgIndex + 1]
    ? args[storeArgIndex + 1].toLowerCase()
    : "chrome"

const descArgIndex = args.indexOf("--description")
const uploadDescription =
  descArgIndex !== -1 ? args[descArgIndex + 1]?.toLowerCase() !== "false" : true

const screenshotArgIndex = args.indexOf("--screenshots")
const uploadScreenshots =
  screenshotArgIndex !== -1
    ? args[screenshotArgIndex + 1]?.toLowerCase() !== "false"
    : true

const localesArgIndex = args.indexOf("--locales")
const localeFilter: string[] | null =
  localesArgIndex !== -1 && args[localesArgIndex + 1]
    ? args[localesArgIndex + 1]
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : null

const CONSOLE_ID = process.env.CWS_CONSOLE_ID
const ITEM_ID = process.env.CWS_ITEM_ID

if (store === "chrome" && (!CONSOLE_ID || !ITEM_ID)) {
  console.error(
    "❌ Missing CWS_CONSOLE_ID or CWS_ITEM_ID in environment variables"
  )
  process.exit(1)
}

const DEV_CONSOLE_URL = `https://chrome.google.com/webstore/devconsole/${CONSOLE_ID}/${ITEM_ID}/edit?hl=en`

const EDGE_PRODUCT_ID = process.env.EDGE_PRODUCT_ID

if (!EDGE_PRODUCT_ID) {
  console.error("❌ Missing EDGE_PRODUCT_ID in environment variables")
  process.exit(1)
}

const EDGE_DASHBOARD_URL = `https://partner.microsoft.com/en-us/dashboard/microsoftedge/${EDGE_PRODUCT_ID}/listings`

interface LocaleConfig {
  displayName: string
  subStr: string // Matching dropdown selection text
  descPath: string
  screenshotDir: string
}

const ALL_LOCALES_RAW: { code: string; name: string; subStr: string }[] = [
  { code: "ar", name: "Arabic", subStr: "Arabic" },
  { code: "am", name: "Amharic", subStr: "Amharic" },
  { code: "bg", name: "Bulgarian", subStr: "Bulgarian" },
  { code: "bn", name: "Bengali", subStr: "Bangla" },
  { code: "ca", name: "Catalan", subStr: "Catalan" },
  { code: "cs", name: "Czech", subStr: "Czech" },
  { code: "da", name: "Danish", subStr: "Danish" },
  { code: "de", name: "German", subStr: "German" },
  { code: "el", name: "Greek", subStr: "Greek" },
  { code: "en", name: "English (Default)", subStr: "English" },
  { code: "en_AU", name: "English (Australia)", subStr: "English (Australia)" },
  {
    code: "en_GB",
    name: "English (United Kingdom)",
    subStr: "English (United Kingdom)"
  },
  {
    code: "en_US",
    name: "English (United States)",
    subStr: "English (United States)"
  },
  { code: "es", name: "Spanish", subStr: "Spanish" },
  {
    code: "es_419",
    name: "Spanish (Latin America and the Caribbean)",
    subStr: "Spanish (Latin America and the Caribbean)"
  },
  { code: "et", name: "Estonian", subStr: "Estonian" },
  { code: "fa", name: "Persian", subStr: "Persian" },
  { code: "fi", name: "Finnish", subStr: "Finnish" },
  { code: "fil", name: "Filipino", subStr: "Filipino" },
  { code: "fr", name: "French", subStr: "French" },
  { code: "gu", name: "Gujarati", subStr: "Gujarati" },
  { code: "he", name: "Hebrew", subStr: "Hebrew" },
  { code: "hi", name: "Hindi", subStr: "Hindi" },
  { code: "hr", name: "Croatian", subStr: "Croatian" },
  { code: "hu", name: "Hungarian", subStr: "Hungarian" },
  { code: "id", name: "Indonesian", subStr: "Indonesian" },
  { code: "it", name: "Italian", subStr: "Italian" },
  { code: "ja", name: "Japanese", subStr: "Japanese" },
  { code: "kn", name: "Kannada", subStr: "Kannada" },
  { code: "ko", name: "Korean", subStr: "Korean" },
  { code: "lt", name: "Lithuanian", subStr: "Lithuanian" },
  { code: "lv", name: "Latvian", subStr: "Latvian" },
  { code: "ml", name: "Malayalam", subStr: "Malayalam" },
  { code: "mr", name: "Marathi", subStr: "Marathi" },
  { code: "ms", name: "Malay", subStr: "Malay" },
  { code: "nl", name: "Dutch", subStr: "Dutch" },
  { code: "no", name: "Norwegian", subStr: "Norwegian" },
  { code: "pl", name: "Polish", subStr: "Polish" },
  { code: "pt_BR", name: "Portuguese (Brazil)", subStr: "Portuguese (Brazil)" },
  {
    code: "pt_PT",
    name: "Portuguese (Portugal)",
    subStr: "Portuguese (Portugal)"
  },
  { code: "ro", name: "Romanian", subStr: "Romanian" },
  { code: "ru", name: "Russian", subStr: "Russian" },
  { code: "sk", name: "Slovak", subStr: "Slovak" },
  { code: "sl", name: "Slovenian", subStr: "Slovenian" },
  { code: "sr", name: "Serbian", subStr: "Serbian" },
  { code: "sv", name: "Swedish", subStr: "Swedish" },
  { code: "sw", name: "Kiswahili", subStr: "Kiswahili" },
  { code: "ta", name: "Tamil", subStr: "Tamil" },
  { code: "te", name: "Telugu", subStr: "Telugu" },
  { code: "th", name: "Thai", subStr: "Thai" },
  { code: "tr", name: "Turkish", subStr: "Turkish" },
  { code: "uk", name: "Ukrainian", subStr: "Ukrainian" },
  { code: "vi", name: "Vietnamese", subStr: "Vietnamese" },
  { code: "zh_CN", name: "Chinese (China)", subStr: "Chinese (China)" },
  { code: "zh_TW", name: "Chinese (Taiwan)", subStr: "Chinese (Taiwan)" }
]

const localeMap: Record<string, LocaleConfig> = {}
for (const loc of ALL_LOCALES_RAW) {
  localeMap[loc.code] = {
    displayName: loc.name,
    subStr: loc.subStr,
    descPath: path.join(outDir, "localized", loc.code, "description.md"),
    screenshotDir: path.join(outDir, "localized", loc.code, "screenshots")
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getFileInputForSection(
  page: Page,
  sectionLabel: string
): Promise<ElementHandle<HTMLInputElement> | null> {
  const fileInputHandle = await page.evaluateHandle((label) => {
    const elements = Array.from(
      document.querySelectorAll("p, label, h3, h4, span")
    )
    const labelEl = elements.find((el) => {
      const txt = el.textContent?.trim()
      return txt === label || txt?.includes(label)
    })
    if (!labelEl) return null

    // Walk up to the nearest section-level wrapper, then find its file input
    let current: HTMLElement | null = labelEl as HTMLElement
    while (current) {
      const input = current.querySelector('input[type="file"]')
      if (input) {
        const hasUploadController =
          current.querySelector('[jscontroller="cuBFtb"]') !== null ||
          current.getAttribute("jscontroller") === "cuBFtb"
        // Only return if we're at a section-level container, not a broad parent
        if (
          current.classList.contains("TVM7Wc") ||
          hasUploadController ||
          current.querySelectorAll('input[type="file"]').length === 1
        ) {
          return input
        }
      }
      current = current.parentElement
    }
    return null
  }, sectionLabel)

  const input = fileInputHandle.asElement()
  if (input) {
    return input as ElementHandle<HTMLInputElement>
  }
  return null
}

async function clearExistingScreenshots(
  page: Page,
  sectionLabel: string
): Promise<void> {
  console.log(`Clearing existing screenshots for section: "${sectionLabel}"...`)

  const sectionHandle = await page.evaluateHandle((label) => {
    const elements = Array.from(
      document.querySelectorAll("p, label, h3, h4, span")
    )
    const labelEl = elements.find((el) =>
      el.textContent?.trim().includes(label)
    )
    if (!labelEl) return null

    let current: HTMLElement | null = labelEl as HTMLElement
    while (current) {
      const hasFileInput =
        current.querySelectorAll('input[type="file"]').length > 0
      const hasUploadController =
        current.querySelector('[jscontroller="cuBFtb"]') !== null ||
        current.getAttribute("jscontroller") === "cuBFtb"
      if (
        hasFileInput &&
        (current.classList.contains("TVM7Wc") ||
          hasUploadController ||
          current.querySelectorAll('input[type="file"]').length === 1)
      ) {
        return current
      }
      current = current.parentElement
    }
    return null
  }, sectionLabel)

  const sectionEl = sectionHandle.asElement()
  if (!sectionEl) {
    console.log(
      `⚠️ Container for "${sectionLabel}" not found. Cannot clear screenshots.`
    )
    return
  }

  const removeButtonsCount = await page.evaluate((container) => {
    if (!container) return 0
    const el = container as HTMLElement
    const buttons = Array.from(el.querySelectorAll("[role='button'], button"))
    return buttons.filter((btn) => {
      const label = (btn as HTMLElement).getAttribute("aria-label") || ""
      return (
        label.toLowerCase().includes("remove image screenshot") ||
        label.toLowerCase().includes("remove image")
      )
    }).length
  }, sectionEl)

  if (removeButtonsCount > 0) {
    console.log(`Found ${removeButtonsCount} existing screenshot(s) to remove.`)
    for (let i = 0; i < removeButtonsCount; i++) {
      const currentButtonHandle = await page.evaluateHandle((container) => {
        if (!container) return null
        const el = container as HTMLElement
        const buttons = Array.from(
          el.querySelectorAll("[role='button'], button")
        )
        return (
          buttons.find((btn) => {
            const label = (btn as HTMLElement).getAttribute("aria-label") || ""
            return (
              label.toLowerCase().includes("remove image screenshot") ||
              label.toLowerCase().includes("remove image")
            )
          }) || null
        )
      }, sectionEl)

      const currentBtn = currentButtonHandle.asElement()
      if (currentBtn) {
        const btnLabel = await page.evaluate(
          (el) => (el as Element).getAttribute("aria-label"),
          currentBtn
        )
        console.log(`Removing: ${btnLabel}...`)
        await page.evaluate((el) => {
          ;(el as HTMLElement).scrollIntoView({ block: "center" })
          ;(el as HTMLElement).click()
        }, currentBtn)
        await delay(800) // Wait for modal dialog to appear

        // Find the confirm button in the modal dialog with text "Remove"
        const confirmBtnHandle = await page.evaluateHandle(() => {
          const dialogButtons = Array.from(document.querySelectorAll("button"))
          return (
            dialogButtons.find((btn) => {
              const isConfirm =
                btn.getAttribute("data-mdc-dialog-action") === "ok" ||
                btn.getAttribute("data-mdc-dialog-button-default") !== null
              const text = btn.textContent?.trim().toLowerCase()
              return isConfirm && text === "remove"
            }) ||
            dialogButtons.find(
              (btn) => btn.textContent?.trim().toLowerCase() === "remove"
            ) ||
            null
          )
        })

        const confirmBtn = confirmBtnHandle.asElement()
        if (confirmBtn) {
          console.log(`Confirming removal in dialog...`)
          await page.evaluate((el) => {
            ;(el as HTMLElement).click()
          }, confirmBtn)
          await delay(1500) // Wait for deletion to process and dialog to close
        } else {
          console.log("⚠️ Could not find 'Remove' confirm button in dialog.")
          await delay(1000)
        }
      }
    }
    console.log("Existing screenshots cleared successfully.")
  } else {
    console.log("No existing screenshots found to clear.")
  }
}

async function waitForUploadToComplete(
  page: Page,
  sectionLabel: string,
  expectedCount: number,
  timeoutMs: number = 35000
): Promise<boolean> {
  console.log(
    `Waiting for uploads in "${sectionLabel}" to reach ${expectedCount} image(s)...`
  )
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const currentCount = await page.evaluate((label) => {
      const elements = Array.from(
        document.querySelectorAll("p, label, h3, h4, span")
      )
      const labelEl = elements.find((el) =>
        el.textContent?.trim().includes(label)
      )
      if (!labelEl) return 0
      let current: HTMLElement | null = labelEl as HTMLElement
      while (current) {
        const inputs = current.querySelectorAll('input[type="file"]')
        if (inputs.length > 0) {
          return current.querySelectorAll("img").length
        }
        current = current.parentElement
      }
      return 0
    }, sectionLabel)

    if (currentCount >= expectedCount) {
      console.log(`✅ Upload complete! Found ${currentCount} image(s).`)
      return true
    }
    await delay(1000)
  }
  console.log(`⚠️ Timeout waiting for uploads in "${sectionLabel}".`)
  return false
}

async function main() {
  let browser: Browser
  try {
    browser = await puppeteer.connect({
      browserURL: "http://127.0.0.1:9222",
      defaultViewport: null
    })
  } catch {
    console.error(
      "\n❌ Could not connect to running Chrome instance on port 9222."
    )
    console.error("Please launch Chrome with the debugging flag and try again.")
    process.exit(1)
  }

  if (store === "edge") {
    await runEdgeUploader(browser)
    return
  }

  console.log("\n=======================================================")
  console.log("🚀 CHROME WEB STORE SEMI-AUTOMATED ASSETS UPLOADER")
  console.log("=======================================================")
  console.log("\nGoogle's authentication requires secure browser contexts.")
  console.log(
    "To use this script, you must run your browser (Chromium/Chrome) with remote debugging:"
  )
  console.log(
    '  chromium --remote-debugging-port=9222 --user-data-dir="$HOME/.config/chromium-dev-profile"'
  )
  console.log(
    '  (or: google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.config/chrome-dev-profile")'
  )
  console.log("\nLog in to your developer dashboard, and then run this script.")
  console.log("Connecting to standard debugging port 9222...")

  console.log("✅ Successfully connected to Chrome instance!")
  const pages = await browser.pages()
  let page = pages.find((p) => p.url().includes("devconsole"))

  if (!page) {
    console.log(`Opening a new tab to Developer Console...`)
    page = await browser.newPage()
    await page.goto(DEV_CONSOLE_URL, { waitUntil: "networkidle2" })
  } else {
    console.log(`Using already open Developer Console tab...`)
    await page.bringToFront()
  }

  console.log("Waiting for listing page to load fully...")
  await page.waitForSelector("textarea, input", { timeout: 15000 })

  const cmLocales = localeFilter
    ? Object.entries(localeMap).filter(([code]) => localeFilter.includes(code))
    : Object.entries(localeMap)

  for (const [localeCode, config] of cmLocales) {
    console.log(`\n-------------------------------------------------------`)
    console.log(
      `🌐 PROCESSING LOCALE: [${localeCode.toUpperCase()}] - ${config.displayName}`
    )
    console.log(`-------------------------------------------------------`)

    if (!existsSync(config.descPath)) {
      console.log(
        `⚠️ Description file missing at: ${config.descPath}. Skipping...`
      )
      continue
    }

    const descriptionText = readFileSync(config.descPath, "utf-8")

    // Step 1: Switch locale in dropdown
    console.log("Clicking current language selector...")
    const dropdownHandle = await page.evaluateHandle(() => {
      const dropdowns = Array.from(document.querySelectorAll(".VfPpkd-TkwUic"))
      return (
        dropdowns.find((el) => {
          const text = el.textContent?.trim() || ""
          return text.startsWith("Language") || text.includes("Language")
        }) || null
      )
    })
    const langDropdown = dropdownHandle.asElement()

    if (langDropdown) {
      await page.evaluate((el) => {
        ;(el as HTMLElement).scrollIntoView({ block: "center" })
        ;(el as HTMLElement).click()
      }, langDropdown)
      await delay(1000)

      console.log(
        `Looking for listbox option with text including "${config.subStr}"...`
      )
      const optionHandle = await page.evaluateHandle((sub) => {
        const options = Array.from(
          document.querySelectorAll(
            "[role='option'], li, div.VfPpkd-rymPhb-ibnC6b"
          )
        )
        return (
          options.find((el) => {
            const text = el.textContent?.trim() || ""
            return text.toLowerCase().includes(sub.toLowerCase())
          }) || null
        )
      }, config.subStr)
      const optionEl = optionHandle.asElement()

      if (optionEl) {
        const optionText = await page.evaluate(
          (el) => (el as Element).textContent?.trim(),
          optionEl
        )
        console.log(`Selecting option: "${optionText}"...`)
        await page.evaluate((el) => {
          ;(el as HTMLElement).scrollIntoView({ block: "center" })
          ;(el as HTMLElement).click()
        }, optionEl)

        console.log(`Waiting for page locale switch to complete...`)
        let switchCompleted = false
        const targetText = config.displayName.split(" ")[0].toLowerCase() // e.g. "english", "turkish", "spanish"
        for (let i = 0; i < 20; i++) {
          const currentDropdownText = await page.evaluate(() => {
            const dropdowns = Array.from(
              document.querySelectorAll(".VfPpkd-TkwUic")
            )
            const langEl = dropdowns.find((el) => {
              const text = el.textContent?.trim() || ""
              return text.startsWith("Language") || text.includes("Language")
            })
            return langEl ? langEl.textContent?.trim().toLowerCase() || "" : ""
          })

          if (currentDropdownText.includes(targetText)) {
            switchCompleted = true
            break
          }
          await delay(500)
        }

        if (switchCompleted) {
          console.log(`✅ Locale switch to ${config.displayName} verified!`)
          await delay(1000) // Small safety buffer for dynamic content swaps
        } else {
          console.log(
            `⚠️ Could not verify locale switch text. Waiting extra 3 seconds...`
          )
          await delay(3000)
        }
      } else {
        console.log(
          `⚠️ Language option for "${config.subStr}" listbox item not found.`
        )
      }
    } else {
      console.log(
        "⚠️ Could not find language selector element. Proceeding with active selection..."
      )
    }

    // Step 2: Update Listing Description Text
    if (uploadDescription) {
      console.log(
        `Updating listing description text (first 100 chars: ${descriptionText.slice(0, 100).replace(/\n/g, "\\n")}...)`
      )
      const textareaHandle = await page.evaluateHandle(() => {
        const textareas = Array.from(document.querySelectorAll("textarea"))
        const target = textareas.find(
          (ta) =>
            !ta.readOnly &&
            (ta.placeholder?.toLowerCase().includes("explain") ||
              ta.placeholder?.toLowerCase().includes("description"))
        )
        return target || textareas.find((ta) => !ta.readOnly) || null
      })
      const descTextarea =
        textareaHandle.asElement() as ElementHandle<HTMLTextAreaElement> | null

      if (descTextarea) {
        await descTextarea.focus()
        await page.keyboard.down("Control")
        await page.keyboard.press("KeyA")
        await page.keyboard.up("Control")
        await page.keyboard.press("Backspace")

        console.log(
          `Typing description text (${descriptionText.length} characters)...`
        )
        await page.evaluate(
          (el, text) => {
            el.value = text
            el.dispatchEvent(new Event("input", { bubbles: true }))
            el.dispatchEvent(new Event("change", { bubbles: true }))
          },
          descTextarea,
          descriptionText
        )
        await delay(1000)

        const actualText = await page.evaluate(
          (el) => (el as HTMLTextAreaElement).value,
          descTextarea
        )
        if (actualText.slice(0, 100) !== descriptionText.slice(0, 100)) {
          console.log(
            `⚠️ Verification mismatch! Textarea has: ${actualText.slice(0, 100).replace(/\n/g, "\\n")}`
          )
        } else {
          console.log("✅ Description content verified.")
        }
      } else {
        console.log("❌ Could not locate the description input field.")
      }
    } else {
      console.log("⏭️ Skipping description update (--description false)")
    }

    // Step 3: Upload Localized Screenshots
    if (uploadScreenshots) {
      if (existsSync(config.screenshotDir)) {
        const allScreens = readdirSync(config.screenshotDir)
          .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
          .sort()

        const topScreens = allScreens
          .filter((f) =>
            [
              "screenshot-1.jpg",
              "screenshot-2.jpg",
              "screenshot-3.jpg",
              "screenshot-5.jpg",
              "screenshot-6.jpg"
            ].includes(f)
          )
          .map((f) => path.join(config.screenshotDir, f))

        if (topScreens.length > 0) {
          const screenshotsLabel =
            localeCode === "en" ? "Global screenshots" : "Localized screenshots"

          // Clear old ones first to prevent exceeding the 5 screenshots limit
          await clearExistingScreenshots(page, screenshotsLabel)

          console.log(`Locating ${screenshotsLabel} upload section...`)
          const screenshotInput = await getFileInputForSection(
            page,
            screenshotsLabel
          )
          if (screenshotInput) {
            console.log(
              `Uploading ${topScreens.length} screenshot files one-by-one...`
            )
            let expectedCount = 0
            for (const screenPath of topScreens) {
              // Re-locate the input in case the DOM re-renders after an upload
              const currentInput = await getFileInputForSection(
                page,
                screenshotsLabel
              )
              if (currentInput) {
                console.log(`Uploading: ${path.basename(screenPath)}...`)
                await currentInput.uploadFile(screenPath)
                expectedCount++
                await waitForUploadToComplete(
                  page,
                  screenshotsLabel,
                  expectedCount
                )
                await delay(1000) // Small safety margin
              }
            }
            await delay(2000)
          } else {
            console.log(`⚠️ ${screenshotsLabel} input element not found.`)
          }
        }
      }
    } else {
      console.log("⏭️ Skipping screenshots upload (--screenshots false)")
    }

    // Step 4: Upload Global Assets (Icon, Promo Tiles) - Only once for default locale (English)
    if (localeCode === "en") {
      console.log("\n⚙️ Uploading Global Graphic Assets...")

      const iconFile = path.join(outDir, "store-icon-128.png")
      if (existsSync(iconFile)) {
        console.log(`Locating Store Icon upload section...`)
        const iconInput = await getFileInputForSection(page, "Store icon")
        if (iconInput) {
          console.log("Uploading Store Icon...")
          await iconInput.uploadFile(iconFile)
          await delay(6000) // Safe delay for global icon
        } else {
          console.log("⚠️ Store icon input element not found.")
        }
      }

      const smallPromoFile = path.join(
        outDir,
        "global",
        "small-promo-440x280.jpg"
      )
      if (existsSync(smallPromoFile)) {
        // Clear first
        await clearExistingScreenshots(page, "Small promo tile")

        console.log(`Locating Small Promo Tile upload section...`)
        const smallPromoInput = await getFileInputForSection(
          page,
          "Small promo tile"
        )
        if (smallPromoInput) {
          console.log("Uploading Small Promo Tile...")
          await smallPromoInput.uploadFile(smallPromoFile)
          await delay(6000) // Safe delay for global tile
        } else {
          console.log("⚠️ Small promo tile input element not found.")
        }
      }

      const marqueePromoFile = path.join(
        outDir,
        "global",
        "marquee-promo-1400x560.jpg"
      )
      if (existsSync(marqueePromoFile)) {
        // Clear first
        await clearExistingScreenshots(page, "Marquee promo tile")

        console.log(`Locating Marquee Promo Tile upload section...`)
        const marqueePromoInput = await getFileInputForSection(
          page,
          "Marquee promo tile"
        )
        if (marqueePromoInput) {
          console.log("Uploading Marquee Promo Tile...")
          await marqueePromoInput.uploadFile(marqueePromoFile)
          await delay(6000) // Safe delay for global marquee
        } else {
          console.log("⚠️ Marquee promo tile input element not found.")
        }
      }
    }

    console.log(`✅ Completed actions for locale: ${config.displayName}`)
  }

  console.log("\n=======================================================")
  console.log("🎉 ALL ASSETS QUEUED AND LISTING DESCRIPTIONS POPULATED!")
  console.log("=======================================================")
  console.log(
    "Please review the changes on the browser tab, make sure they are correct,"
  )
  console.log(
    "and manually click 'Save draft' or 'Publish' in the developer console."
  )
  console.log("Disconnecting from browser automation...")
  await browser.disconnect()
}

async function getEdgeSectionContainer(
  page: Page,
  label: string
): Promise<ElementHandle<HTMLElement> | null> {
  const handle = await page.evaluateHandle((sectionLabel) => {
    const key = sectionLabel.toLowerCase()
    if (key.includes("logo")) {
      return document.querySelector("app-logos")
    }
    if (key.includes("screenshot")) {
      return document.querySelector("screenshots")
    }
    if (key.includes("small promo") || key.includes("small promotional")) {
      return (
        document.querySelector('promo-tiles[size="Small"]') ||
        document.querySelectorAll("promo-tiles")[0]
      )
    }
    if (key.includes("large promo") || key.includes("large promotional")) {
      return (
        document.querySelector('promo-tiles[size="Large"]') ||
        document.querySelectorAll("promo-tiles")[1]
      )
    }
    return null
  }, label)

  return handle.asElement() as ElementHandle<HTMLElement> | null
}

async function ensureEdgeStoreListingsView(page: Page): Promise<void> {
  const isListingsLoaded = await page.evaluate(() => {
    const hasEditBtn = !!document.querySelector(
      'button[aria-label*="Edit"][aria-label*="language"]'
    )
    const isDrawerOpen =
      !!document.querySelector("mat-dialog-container") ||
      window.location.href.includes("/details/")
    return hasEditBtn && !isDrawerOpen
  })

  if (isListingsLoaded) {
    console.log("Already on the Store listings overview page.")
    return
  }

  console.log("Locating 'Store listings' navigation link/button...")
  const clicked = await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll("a, button, div, span")
    )
    const navItem = elements.find((el) => {
      const txt = (el.textContent || "").trim().toLowerCase()
      return txt === "store listings" || txt === "store listing"
    }) as HTMLElement

    if (navItem) {
      navItem.scrollIntoView({ block: "center" })
      navItem.click()
      return true
    }
    return false
  })

  if (clicked) {
    console.log(
      "👉 Clicked 'Store listings' in sidebar navigation. Waiting for page to load..."
    )
    await delay(5000)
  } else {
    console.log(
      "⚠️ Could not find 'Store listings' sidebar navigation item. Navigating via URL..."
    )
    await page.goto(EDGE_DASHBOARD_URL, { waitUntil: "networkidle2" })
    await delay(5000)
  }
}

async function getEdgeFileInputForSection(
  page: Page,
  sectionLabel: string
): Promise<ElementHandle<HTMLInputElement> | null> {
  const container = await getEdgeSectionContainer(page, sectionLabel)
  if (!container) return null

  const inputHandle = await page.evaluateHandle((el) => {
    if (!el) return null
    return el.querySelector('input[type="file"]')
  }, container)

  return inputHandle.asElement() as ElementHandle<HTMLInputElement> | null
}

async function clearEdgeExistingImages(
  page: Page,
  sectionLabel: string
): Promise<void> {
  console.log(`Clearing existing images for Edge section: "${sectionLabel}"...`)

  const container = await getEdgeSectionContainer(page, sectionLabel)
  if (!container) {
    console.log(`⚠️ Container for "${sectionLabel}" not found.`)
    return
  }

  const deleteButtonsCount = await page.evaluate((el) => {
    if (!el) return 0
    const buttons = Array.from(el.querySelectorAll("button, [role='button']"))
    return buttons.filter((btn) => {
      const label = btn.getAttribute("aria-label") || ""
      const text = (btn.textContent || "").trim().toLowerCase()
      return (
        label.toLowerCase() === "delete" ||
        label.toLowerCase().includes("delete") ||
        text === "delete" ||
        text.includes("delete")
      )
    }).length
  }, container)

  if (deleteButtonsCount > 0) {
    console.log(
      `Found ${deleteButtonsCount} existing image(s) to remove in "${sectionLabel}".`
    )
    for (let i = 0; i < deleteButtonsCount; i++) {
      const clicked = await page.evaluate((el) => {
        if (!el) return false
        const buttons = Array.from(
          el.querySelectorAll("button, [role='button']")
        )
        const btn = buttons.find((btn) => {
          const label = btn.getAttribute("aria-label") || ""
          const text = (btn.textContent || "").trim().toLowerCase()
          return (
            label.toLowerCase() === "delete" ||
            label.toLowerCase().includes("delete") ||
            text === "delete" ||
            text.includes("delete")
          )
        }) as HTMLElement
        if (btn) {
          btn.scrollIntoView({ block: "center" })
          btn.click()
          return true
        }
        return false
      }, container)

      if (clicked) {
        console.log(`Clicked delete button ${i + 1}/${deleteButtonsCount}.`)
        await delay(2000)
        const modalConfirmed = await page.evaluate(() => {
          const confirmBtn = Array.from(
            document.querySelectorAll("v6_he-button, button")
          ).find((b) => {
            const txt = (b.textContent || "").trim().toLowerCase()
            const matClose = b.getAttribute("matdialogclose") || ""
            const l10n = b.getAttribute("data-l10n-key") || ""
            return (
              txt === "confirm" ||
              txt === "delete" ||
              matClose === "confirm" ||
              l10n.includes("Confirm") ||
              l10n.includes("Delete")
            )
          }) as HTMLElement
          if (confirmBtn) {
            confirmBtn.click()
            return true
          }
          return false
        })
        if (modalConfirmed) {
          console.log("👉 Confirmed the deletion modal dialog.")
          await delay(2500)
        } else {
          await delay(1000)
        }
      }
    }
  } else {
    console.log(`No existing images found to clear in "${sectionLabel}".`)
  }
}

async function setScreenshotCaptions(
  page: Page,
  localeCode: string
): Promise<void> {
  console.log("\n⚙️ Setting Screenshot Captions...")

  const translationsPath = path.join(
    __dirname,
    "store-assets-translations.json"
  )
  let sceneCaptions: Record<string, Record<string, string>> = {}
  if (existsSync(translationsPath)) {
    const t = JSON.parse(readFileSync(translationsPath, "utf-8"))
    sceneCaptions = t.screenshotCaptions || {}
  }

  const captions: string[] = []
  for (let i = 1; i <= 6; i++) {
    const sceneKey = `scene${i}`
    const caption = sceneCaptions[sceneKey]?.[localeCode]
    if (caption) captions.push(caption)
  }

  if (captions.length === 0) {
    console.log(
      `⏭️ Skipping captions for ${localeCode} (no translations available)`
    )
    return
  }

  const container = await getEdgeSectionContainer(page, "Screenshot/s")
  if (!container) {
    console.log("⚠️ Screenshots section container not found.")
    return
  }

  const screenshotItemsCount = await page.evaluate((el) => {
    return el.querySelectorAll("li.imageassetplaceholder").length
  }, container)

  console.log(
    `Found ${screenshotItemsCount} uploaded screenshot(s) to add captions to.`
  )

  for (let i = 0; i < screenshotItemsCount; i++) {
    const captionText = captions[i] || captions[0]
    console.log(`Setting caption for screenshot ${i + 1}: "${captionText}"...`)

    const clicked = await page.evaluate(
      (el, index) => {
        const items = Array.from(
          el.querySelectorAll("li.imageassetplaceholder")
        )
        const targetItem = items[index]
        if (!targetItem) return false

        const editButton = targetItem.querySelector(
          ".caption-edit-container button"
        ) as HTMLElement | null
        if (editButton) {
          editButton.scrollIntoView({ block: "center" })
          editButton.click()
          return true
        }
        return false
      },
      container,
      i
    )

    if (!clicked) {
      console.log(
        `⚠️ Could not click caption edit button for screenshot ${i + 1}.`
      )
      continue
    }

    await delay(1500) // Wait for modal to render

    const typed = await page.evaluate(async (text) => {
      const input = document.querySelector(
        "mat-dialog-container input#titleEdit"
      ) as HTMLInputElement | null
      if (input) {
        input.focus()
        input.value = ""
        input.value = text
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.dispatchEvent(new Event("change", { bubbles: true }))

        const dialog = document.querySelector("mat-dialog-container")
        if (dialog) {
          const buttons = Array.from(
            dialog.querySelectorAll("button, v6_he-button")
          )
          const confirmBtn = buttons.find((btn) => {
            const txt = (btn.textContent || "").trim().toLowerCase()
            return (
              txt === "confirm" ||
              txt.includes("confirm") ||
              btn.getAttribute("matdialogclose") === "confirm"
            )
          }) as HTMLElement | undefined
          if (confirmBtn) {
            confirmBtn.click()
            return true
          }
        }
      }
      return false
    }, captionText)

    if (typed) {
      console.log(`✅ Caption set successfully for screenshot ${i + 1}!`)
    } else {
      console.log(`⚠️ Failed to set caption for screenshot ${i + 1}.`)
      await page.evaluate(() => {
        const dialog = document.querySelector("mat-dialog-container")
        if (dialog) {
          const closeBtn = dialog.querySelector(
            "button.close, [matdialogclose='cancel']"
          ) as HTMLElement | null
          if (closeBtn) closeBtn.click()
        }
      })
    }
    await delay(1500)
  }
}

const edgeSearchTerms: Record<string, string[]> = {
  en: [
    "linkedin games",
    "queens solver",
    "sudoku solver",
    "tango solver",
    "crossclimb",
    "pinpoint",
    "daily puzzles"
  ],
  tr: [
    "linkedin oyunlari",
    "queens cozucu",
    "sudoku cozucu",
    "tango cozucu",
    "crossclimb",
    "pinpoint",
    "gunluk bulmaca"
  ],
  es: [
    "juegos linkedin",
    "resolver queens",
    "resolver sudoku",
    "resolver tango",
    "crossclimb",
    "pinpoint",
    "acertijos diarios"
  ],
  fr: [
    "jeux linkedin",
    "solveur queens",
    "solveur sudoku",
    "solveur tango",
    "crossclimb",
    "pinpoint",
    "enigmes"
  ],
  de: [
    "linkedin spiele",
    "queens loesung",
    "sudoku loesung",
    "tango loesung",
    "crossclimb",
    "pinpoint",
    "taegliche raetsel"
  ],
  pt_BR: [
    "jogos linkedin",
    "solucionador queens",
    "solucionador sudoku",
    "solucionador tango",
    "crossclimb",
    "pinpoint",
    "enigmas diarios"
  ],
  pt_PT: [
    "jogos linkedin",
    "solucionador queens",
    "solucionador sudoku",
    "solucionador tango",
    "crossclimb",
    "pinpoint",
    "enigmas diarios"
  ],
  zh_CN: [
    "linkedin games",
    "queens solver",
    "sudoku solver",
    "tango solver",
    "crossclimb",
    "pinpoint",
    "games solver"
  ],
  zh_TW: [
    "linkedin games",
    "queens solver",
    "sudoku solver",
    "tango solver",
    "crossclimb",
    "pinpoint",
    "games solver"
  ]
}

async function clearEdgeExistingSearchTerms(page: Page): Promise<void> {
  console.log("Clearing existing search terms...")
  const deleteCount = await page.evaluate(() => {
    const container = document.querySelector("app-search-terms")
    if (!container) return 0

    const allClickables = Array.from(
      container.querySelectorAll(
        "button, span, i, mat-icon, a, [role='button']"
      )
    )
    const deleteBtns = allClickables.filter((el) => {
      const text = (el.textContent || "").trim().toLowerCase()
      const aria = (el.getAttribute("aria-label") || "").toLowerCase()
      const cls = (el.className || "").toLowerCase()
      const id = (el.id || "").toLowerCase()

      if (text === "add term") return false

      return (
        text === "x" ||
        aria.includes("delete") ||
        aria.includes("remove") ||
        aria.includes("close") ||
        cls.includes("delete") ||
        cls.includes("remove") ||
        cls.includes("close") ||
        cls.includes("x") ||
        id.includes("delete") ||
        id.includes("remove")
      )
    })
    return deleteBtns.length
  })

  console.log(`Found ${deleteCount} search terms to remove.`)

  for (let i = 0; i < deleteCount; i++) {
    const clicked = await page.evaluate(() => {
      const container = document.querySelector("app-search-terms")
      if (!container) return false

      const allClickables = Array.from(
        container.querySelectorAll(
          "button, span, i, mat-icon, a, [role='button']"
        )
      )
      const btn = allClickables.find((el) => {
        const text = (el.textContent || "").trim().toLowerCase()
        const aria = (el.getAttribute("aria-label") || "").toLowerCase()
        const cls = (el.className || "").toLowerCase()
        const id = (el.id || "").toLowerCase()

        if (text === "add term") return false

        return (
          text === "x" ||
          aria.includes("delete") ||
          aria.includes("remove") ||
          aria.includes("close") ||
          cls.includes("delete") ||
          cls.includes("remove") ||
          cls.includes("close") ||
          cls.includes("x") ||
          id.includes("delete") ||
          id.includes("remove")
        )
      }) as HTMLElement

      if (btn) {
        btn.scrollIntoView({ block: "center" })
        btn.click()
        return true
      }
      return false
    })

    if (clicked) {
      console.log(`Clicked delete button ${i + 1}/${deleteCount}`)
      await delay(1000)
    }
  }
}

async function uploadEdgeSearchTerms(
  page: Page,
  terms: string[]
): Promise<void> {
  console.log(`\n⚙️ Uploading Search Terms:`, terms)

  await clearEdgeExistingSearchTerms(page)

  for (const term of terms) {
    if (!term.trim()) continue
    console.log(`Adding search term: "${term}"...`)

    const inputSelector = "app-search-terms input"
    await page.waitForSelector(inputSelector)

    await page.focus(inputSelector)
    await page.evaluate((sel) => {
      const input = document.querySelector(sel) as HTMLInputElement
      if (input) {
        input.value = ""
        input.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }, inputSelector)

    await page.keyboard.type(term)
    await delay(300)

    await page.evaluate((sel) => {
      const input = document.querySelector(sel) as HTMLInputElement
      if (input) {
        input.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }, inputSelector)
    await delay(300)

    const added = await page.evaluate(() => {
      const btns = Array.from(
        document.querySelectorAll("app-search-terms button")
      )
      const addBtn = btns.find(
        (b) => (b.textContent || "").trim().toLowerCase() === "add term"
      ) as HTMLElement
      if (addBtn) {
        addBtn.scrollIntoView({ block: "center" })
        addBtn.click()
        return true
      }
      return false
    })

    if (added) {
      console.log(`Successfully added search term: "${term}"`)
      await delay(1500)
    } else {
      console.warn(`⚠️ Could not click 'Add Term' button for "${term}"`)
    }
  }
}

async function runEdgeUploader(browser: Browser) {
  console.log("\n=======================================================")
  console.log("🚀 MICROSOFT EDGE DEVELOPER PARTNER CENTER ASSETS UPLOADER")
  console.log("=======================================================")

  console.log("✅ Successfully connected to Chrome instance!")
  const pages = await browser.pages()
  let page = pages.find((p) => p.url().includes("partner.microsoft.com"))

  if (!page) {
    console.log(`Opening a new tab to Microsoft Edge Partner listings...`)
    page = await browser.newPage()
    await page.goto(EDGE_DASHBOARD_URL, { waitUntil: "networkidle2" })
  } else {
    console.log(`Using already open Microsoft Edge Developer tab...`)
    await page.bringToFront()
  }

  // Start-up safety check: if we are stuck inside a drawer, click 'Close' to go back to the language list overview!
  const isDrawerOpen = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("v6_he-button, button"))
    const closeBtn = btns.find(
      (b) => (b.textContent || "").trim() === "Close"
    ) as HTMLElement
    // Only click close if we are actually stuck inside an overlay/drawer or it's a mat dialog close button
    if (
      closeBtn &&
      (closeBtn.closest("mat-dialog-container") ||
        closeBtn.getAttribute("matdialogclose") ||
        document.querySelector("mat-dialog-container"))
    ) {
      closeBtn.scrollIntoView({ block: "center" })
      closeBtn.click()
      return true
    }
    return false
  })
  if (isDrawerOpen) {
    console.log(
      "Stuck inside a language drawer on startup; clicked Close to go back to listings list."
    )
    await delay(4000)
  }

  await ensureEdgeStoreListingsView(page)

  const edgeLocales = localeFilter
    ? Object.entries(localeMap).filter(([code]) => localeFilter.includes(code))
    : Object.entries(localeMap)

  for (const [localeCode, config] of edgeLocales) {
    console.log(`\n-------------------------------------------------------`)
    console.log(
      `🌐 PROCESSING LOCALE: [${localeCode.toUpperCase()}] - ${config.displayName}`
    )
    console.log(`-------------------------------------------------------`)

    if (!existsSync(config.descPath)) {
      console.log(
        `⚠️ Description file missing at: ${config.descPath}. Skipping...`
      )
      continue
    }

    let descriptionText = readFileSync(config.descPath, "utf-8")

    // EDGE COMPLIANCE SANITIZATION:
    // Replace references to Chrome with generic terms to prevent Microsoft Store rejections.
    descriptionText = descriptionText
      .replace(/Google Chrome's/gi, "the browser's")
      .replace(/Google Chrome/gi, "the browser")
      .replace(/Chrome Web Store/gi, "Extension Store")
      .replace(/Chrome/gi, "browser")

    const currentUrl = page.url()
    if (
      !currentUrl.includes("/listings") ||
      currentUrl.includes("/listings/")
    ) {
      console.log("Navigating back to main listings overview...")
      await ensureEdgeStoreListingsView(page)
    }

    console.log(`Clicking "Edit details" button for ${config.subStr}...`)
    const editClicked = await page.evaluate((subStr) => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const btn = buttons.find((b) => {
        const label = b.getAttribute("aria-label") || ""
        return label.includes(`Edit ${subStr} language`)
      }) as HTMLElement
      if (btn) {
        btn.scrollIntoView({ block: "center" })
        btn.click()
        return true
      }
      return false
    }, config.subStr)

    if (!editClicked) {
      console.log(
        `⚠️ Could not find "Edit details" button for ${config.subStr}. Skipping...`
      )
      continue
    }

    console.log("Waiting for listing form to load...")
    await page.waitForSelector('textarea[aria-label^="Description"]', {
      timeout: 15000
    })

    if (uploadDescription) {
      console.log("Updating description text...")
      const descTextarea = await page.$('textarea[aria-label^="Description"]')
      if (descTextarea) {
        await descTextarea.focus()
        await page.keyboard.down("Control")
        await page.keyboard.press("KeyA")
        await page.keyboard.up("Control")
        await page.keyboard.press("Backspace")

        console.log(
          `Typing description (${descriptionText.length} characters)...`
        )
        await page.evaluate(
          (el, text) => {
            ;(el as HTMLTextAreaElement).value = text
            el.dispatchEvent(new Event("input", { bubbles: true }))
            el.dispatchEvent(new Event("change", { bubbles: true }))
          },
          descTextarea,
          descriptionText
        )
        await delay(1000)
      } else {
        console.log("❌ Could not locate the description input field.")
      }
    } else {
      console.log("⏭️ Skipping description update (--description false)")
    }

    if (uploadScreenshots) {
      if (existsSync(config.screenshotDir)) {
        const allScreens = readdirSync(config.screenshotDir)
          .filter((f) => f.endsWith(".png") || f.endsWith(".jpg"))
          .sort()

        const pngScreens = allScreens.filter((f) => f.endsWith(".png"))
        const targetScreens = (pngScreens.length > 0 ? pngScreens : allScreens)
          .filter((f) =>
            [
              "screenshot-1.png",
              "screenshot-1.jpg",
              "screenshot-2.png",
              "screenshot-2.jpg",
              "screenshot-3.png",
              "screenshot-3.jpg",
              "screenshot-4.png",
              "screenshot-4.jpg",
              "screenshot-5.png",
              "screenshot-5.jpg",
              "screenshot-6.png",
              "screenshot-6.jpg"
            ].some((p) => f.endsWith(p))
          )
          .map((f) => path.join(config.screenshotDir, f))
          .slice(0, 6)

        if (targetScreens.length > 0) {
          await clearEdgeExistingImages(page, "Screenshot/s")

          console.log(`Locating "Screenshot/s" upload section...`)
          console.log(
            `Uploading ${targetScreens.length} screenshot files sequentially with upload verification...`
          )
          for (let i = 0; i < targetScreens.length; i++) {
            const screenPath = targetScreens[i]

            const container = await getEdgeSectionContainer(
              page,
              "Screenshot/s"
            )
            const startCount = container
              ? await page.evaluate((el) => {
                  const buttons = Array.from(
                    el.querySelectorAll("button, [role='button']")
                  )
                  return buttons.filter((btn) => {
                    const label = btn.getAttribute("aria-label") || ""
                    const text = (btn.textContent || "").trim().toLowerCase()
                    return (
                      label.toLowerCase() === "delete" ||
                      label.toLowerCase().includes("delete") ||
                      text === "delete" ||
                      text.includes("delete")
                    )
                  }).length
                }, container)
              : 0

            console.log(
              `Uploading screenshot ${i + 1}/${targetScreens.length}: ${path.basename(screenPath)}...`
            )

            const screenshotInput = await getEdgeFileInputForSection(
              page,
              "Screenshot/s"
            )
            if (screenshotInput) {
              await screenshotInput.uploadFile(screenPath)

              console.log(
                `Waiting for upload to complete and render (start count: ${startCount})...`
              )
              let uploaded = false
              for (let attempt = 0; attempt < 30; attempt++) {
                await delay(1000)
                const freshContainer = await getEdgeSectionContainer(
                  page,
                  "Screenshot/s"
                )
                const currentCount = freshContainer
                  ? await page.evaluate((el) => {
                      const buttons = Array.from(
                        el.querySelectorAll("button, [role='button']")
                      )
                      return buttons.filter((btn) => {
                        const label = btn.getAttribute("aria-label") || ""
                        const text = (btn.textContent || "")
                          .trim()
                          .toLowerCase()
                        return (
                          label.toLowerCase() === "delete" ||
                          label.toLowerCase().includes("delete") ||
                          text === "delete" ||
                          text.includes("delete")
                        )
                      }).length
                    }, freshContainer)
                  : 0

                if (currentCount > startCount) {
                  console.log(
                    `✅ Upload of ${path.basename(screenPath)} completed successfully (current count: ${currentCount})!`
                  )
                  uploaded = true
                  break
                }
              }
              if (!uploaded) {
                console.log(
                  `⚠️ Warning: Upload of ${path.basename(screenPath)} did not confirm within 30s. Moving on...`
                )
              }
              await delay(2000)
            } else {
              console.log(
                `⚠️ Screenshot/s input element not found for ${path.basename(screenPath)}.`
              )
            }
          }

          // Add localized captions/titles to each uploaded screenshot
          await setScreenshotCaptions(page, localeCode)
        }
      }
    } else {
      console.log("⏭️ Skipping screenshots upload (--screenshots false)")
    }

    console.log("\n⚙️ Uploading Extension Logo...")

    const iconFile = path.join(outDir, "store-icon-128.png")
    if (existsSync(iconFile)) {
      await clearEdgeExistingImages(page, "Extension logo")
      await delay(2500) // Delay to ensure DOM settled after delete click confirm!
      const iconInput = await getEdgeFileInputForSection(page, "Extension logo")
      if (iconInput) {
        console.log("Uploading Extension logo...")
        await iconInput.uploadFile(iconFile)
        await delay(6000)
      }
    }

    console.log(
      `\n⚙️ Uploading Promotional Banners for ${config.displayName}...`
    )

    let smallPromoFile = path.join(
      outDir,
      "localized",
      localeCode,
      "small-promo-440x280.png"
    )
    if (!existsSync(smallPromoFile)) {
      smallPromoFile = path.join(
        outDir,
        "localized",
        localeCode,
        "small-promo-440x280.jpg"
      )
    }
    if (!existsSync(smallPromoFile)) {
      smallPromoFile = path.join(outDir, "global", "small-promo-440x280.png")
    }
    if (!existsSync(smallPromoFile)) {
      smallPromoFile = path.join(outDir, "global", "small-promo-440x280.jpg")
    }

    if (existsSync(smallPromoFile)) {
      await clearEdgeExistingImages(page, "Small promotional tile")
      await delay(2500)
      const smallPromoInput = await getEdgeFileInputForSection(
        page,
        "Small promotional tile"
      )
      if (smallPromoInput) {
        console.log("Uploading Small promotional tile...")
        await smallPromoInput.uploadFile(smallPromoFile)
        await delay(6000)
      }
    }

    let marqueePromoFile = path.join(
      outDir,
      "localized",
      localeCode,
      "marquee-promo-1400x560.png"
    )
    if (!existsSync(marqueePromoFile)) {
      marqueePromoFile = path.join(
        outDir,
        "localized",
        localeCode,
        "marquee-promo-1400x560.jpg"
      )
    }
    if (!existsSync(marqueePromoFile)) {
      marqueePromoFile = path.join(
        outDir,
        "global",
        "marquee-promo-1400x560.png"
      )
    }
    if (!existsSync(marqueePromoFile)) {
      marqueePromoFile = path.join(
        outDir,
        "global",
        "marquee-promo-1400x560.jpg"
      )
    }

    if (existsSync(marqueePromoFile)) {
      await clearEdgeExistingImages(page, "Large promotional tile")
      await delay(2500)
      const marqueePromoInput = await getEdgeFileInputForSection(
        page,
        "Large promotional tile"
      )
      if (marqueePromoInput) {
        console.log("Uploading Large promotional tile...")
        await marqueePromoInput.uploadFile(marqueePromoFile)
        await delay(6000)
      }
    }

    // Upload search terms!
    const terms = edgeSearchTerms[localeCode] || edgeSearchTerms.en
    await uploadEdgeSearchTerms(page, terms)

    console.log("Clicking 'Save draft'...")
    const saveBtnClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("v6_he-button, button"))
      const btn = btns.find(
        (b) => (b.textContent || "").trim() === "Save draft"
      ) as HTMLElement
      if (btn) {
        btn.scrollIntoView({ block: "center" })
        btn.click()
        return true
      }
      return false
    })

    if (saveBtnClicked) {
      console.log("Waiting for draft to save...")
      await delay(5000)
    }

    console.log("Clicking 'Close'...")
    const closeBtnClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("v6_he-button, button"))
      const btn = btns.find(
        (b) => (b.textContent || "").trim() === "Close"
      ) as HTMLElement
      if (btn) {
        btn.scrollIntoView({ block: "center" })
        btn.click()
        return true
      }
      return false
    })

    if (closeBtnClicked) {
      console.log("Returning to Listings overview page...")
      await delay(4000)
    }

    console.log(`✅ Completed actions for locale: ${config.displayName}`)
  }

  console.log("\n=======================================================")
  console.log("🎉 ALL MICROSOFT EDGE ASSETS UPLOADED AND SAVED!")
  console.log("=======================================================")
  console.log(
    "Please review the changes on the browser tab, make sure they are correct,"
  )
  console.log("and click 'Publish' in the partner center dashboard.")
  console.log("Disconnecting from browser automation...")
  await browser.disconnect()
}

main().catch(console.error)
