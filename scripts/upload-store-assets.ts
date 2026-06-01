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

const CONSOLE_ID = process.env.CWS_CONSOLE_ID
const ITEM_ID = process.env.CWS_ITEM_ID

if (!CONSOLE_ID || !ITEM_ID) {
  console.error(
    "❌ Missing CWS_CONSOLE_ID or CWS_ITEM_ID in environment variables"
  )
  process.exit(1)
}

const DEV_CONSOLE_URL = `https://chrome.google.com/webstore/devconsole/${CONSOLE_ID}/${ITEM_ID}/edit?hl=en`

interface LocaleConfig {
  displayName: string
  subStr: string // Matching dropdown selection text
  descPath: string
  screenshotDir: string
}

const localeMap: Record<string, LocaleConfig> = {
  en: {
    displayName: "English (Default)",
    subStr: "English",
    descPath: path.join(outDir, "localized", "en", "description.md"),
    screenshotDir: path.join(outDir, "localized", "en", "screenshots")
  },
  tr: {
    displayName: "Turkish",
    subStr: "Turkish",
    descPath: path.join(outDir, "localized", "tr", "description.md"),
    screenshotDir: path.join(outDir, "localized", "tr", "screenshots")
  },
  es: {
    displayName: "Spanish",
    subStr: "Spanish",
    descPath: path.join(outDir, "localized", "es", "description.md"),
    screenshotDir: path.join(outDir, "localized", "es", "screenshots")
  },
  fr: {
    displayName: "French",
    subStr: "French",
    descPath: path.join(outDir, "localized", "fr", "description.md"),
    screenshotDir: path.join(outDir, "localized", "fr", "screenshots")
  },
  pt_BR: {
    displayName: "Portuguese (Brazil)",
    subStr: "Portuguese (Brazil)",
    descPath: path.join(outDir, "localized", "pt_BR", "description.md"),
    screenshotDir: path.join(outDir, "localized", "pt_BR", "screenshots")
  },
  pt_PT: {
    displayName: "Portuguese (Portugal)",
    subStr: "Portuguese (Portugal)",
    descPath: path.join(outDir, "localized", "pt_PT", "description.md"),
    screenshotDir: path.join(outDir, "localized", "pt_PT", "screenshots")
  },
  de: {
    displayName: "German",
    subStr: "German",
    descPath: path.join(outDir, "localized", "de", "description.md"),
    screenshotDir: path.join(outDir, "localized", "de", "screenshots")
  },
  zh_CN: {
    displayName: "Chinese (China)",
    subStr: "Chinese (China)",
    descPath: path.join(outDir, "localized", "zh_CN", "description.md"),
    screenshotDir: path.join(outDir, "localized", "zh_CN", "screenshots")
  },
  zh_TW: {
    displayName: "Chinese (Taiwan)",
    subStr: "Chinese (Taiwan)",
    descPath: path.join(outDir, "localized", "zh_TW", "description.md"),
    screenshotDir: path.join(outDir, "localized", "zh_TW", "screenshots")
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
    console.error(
      "Please launch Chrome with the debugging flag above and try again."
    )
    process.exit(1)
  }

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

  for (const [localeCode, config] of Object.entries(localeMap)) {
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
    console.log("Updating listing description text...")
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
    } else {
      console.log("❌ Could not locate the description input field.")
    }

    // Step 3: Upload Localized Screenshots
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

main().catch(console.error)
