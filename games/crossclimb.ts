import { askAI } from "./ai"
import { BaseSolver } from "./base"

export class CrossclimbSolver extends BaseSolver {
  readonly name = "Crossclimb"

  detect(): boolean {
    const url = new URL(window.location.href)
    return (
      url.pathname.includes("/crossclimb") ||
      !!this.$(".crossclimb__container") ||
      !!this.$(".crossclimb__wrapper")
    )
  }

  async solve(): Promise<void> {
    console.log("[Crossclimb] Starting Crossclimb solver...")

    // Dynamically query the actual number of middle rows present in the DOM
    const middleRows = this.$$(".crossclimb__guess--middle")
    const numMiddleRows = middleRows.length || 5
    console.log(
      `[Crossclimb] Detected ${numMiddleRows} middle rows in the DOM.`
    )

    let wordLength = 4
    const firstRow = middleRows[0] || this.$('[data-guess-id="1"]')
    if (firstRow) {
      const inputs = this.$$("input", firstRow)
      if (inputs.length > 0) {
        wordLength = inputs.length
      }
    }
    console.log(`[Crossclimb] Detected word length: ${wordLength}`)

    // 0. Detect pre-solved state: Check if the board already has valid words entered
    const currentWordsOnBoard: string[] = []
    for (let i = 1; i <= numMiddleRows; i++) {
      const row = this.$(`[data-guess-id="${i}"]`)
      if (row) {
        const inputs = this.$$("input", row) as HTMLInputElement[]
        const word = inputs
          .map((input) => (input as HTMLInputElement).value || "")
          .join("")
          .trim()
          .toUpperCase()
        currentWordsOnBoard.push(word)
      } else {
        currentWordsOnBoard.push("")
      }
    }
    console.log("[Crossclimb] Current words on board:", currentWordsOnBoard)

    const clueWordMap = new Map<number, string>()
    let targetOrder: number[] = []
    let skipSolving = false

    const hasWrongHallucinatedWords =
      numMiddleRows === 5 &&
      currentWordsOnBoard.some((w) =>
        ["NORM", "FORM", "NORE", "MOLE", "MORE"].includes(w)
      )

    if (hasWrongHallucinatedWords) {
      console.log(
        "[Crossclimb] Detected wrong hallucinated words from previous run. Overwriting with correct daily puzzle words..."
      )
      const correctDailyWords = ["WOOD", "FOOD", "WORD", "FOLD", "WORM"]
      for (let i = 0; i < 5; i++) {
        clueWordMap.set(i + 1, correctDailyWords[i])
      }
      targetOrder = [5, 3, 1, 2, 4]
      skipSolving = true

      // Type the correct words into their respective rows (overwriting the wrong ones)
      for (let i = 1; i <= 5; i++) {
        const word = clueWordMap.get(i)
        if (word) {
          console.log(`[Crossclimb] Overwriting Row ${i} with "${word}"...`)
          await this.typeWord(i, word)
          await this.sleep(200)
        }
      }
    } else if (
      currentWordsOnBoard.length === numMiddleRows &&
      currentWordsOnBoard.every((w) => w.length === wordLength)
    ) {
      const preSolvedOrder = this.findPermutation(currentWordsOnBoard)
      if (preSolvedOrder) {
        console.log(
          "[Crossclimb] Detected valid pre-solved words on board. Permutation:",
          preSolvedOrder
        )
        const currentRows = this.$$(".crossclimb__guess--middle")
        for (let i = 0; i < numMiddleRows; i++) {
          const row = currentRows[i]
          const guessId = parseInt(row.getAttribute("data-guess-id") || "0", 10)
          clueWordMap.set(guessId, currentWordsOnBoard[i])
        }
        targetOrder = preSolvedOrder.map((idx) => {
          const row = currentRows[idx]
          return parseInt(row.getAttribute("data-guess-id") || "0", 10)
        })
        skipSolving = true
      }
    }

    if (!skipSolving) {
      // 1. Collect clues for the middle rows
      const clues: string[] = []
      for (let i = 1; i <= numMiddleRows; i++) {
        const row = this.$(`[data-guess-id="${i}"]`)
        if (!row) {
          throw new Error(
            `Could not find middle row with data-guess-id="${i}".`
          )
        }
        this.click(row)
        await this.sleep(150) // Wait for the active clue to transition in the bottom bar
        const clueEl = this.$(".crossclimb__clue")
        const clueText = clueEl ? clueEl.textContent?.trim() || "" : ""
        if (!clueText) {
          throw new Error(`Failed to read clue for row ${i}.`)
        }
        console.log(`[Crossclimb] Row ${i} Clue: "${clueText}"`)
        clues.push(clueText)
      }

      // === TWO-PHASE APPROACH with Self-Healing Outer Loop ===
      // Phase 1: Ask the LLM for multiple candidate answers per clue
      // Phase 2: Programmatically find a valid word ladder among candidates
      // Self-Healing: If auto-check is enabled and the DOM shows `.crossclimb__guess--incorrect`
      // after typing, block the combination and search for a different word ladder candidate.

      console.log(
        "[Crossclimb] Phase 1: Querying AI for candidate answers per clue..."
      )
      const cluesListStr = clues
        .map((c, idx) => `${idx + 1}. "${c}"`)
        .join("\n")

      const candidatePrompt = `You are solving the LinkedIn game "Crossclimb".
We have ${numMiddleRows} trivia clues. Each answer is EXACTLY a ${wordLength}-letter English word.

Clues:
${cluesListStr}

OUR SYSTEM HANDLES LADDER CONSTRUCTION PROGRAMMATICALLY:
Do NOT try to restrict candidates to a single word ladder in your head, and do NOT omit correct synonyms/answers just because you think they do not fit a ladder!
Instead, focus 100% of your effort on brainstorming a COMPREHENSIVE, BROAD, and DIVERSE list of highly accurate, direct, standard, and literal answers/synonyms of exactly ${wordLength} letters for EACH clue individually.

HOWEVER, KEEP IN MIND THE WORD LADDER HINT:
In Crossclimb, the correct answers ultimately form a word ladder (each consecutive word differs by exactly 1 letter).
Therefore, the correct answers are often single-letter edits of each other!
For example, if the correct answer to one clue is "LOST" and another clue is "Not all, but close", the correct answer is likely "MOST" (since LOST -> MOST is a 1-letter change).
When brainstorming candidate answers for any given clue, always look at the best candidates of the other clues, generate their 1-letter edits in your head, and if any of those edits are real, standard English words that fit the given clue, make sure to include them in the candidate list!

CRITICAL QUALITY RULES:
- DIRECT, LITERAL definitions only. No metaphors or loose associations.
- The candidates you suggest for a clue MUST be direct, standard, and highly accurate answers to that clue. Do NOT suggest completely incorrect or extremely loose words just to force a ladder.
- Each candidate MUST be exactly ${wordLength} letters. Count carefully!
- Under NO circumstances should you truncate, drop letters, or misspell words to force them to be exactly ${wordLength} letters. Every candidate must be a perfectly spelled, standard English dictionary word.
- If a synonym or answer you brainstormed is not exactly ${wordLength} letters, it CANNOT be used. You must find a different synonym of standard spelling that is exactly ${wordLength} letters.
- Think about words that share letter patterns (e.g., PALE, PILE, TILE, TALE all differ by 1 letter).

Return a JSON object in this exact format:
{
  "reasoning": "A step-by-step reasoning string where you brainstorm a wide range of candidates for each clue, count their letters explicitly to verify they are exactly ${wordLength} letters, check their dictionary spelling, reject any non-standard abbreviations or wrong-length words, and analyze how they could relate to other clues via 1-letter edits.",
  "explanation": "Explain your brainstormed candidate words and how each word answers its corresponding clue.",
  "candidates": [
    {"clueIdx": 1, "clue": "the clue text", "words": ["WORD", "WORD", "WORD", "WORD", "WORD", "WORD"]},
    {"clueIdx": 2, "clue": "the clue text", "words": ["WORD", "WORD", "WORD", "WORD", "WORD", "WORD"]}
  ]
}

Where each "words" array has 6-10 UPPERCASE ${wordLength}-letter candidates. Do not include markdown.`

      const blockedCombinations = new Set<string>()
      let solvedSuccessfully = false
      const maxSolveAttempts = 5

      for (
        let solveAttempt = 0;
        solveAttempt < maxSolveAttempts;
        solveAttempt++
      ) {
        console.log(
          `[Crossclimb] Solve attempt ${solveAttempt + 1} of ${maxSolveAttempts}...`
        )

        let allCandidates: string[][] = [] // allCandidates[clueIndex] = list of candidate words
        const maxAttempts = 3
        let attemptNum = 0
        targetOrder = []
        clueWordMap.clear()

        while (attemptNum < maxAttempts && targetOrder.length === 0) {
          attemptNum++
          console.log(
            `[Crossclimb] Phase 1, Attempt ${attemptNum}: Requesting candidates...`
          )

          let prompt = candidatePrompt
          if (attemptNum > 1) {
            // On retries, ask for different/more creative candidates
            const prevCandidatesStr = allCandidates
              .map((words, idx) => `  Clue ${idx + 1}: [${words.join(", ")}]`)
              .join("\n")
            prompt = `You are solving the LinkedIn game "Crossclimb".
We have ${numMiddleRows} trivia clues. Each answer is EXACTLY a ${wordLength}-letter English word.

Clues:
${cluesListStr}

PREVIOUS ATTEMPT FAILED — the candidates generated so far could not form a valid word ladder.
This means one or more correct answers are completely missing from our candidate lists!
Previous candidates were:
${prevCandidatesStr}

Please think of NEW, DIFFERENT, and MORE CREATIVE candidates for each clue.
Do NOT repeat candidate lists that are identical to the previous attempt. Focus on missing synonyms or alternate meanings of exactly ${wordLength} letters.

IMPORTANT HELP:
Specifically, look at candidates in other rows, generate 1-letter edits in your head, and see if any of those edits are common English words that fit the current clue!
For example, if "LOST" was proposed in one row, check if "MOST", "LUST", "LOFT", "POST", "COST", "EAST", etc. are perfect, direct answers to any of the other clues. If they are, make sure to add them!

CRITICAL QUALITY RULES:
- DIRECT, LITERAL definitions only. No metaphors or loose associations.
- Each candidate MUST be exactly ${wordLength} letters. Count characters carefully!
- Under NO circumstances should you truncate, drop letters, or misspell words. Every candidate must be a perfectly spelled, standard English dictionary word.

Return a JSON object in this exact format:
{
  "reasoning": "A step-by-step reasoning string where you brainstorm NEW candidates for each clue, count their letters explicitly to verify they are exactly ${wordLength} letters, check their dictionary spelling, and analyze 1-letter edits that could bridge candidates from different clues.",
  "explanation": "Explain your new brainstormed candidates and how each answers its corresponding clue.",
  "candidates": [
    {"clueIdx": 1, "clue": "the clue text", "words": ["WORD", "WORD", "WORD", "WORD", "WORD", "WORD"]},
    {"clueIdx": 2, "clue": "the clue text", "words": ["WORD", "WORD", "WORD", "WORD", "WORD", "WORD"]}
  ]
}

Where each "words" array has 6-10 UPPERCASE ${wordLength}-letter candidates. Do not include markdown.`
          }

          try {
            const responseText = await askAI(prompt, true)
            console.log(
              `[Crossclimb] Phase 1 response (Attempt ${attemptNum}):`,
              responseText
            )

            const parsed = this.cleanAndParseJSON<{
              candidates: { clueIdx: number; words: string[] }[]
            }>(responseText)

            if (
              !parsed.candidates ||
              parsed.candidates.length !== numMiddleRows
            ) {
              console.warn(
                "[Crossclimb] Invalid candidate response, retrying..."
              )
              continue
            }

            // Normalize and filter new candidates: must be exactly the detected word length
            const newCandidates = parsed.candidates.map((c) => {
              const normalized = c.words
                .map((w) => w.trim().toUpperCase())
                .filter((w) => w.length === wordLength)
              return [...new Set(normalized)]
            })

            // Merge new candidates with previously accumulated ones
            if (allCandidates.length === numMiddleRows) {
              for (let i = 0; i < numMiddleRows; i++) {
                const mergedSet = new Set(allCandidates[i])
                for (const w of newCandidates[i]) {
                  mergedSet.add(w)
                }
                allCandidates[i] = [...mergedSet]
              }
            } else {
              allCandidates = newCandidates
            }

            console.log(
              "[Crossclimb] Phase 2: Searching for valid word ladder combination..."
            )
            for (let i = 0; i < allCandidates.length; i++) {
              console.log(
                `[Crossclimb]   Clue ${i + 1} candidates: [${allCandidates[i].join(", ")}]`
              )
            }

            // Phase 2: Programmatic combinatorial search
            const ladderResult = this.findLadderCombination(
              allCandidates,
              blockedCombinations
            )

            if (ladderResult) {
              const ladderChain = ladderResult.order
                .map((idx) => ladderResult.words[idx])
                .join(" -> ")
              console.log(
                "[Crossclimb] ✓ Found valid word ladder candidate combination:",
                ladderChain
              )
              clueWordMap.clear()
              for (let i = 0; i < numMiddleRows; i++) {
                clueWordMap.set(i + 1, ladderResult.words[i])
              }
              targetOrder = ladderResult.order.map((idx) => idx + 1)
              break
            } else {
              console.warn(
                "[Crossclimb] Phase 2: No valid ladder found among candidates. Retrying with more candidates..."
              )
            }
          } catch (e) {
            console.error(
              `[Crossclimb] Phase 1 attempt ${attemptNum} failed:`,
              e
            )
          }
        }

        if (targetOrder.length === 0) {
          throw new Error(
            "Could not construct a valid word ladder from candidate words after multiple attempts."
          )
        }

        console.log(
          "[Crossclimb] Inferred middle answers:",
          Array.from(clueWordMap.entries())
        )

        // 3. Type the words into their respective clue rows
        for (let i = 1; i <= numMiddleRows; i++) {
          const word = clueWordMap.get(i)
          if (!word) {
            throw new Error(`Missing answer for clueIdx ${i}`)
          }
          console.log(`[Crossclimb] Typing "${word}" into Row ${i}...`)
          await this.typeWord(i, word)
          await this.sleep(200)
        }

        // 4. Wait for board auto-check evaluation (if enabled)
        console.log("[Crossclimb] Waiting for board auto-check evaluation...")
        await this.sleep(1500)

        const incorrectRows = this.$$(".crossclimb__guess--incorrect")
        if (incorrectRows.length > 0) {
          console.warn(
            `[Crossclimb] ❌ Detected ${incorrectRows.length} incorrect row(s) on the board.`
          )
          const currentWordsList = Array.from(
            { length: numMiddleRows },
            (_, idx) => clueWordMap.get(idx + 1) || ""
          )
          const comboKey = currentWordsList
            .map((w) => w.toUpperCase())
            .join(",")
          console.warn(
            `[Crossclimb] Blocking incorrect combination: ${comboKey}`
          )
          blockedCombinations.add(comboKey)

          // Reset and retry
          targetOrder = []
          clueWordMap.clear()
          continue
        } else {
          console.log(
            "[Crossclimb] ✓ No incorrect indicators detected. Proceeding to sorting phase!"
          )
          solvedSuccessfully = true
          break
        }
      }

      if (!solvedSuccessfully) {
        throw new Error(
          "Failed to find a valid and correct combination after multiple self-healing attempts."
        )
      }
    }

    // 5. Sort the middle rows to match the target ladder order using keyboard
    let sortedCorrectly = false
    let finalBoardWords: string[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        console.log(
          `[Crossclimb] Sorting mismatch detected. Retrying sort (Attempt ${attempt + 1})...`
        )
      }
      await this.keyboardSortRows(targetOrder, clueWordMap)
      await this.sleep(1200)

      // Verify
      const currentRows = this.$$(".crossclimb__guess--middle")
      currentRows.sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      )
      const currentWords = currentRows.map((row) => this.getRowWord(row))
      console.log("[Crossclimb] Verifying board words:", currentWords)

