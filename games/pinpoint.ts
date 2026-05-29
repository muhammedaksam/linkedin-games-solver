import { askAI } from "~games/ai"
import { BaseSolver } from "~games/base"
import {
  fetchRegistry,
  findPinpointAnswer,
  type PinpointPuzzle
} from "~games/registry"

export class PinpointSolver extends BaseSolver {
  readonly name = "Pinpoint"

  detect(): boolean {
    const url = new URL(window.location.href)
    return (
      url.pathname.includes("/pinpoint") ||
      !!this.$(".pinpoint__container") ||
      !!this.$(".pinpoint__wrapper") ||
      !!this.$(".pinpoint__board")
    )
  }

  async solve(): Promise<void> {
    console.log("[Pinpoint] Starting progressive Pinpoint solver...")

    let registry: Record<string, PinpointPuzzle> = {}
    let triedRegistryGuess = false

    try {
      console.log("[Pinpoint] Loading daily answers registry...")
      registry = await fetchRegistry("pinpoint")
      console.log(
        `[Pinpoint] Registry loaded successfully. Entries: ${Object.keys(registry).length}`
      )
    } catch (err) {
      console.warn(
        "[Pinpoint] Failed to load registry, falling back to 100% LLM mode:",
        err
      )
    }

    for (let i = 0; i < 5; i++) {
      // 1. Gather all currently revealed/flipped clues
      const clues: string[] = []
      for (let j = 0; j < 5; j++) {
        const card = this.$(
          `.pinpoint__card__container.pinpoint__card__${j}, .pinpoint__card__${j}`
        )
        if (card?.classList.contains("flipped")) {
          const clueTextEl = card.querySelector(
            ".pinpoint__card--clue span, .pinpoint__card--clue"
          )
          const clueText = clueTextEl
            ? clueTextEl.textContent?.trim() || ""
            : ""
          if (clueText) {
            clues.push(clueText)
          }
        }
      }

      console.log(
        `[Pinpoint] Currently revealed clues (${clues.length}):`,
        clues
      )

      if (clues.length === 0) {
        // If somehow no cards are revealed, reveal the first card (index 0)
        const firstCard = this.$(
          ".pinpoint__card__container.pinpoint__card__0, .pinpoint__card__0"
        )
        if (firstCard) {
          console.log("[Pinpoint] No clues revealed. Revealing first card...")
          this.click(firstCard)
          await this.sleep(600)
          continue // Restart loop to read the newly revealed clue
        } else {
          throw new Error("Could not find first card container.")
        }
      }

      let category: string
      const matchedPuzzle = triedRegistryGuess
        ? null
        : findPinpointAnswer(registry, clues)

      if (matchedPuzzle) {
        console.log(
          `[Pinpoint] Found pre-solved category in registry: "${matchedPuzzle.category}"`
        )
        category = matchedPuzzle.category
        triedRegistryGuess = true
      } else {
        // 2. Ask Gemini to guess the common category based on current clues
        console.log(
          `[Pinpoint] Querying Gemini with ${clues.length} clue(s)...`
        )
        const prompt = `
You are playing the LinkedIn game "Pinpoint".
We have a set of clues that belong to a single common category.
Our goal is to guess the exact category using as few clues as possible.
Currently revealed clues:
${clues.map((c, idx) => `${idx + 1}. ${c}`).join("\n")}

Identify the precise, common category that connects all of these clues.
Return ONLY the single category name (a single word or very short phrase, e.g. "Fruit", "Planets", "Brands of cars", "Things that are green").
Do not include any quotes, periods, punctuation, or explanations.
`

        const rawCategory = await askAI(prompt)
        category = this.cleanCategoryGuess(rawCategory)
        console.log(
          `[Pinpoint] Gemini category guess: "${category}" (raw: "${rawCategory.trim()}")`
        )
      }

      if (!category) {
        console.warn(
          "[Pinpoint] Gemini returned an empty guess, proceeding to reveal next clue."
        )
      } else {
        // 3. Type and submit the guess
        const input = this.$(".pinpoint__input") as HTMLInputElement
        if (!input) {
          console.log(
            "[Pinpoint] Guess input not found. Game may have already ended!"
          )
          break
        }

        console.log(`[Pinpoint] Submitting guess: "${category}"`)
        input.focus()
        this.setReactInputValue(input, category)
        await this.sleep(150)

        const form = this.$(".pinpoint__form")
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true }))
        } else {
          input.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              bubbles: true
            })
          )
        }

        // Wait for the guess to be processed and board transition
        await this.sleep(1500)
      }

      // 4. Check if the game is over
      const inputElAfter = this.$(".pinpoint__input") as HTMLInputElement
      const shareFooter = this.$(".games-share-footer")
      const wrapperEnd = this.$(".pinpoint__wrapper__end")

      if (!inputElAfter || shareFooter || wrapperEnd || inputElAfter.disabled) {
        console.log("[Pinpoint] Victory! Guess was correct and game has ended!")
        break
      }

      console.log("[Pinpoint] Guess was incorrect.")

      // 5. Reveal the next clue
      if (i < 4) {
        const nextCard = this.$(
          `.pinpoint__card__container.pinpoint__card__${i + 1}, .pinpoint__card__${i + 1}`
        )
        if (nextCard && !nextCard.classList.contains("flipped")) {
          console.log(`[Pinpoint] Revealing next Clue ${i + 2}...`)
          this.click(nextCard)
          await this.sleep(600) // Wait for flip transition
        }
      }
    }

    console.log("[Pinpoint] Solver loop complete!")
  }

  /**
   * Sanitizes the category returned by the LLM by stripping surrounding quotes,
   * markdown wrappers, trailing punctuation, and explanatory prefixes.
   */
  private cleanCategoryGuess(text: string): string {
    let clean = text.trim()

    // 1. Remove markdown formatting like ```text or backticks
    if (clean.includes("```")) {
      const match = clean.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```/)
      if (match?.[1]) {
        clean = match[1].trim()
      } else {
        clean = clean.replace(/```/g, "").trim()
      }
    }
    clean = clean.replace(/`/g, "").trim()

    // 2. Remove surrounding quotes (straight & smart double/single quotes)
    const quoteRegex = /^[“"‘'“‘”"’'”]+|["'”’]+$/g
    clean = clean.replace(quoteRegex, "").trim()

    // 3. Remove common introductory prefixes
    const prefixes = [
      /^(?:the\s+)?category\s+is\s*:\s*/i,
      /^connecting\s+category\s*:\s*/i,
      /^common\s+category\s*:\s*/i,
      /^guess\s*:\s*/i,
      /^answer\s*:\s*/i,
      /^theme\s*:\s*/i
    ]
    for (const prefix of prefixes) {
      if (prefix.test(clean)) {
        clean = clean.replace(prefix, "").trim()
        break
      }
    }

    // 4. Remove trailing punctuation
    clean = clean.replace(/[.!?]+$/, "").trim()

    // 5. Remove any leftover surrounding quotes again after prefix removal
    clean = clean.replace(quoteRegex, "").trim()

    return clean
  }
}