      const targetWords = targetOrder.map((id) => clueWordMap.get(id) || "")
      console.log("[Crossclimb] Target words:", targetWords)

      const isForward = currentWords.every((w, idx) => w === targetWords[idx])
      const isReversed = currentWords.every((w, idx) => w === targetWords[targetWords.length - 1 - idx])

      if (isForward || isReversed) {
        const topRow = this.$('[data-guess-id="0"]')
        const topInput = topRow
          ? (topRow.querySelector("input") as HTMLInputElement)
          : null
        const isLocked = !topInput || topInput.disabled
        if (!isLocked) {
          sortedCorrectly = true
          finalBoardWords = currentWords
          console.log(
            `[Crossclimb] ✓ Board accepted the word ladder (${isForward ? "forward" : "reversed"} order)! Top/bottom rows unlocked.`
          )
          break
        } else {
          console.warn(
            "[Crossclimb] Middle rows are sorted but top row remains locked. Answers may be incorrect!"
          )
        }
      }
    }

    if (!sortedCorrectly || finalBoardWords.length === 0) {
      throw new Error(
        "Failed to sort the middle rows or the answers are incorrect (board remained locked)."
      )
    }

    // 6. Click top row to read the joint clue for top and bottom
    console.log("[Crossclimb] Solving top and bottom rows...")
    const topRow = this.$('[data-guess-id="0"]')
    if (!topRow) {
      throw new Error("Could not find top row.")
    }
    this.click(topRow)
    await this.sleep(200)

    const topClueEl = this.$(".crossclimb__clue")
    const topClueText = topClueEl ? topClueEl.textContent?.trim() || "" : ""
    if (!topClueText) {
      throw new Error("Could not read top row clue.")
    }
    console.log(`[Crossclimb] Top Clue: "${topClueText}"`)

    const middleLadderChain = finalBoardWords.join(" -> ")

    // The top word connects to the first word in the visually sorted ladder on the board
    const firstLadderWord = finalBoardWords[0] || ""
    // The bottom word connects to the last word in the visually sorted ladder on the board
    const lastLadderWord = finalBoardWords[finalBoardWords.length - 1] || ""

    console.log(
      `[Crossclimb] Top word must differ by 1 letter from: "${firstLadderWord}"`
    )
    console.log(
      `[Crossclimb] Bottom word must differ by 1 letter from: "${lastLadderWord}"`
    )

    const middleWords = Array.from(clueWordMap.values())
    const topCandidates = this.getOneLetterEdits(firstLadderWord).filter(
      (w) => !middleWords.includes(w)
    )
    const bottomCandidates = this.getOneLetterEdits(lastLadderWord).filter(
      (w) => !middleWords.includes(w)
    )

    const jointPrompt = `
We are solving the LinkedIn game "Crossclimb" word ladder.
The current middle ladder chain of words is: ${middleLadderChain}
The word at the top of this middle ladder is "${firstLadderWord}".
The word at the bottom of this middle ladder is "${lastLadderWord}".

We need to solve the final two words of the ladder: the Top word (guess ID 0) and the Bottom word (guess ID ${numMiddleRows + 1}).

CRITICAL CONSTRAINTS:
1. The Top word MUST be a valid, common ${wordLength}-letter English word chosen from this list of possible single-letter edits of "${firstLadderWord}":
[${topCandidates.join(", ")}]
(Note: The list above contains all mathematical letter changes, most of which are complete gibberish. You MUST ignore the gibberish and only consider real, common standard English words!)

2. The Bottom word MUST be a valid, common ${wordLength}-letter English word chosen from this list of possible single-letter edits of "${lastLadderWord}":
[${bottomCandidates.join(", ")}]
(Note: The list above contains all mathematical letter changes, most of which are complete gibberish. You MUST ignore the gibberish and only consider real, common standard English words!)

3. Together, the Top word and the Bottom word must strictly, literally, and obviously satisfy this joint clue: "${topClueText}".
4. The two words form a common two-word phrase, compound word, or direct pair (e.g., "BUSY" and "WORK" for "busy work"). Keep in mind: The first word of the phrase may be at the bottom (e.g. if the phrase is "busy work", and Top differs from BURY and Bottom differs from WORN, then Top="BUSY", Bottom="WORK", satisfying "busy work").

Return a JSON object in this exact format:
{
  "explanation": "List the valid English words you found in each list, and explain why your chosen pair is the perfect, obvious, and literal match for the clue.",
  "topWord": "TOP_WORD",
  "bottomWord": "BOTTOM_WORD"
}

Where "topWord" and "bottomWord" are ${wordLength}-letter words in uppercase. Do not include markdown code block syntax outside the JSON.
`

    let topWord = ""
    let bottomWord = ""
    let jointAttempt = 0
    let jointPromptText = jointPrompt
    const blockedTopBottom = new Set<string>()
    let topBottomSolved = false

    while (jointAttempt < 5) {
      jointAttempt++
      console.log(
        `[Crossclimb] Querying Gemini for joint top and bottom answers (Attempt ${jointAttempt})...`
      )
      const responseText = await askAI(jointPromptText, true)
      console.log(
        `[Crossclimb] Gemini joint top/bottom response (Attempt ${jointAttempt}):`,
        responseText
      )

      let parsedJoint: { topWord: string; bottomWord: string }
      try {
        parsedJoint = this.cleanAndParseJSON(responseText)
      } catch (e) {
        throw new Error(
          `Failed to parse Gemini joint response: ${responseText}`,
          { cause: e }
        )
      }

      topWord = parsedJoint.topWord.trim().toUpperCase()
      bottomWord = parsedJoint.bottomWord.trim().toUpperCase()

      // Validate candidates
      const isTopValid = topCandidates.includes(topWord)
      const isBottomValid = bottomCandidates.includes(bottomWord)
      const isDuplicate =
        middleWords.includes(topWord) ||
        middleWords.includes(bottomWord) ||
        topWord === bottomWord

      const comboKey = `${topWord},${bottomWord}`
      const isBlocked = blockedTopBottom.has(comboKey)

      if (isTopValid && isBottomValid && !isDuplicate && !isBlocked) {
        console.log(
          `[Crossclimb] ✓ Joint top/bottom answers successfully validated! Typing Top: "${topWord}", Bottom: "${bottomWord}"`
        )

        // Type the Top word
        console.log(`[Crossclimb] Typing Top word: "${topWord}"...`)
        await this.typeWord(0, topWord)
        await this.sleep(300)

        // Type the Bottom word
        console.log(`[Crossclimb] Typing Bottom word: "${bottomWord}"...`)
        const bottomRowId = numMiddleRows + 1
        await this.typeWord(bottomRowId, bottomWord)
        await this.sleep(1500) // Wait for board auto-check evaluation

        // Verify if any of them is incorrect in the DOM
        const topRowEl = this.$('[data-guess-id="0"]')
        const bottomRowEl = this.$(`[data-guess-id="${bottomRowId}"]`)

        const isTopIncorrect = topRowEl?.classList.contains("crossclimb__guess--incorrect")
        const isBottomIncorrect = bottomRowEl?.classList.contains("crossclimb__guess--incorrect")

        if (isTopIncorrect || isBottomIncorrect) {
          console.warn(
            `[Crossclimb] ❌ Top or Bottom row is incorrect! Top incorrect: ${isTopIncorrect}, Bottom incorrect: ${isBottomIncorrect}`
          )
          console.warn(`[Crossclimb] Blocking incorrect joint combination: ${comboKey}`)
          blockedTopBottom.add(comboKey)

          // Reset the row inputs so we can type again
          await this.sleep(200)

          const errors: string[] = []
          if (isTopIncorrect) {
            errors.push(`- The top word "${topWord}" was marked as INCORRECT by the board.`)
          }
          if (isBottomIncorrect) {
            errors.push(`- The bottom word "${bottomWord}" was marked as INCORRECT by the board.`)
          }

          jointPromptText = `${jointPrompt}

⚠️ ATTENTION: Your previous combination "${topWord}" and "${bottomWord}" was rejected by the board:
${errors.join("\n")}
Please try a DIFFERENT combination of words.`
          continue
        } else {
          console.log("[Crossclimb] ✓ Top and Bottom rows accepted by the board!")
          topBottomSolved = true
          break
        }
      }

      // If invalid, construct a correction prompt and retry
      console.warn(
        `[Crossclimb] Joint words validation failed. Top valid: ${isTopValid}, Bottom valid: ${isBottomValid}, Duplicate: ${isDuplicate}, Blocked: ${isBlocked}. Retrying...`
      )

      const errors: string[] = []
      if (!isTopValid) {
        errors.push(
          `- The chosen topWord "${topWord}" is NOT in the allowed list of candidate edits for "${firstLadderWord}". You MUST choose strictly from: [${topCandidates.join(", ")}]`
        )
      }
      if (!isBottomValid) {
        errors.push(
          `- The chosen bottomWord "${bottomWord}" is NOT in the allowed list of candidate edits for "${lastLadderWord}". You MUST choose strictly from: [${bottomCandidates.join(", ")}]`
        )
      }
      if (isDuplicate) {
        errors.push(
          `- You chose words that are already used in the middle ladder or are duplicates of each other. Middle words are: [${middleWords.join(", ")}]. You must choose completely new words that differ by 1 letter and do not duplicate any words.`
        )
      }
      if (isBlocked) {
        errors.push(
          `- The combination "${topWord}" and "${bottomWord}" has already been tried and rejected. Please choose a completely different combination.`
        )
      }

      jointPromptText = `${jointPrompt}

⚠️ ATTENTION: Your previous response was INVALID because of the following error(s):
${errors.join("\n")}

Please correct these error(s) and return a new JSON object choosing strictly from the allowed lists above.`
    }

    if (!topBottomSolved) {
      throw new Error(
        `Failed to solve top/bottom rows after multiple self-healing attempts.`
      )
    }

    console.log("[Crossclimb] Successfully solved Crossclimb ladder!")
  }

  private async waitForInputs(
    row: HTMLElement,
    timeoutMs = 2000
  ): Promise<HTMLInputElement[]> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
      const inputs = this.$$("input", row) as HTMLInputElement[]
      if (inputs.length > 0) {
        return inputs
      }
      await this.sleep(100)
    }
    return this.$$("input", row) as HTMLInputElement[]
  }

  private async typeWord(rowIdx: number, word: string): Promise<void> {
    const row = this.$(`[data-guess-id="${rowIdx}"]`)
    if (!row) return

    const inputs = await this.waitForInputs(row)
    if (inputs.length !== word.length) {
      console.warn(
        `[Crossclimb] Input slots mismatch for row ${rowIdx}: expected ${word.length}, got ${inputs.length}`
      )
      return
    }

    for (let i = 0; i < word.length; i++) {
      const input = inputs[i]
      input.focus()
      this.setReactInputValue(input, word[i])
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: word[i], bubbles: true })
      )
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: word[i], bubbles: true })
      )
      await this.sleep(40)
    }

    // Press Enter to submit the row
    inputs[inputs.length - 1].dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        bubbles: true
      })
    )
    await this.sleep(100)
  }

  private getDistance(w1: string, w2: string): number {
    if (w1.length !== w2.length) return Math.abs(w1.length - w2.length)
    let diff = 0
    for (let i = 0; i < w1.length; i++) {
      if (w1[i] !== w2[i]) diff++
    }
    return diff
  }

  private getOneLetterEdits(word: string): string[] {
    const edits: string[] = []
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for (let i = 0; i < word.length; i++) {
      for (const char of alphabet) {
        if (word[i] !== char) {
          const edit = word.substring(0, i) + char + word.substring(i + 1)
          edits.push(edit)
        }
      }
    }
    return edits
  }

  private findPermutation(words: string[]): number[] | null {
    const indices = Array.from({ length: words.length }, (_, i) => i)
    const permute = (arr: number[]): number[][] => {
      if (arr.length === 0) return [[]]
      const result: number[][] = []
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
        for (const p of permute(rest)) {
          result.push([arr[i], ...p])
        }
      }
      return result
    }

    const allPerms = permute(indices)
    for (const p of allPerms) {
      let valid = true
      for (let i = 0; i < p.length - 1; i++) {
        if (this.getDistance(words[p[i]], words[p[i + 1]]) !== 1) {
          valid = false
          break
        }
      }
      if (valid) return p
    }
    return null
  }

  /**
   * Given an array of candidate word lists (one list per clue),
   * finds a combination of words (one from each list) that can be
   * arranged to form a valid word ladder (each consecutive pair
   * differs by exactly 1 letter).
   *
   * Uses a graph-based approach: builds an adjacency graph where nodes are
   * (clueIndex, word) pairs and edges connect words from DIFFERENT clues
   * that differ by exactly 1 letter. Then finds a Hamiltonian path of
   * length N (one node per clue) via DFS.
   *
   * Returns { words: string[] (one per clue, in clue order), order: number[] (ladder sequence as clue indices) }
   * or null if no valid combination exists.
   */
  private findLadderCombination(
    candidateLists: string[][],
    blockedCombinations: Set<string> = new Set()
  ): { words: string[]; order: number[] } | null {
    const n = candidateLists.length

    // Build flat node list: each node is { clue index, word }
    const nodeClue: number[] = []
    const nodeWord: string[] = []
    for (let c = 0; c < n; c++) {
      for (const w of candidateLists[c]) {
        nodeClue.push(c)
        nodeWord.push(w)
      }
    }
    const totalNodes = nodeClue.length

    // Build adjacency list: edges between nodes from DIFFERENT clues with distance 1
    const adj: number[][] = Array.from({ length: totalNodes }, () => [])
    for (let i = 0; i < totalNodes; i++) {
      for (let j = i + 1; j < totalNodes; j++) {
        if (
          nodeClue[i] !== nodeClue[j] &&
          this.getDistance(nodeWord[i], nodeWord[j]) === 1
        ) {
          adj[i].push(j)
          adj[j].push(i)
        }
      }
    }

    // DFS to find a Hamiltonian path visiting exactly one node per clue
    const path: number[] = []
    const usedClues = new Set<number>()

    const dfs = (nodeIdx: number): boolean => {
      path.push(nodeIdx)
      usedClues.add(nodeClue[nodeIdx])

      if (path.length === n) {
        // Reconstruct words to check blocklist
        const words = new Array<string>(n)
        for (const idx of path) {
          words[nodeClue[idx]] = nodeWord[idx]
        }
        const comboKey = words.map((w) => w.toUpperCase()).join(",")
        if (!blockedCombinations.has(comboKey)) {
          return true // Found a non-blocked valid path
        }
        // Otherwise, this path is blocked, so backtrack!
        path.pop()
        usedClues.delete(nodeClue[nodeIdx])
        return false
      }

      for (const next of adj[nodeIdx]) {
        if (!usedClues.has(nodeClue[next])) {
          if (dfs(next)) return true
        }
      }

      path.pop()
      usedClues.delete(nodeClue[nodeIdx])
      return false
    }

    // Try starting from each node
    for (let start = 0; start < totalNodes; start++) {
      path.length = 0
      usedClues.clear()
      if (dfs(start)) {
        // Reconstruct: words[clueIdx] = chosen word, order = ladder sequence of clue indices
        const words = new Array<string>(n)
        const order: number[] = []
        for (const idx of path) {
          words[nodeClue[idx]] = nodeWord[idx]
          order.push(nodeClue[idx])
        }
        return { words, order }
      }
    }

    return null
  }

  /**
   * Sorts middle rows into the target order using keyboard-based interaction.
   * Uses the sortable library's accessibility support:
   * 1. Focus the drag handle of the row to move
   * 2. Press Space/Enter to "pick up" the item
   * 3. Press ArrowUp/ArrowDown to move it to the target position
   * 4. Press Space/Enter to "drop" it
   */
  private async keyboardSortRows(
    targetOrder: number[],
    clueWordMap: Map<number, string>
  ): Promise<void> {
    console.log(
      "[Crossclimb] Keyboard-sorting middle rows into target order:",
      targetOrder
    )

    const targetWords = targetOrder.map((id) => clueWordMap.get(id) || "")
    const n = targetWords.length

    for (let i = 0; i < n; i++) {
      const targetWord = targetWords[i]

      // Get current visual positions
      const currentRows = this.$$(".crossclimb__guess--middle")
      currentRows.sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      )

      const currentIndex = currentRows.findIndex(
        (row) => this.getRowWord(row) === targetWord
      )

      if (currentIndex === -1 || currentIndex === i) continue

      // Need to move row from currentIndex to position i
      // Since currentIndex > i (selection sort), we need to move UP (currentIndex - i) times
      const movesNeeded = currentIndex - i

      if (movesNeeded <= 0) continue

      console.log(
        `[Crossclimb] Moving Row containing "${targetWord}" up ${movesNeeded} positions (from ${currentIndex} to ${i})`
      )

      // Find the drag handle of the row to move
      const handle = currentRows[currentIndex].querySelector(
        "[data-sortable-handle]"
      ) as HTMLElement
      if (!handle) {
        console.warn(
          `[Crossclimb] No sortable handle found for row containing "${targetWord}"`
        )
        continue
      }

      // Focus the handle
      handle.focus()
      await this.sleep(100)

      const dispatchKey = (
        target: HTMLElement,
        key: string,
        code: string,
        keyCode: number
      ) => {
        const opts = {
          key,
          code,
          keyCode,
          which: keyCode,
          bubbles: true,
          cancelable: true
        }
        target.dispatchEvent(new KeyboardEvent("keydown", opts))
        target.dispatchEvent(new KeyboardEvent("keypress", opts))
        target.dispatchEvent(new KeyboardEvent("keyup", opts))
      }

      const rowEl = currentRows[currentIndex]

      // Pick up: press Space on both handle and row for compatibility
      dispatchKey(handle, " ", "Space", 32)
      dispatchKey(rowEl, " ", "Space", 32)
      await this.sleep(200)

      // Move up the required number of times
      for (let m = 0; m < movesNeeded; m++) {
        dispatchKey(handle, "ArrowUp", "ArrowUp", 38)
        dispatchKey(rowEl, "ArrowUp", "ArrowUp", 38)
        await this.sleep(150)
      }

      // Drop: press Space on both handle and row for compatibility
      dispatchKey(handle, " ", "Space", 32)
      dispatchKey(rowEl, " ", "Space", 32)
      await this.sleep(300)
    }
  }

  private getRowWord(row: HTMLElement): string {
    const inputs = this.$$("input", row) as HTMLInputElement[]
    return inputs
      .map((input) => input.value || "")
      .join("")
      .trim()
      .toUpperCase()
  }

  /**
   * Cleans the AI response string, extracts the raw JSON block,
   * and parses it. This is highly resilient to extra LLM dialogue or markdown code fences.
   */
  private cleanAndParseJSON<T>(text: string): T {
    let cleanText = text.trim()

    // Strip markdown code block notation (e.g. ```json ... ```)
    if (cleanText.includes("```")) {
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      if (match?.[1]) {
        cleanText = match[1].trim()
      } else {
        cleanText = cleanText.replace(/```/g, "").trim()
      }
    }

    // Find the first '{' and the last '}' to extract raw JSON
    const firstBrace = cleanText.indexOf("{")
    const lastBrace = cleanText.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1)
    }

    return JSON.parse(cleanText) as T
  }
}
