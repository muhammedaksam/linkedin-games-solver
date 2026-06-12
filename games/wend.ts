import { askAI } from "~games/ai"
import { BaseSolver } from "~games/base"
import { fetchReactBoardState } from "~games/react-bridge"
import { fetchRegistry, findWendAnswer, type WendPuzzle } from "~games/registry"

interface WendCell {
  idx: number
  letter: string
  row: number
  col: number
  isHole: boolean
  isLocked: boolean
}

interface WendWordSolution {
  word: string
  path: number[]
}

export class WendSolver extends BaseSolver {
  readonly name = "Wend"

  detect(): boolean {
    const url = new URL(window.location.href)
    return (
      url.pathname.includes("/wend") ||
      !!this.$('[data-testid="wend-game-board"]')
    )
  }

  async solve(mode: "full" | "hint" = "full"): Promise<void> {
    let cells: WendCell[]
    let gridCols: number
    let gridRows: number
    let wordLengths: number[]
    let solvedFlags: boolean[]

    try {
      const boardState = await fetchReactBoardState("wend")
      cells = boardState.cells
      gridCols = boardState.gridCols
      gridRows = boardState.gridRows
      wordLengths = boardState.wordLengths
      solvedFlags = boardState.solvedFlags
      console.log(
        "[Wend] Successfully extracted state from React Fiber bridge."
      )
    } catch (err) {
      console.warn(
        "[Wend] React Fiber extraction failed, falling back to DOM scraper:",
        err
      )
      const domGrid = this.parseGrid()
      cells = domGrid.cells
      gridCols = domGrid.gridCols
      gridRows = domGrid.gridRows
      wordLengths = this.getWordLengths()
      solvedFlags = this.getSolvedWordFlags()
    }

    console.log(
      `[Wend] Grid: ${gridCols}x${gridRows}, Word lengths: [${wordLengths}]`
    )

    // Check if fully solved
    if (solvedFlags.every(Boolean)) {
      console.log("[Wend] All words are already solved!")
      return
    }

    // Try using daily registry pre-solved answers
    let registry: Record<string, WendPuzzle> = {}
    try {
      registry = await fetchRegistry("wend")
    } catch (err) {
      console.warn("[Wend] Failed to load registry:", err)
    }

    let solution: WendWordSolution[] | null = null
    const matchedPuzzle = findWendAnswer(registry)

    if (matchedPuzzle && Array.isArray(matchedPuzzle.words)) {
      console.log("[Wend] Match found in registry:", matchedPuzzle.words)

      // Get currently solved words from DOM
      const solvedWords: string[] = []
      let rowIdx = 0
      while (true) {
        const row = this.$(`[data-testid="wend-word-list-row-${rowIdx}"]`)
        if (!row) break
        if (row.getAttribute("data-locked") === "true") {
          let word = ""
          let slotIdx = 0
          while (true) {
            const slot = this.$(
              `[data-testid="wend-word-list-slot-${rowIdx}-${slotIdx}"]`,
              row
            )
            if (!slot) break
            word += (slot.textContent || "").trim().toUpperCase()
            slotIdx++
          }
          if (word) solvedWords.push(word)
        }
        rowIdx++
      }

      // Filter registry words to find only unsolved ones
      const unsolvedWords = [...matchedPuzzle.words]
      for (const solved of solvedWords) {
        const idx = unsolvedWords.indexOf(solved)
        if (idx !== -1) {
          unsolvedWords.splice(idx, 1)
        }
      }

      console.log("[Wend] Unsolved words to find paths for:", unsolvedWords)
      solution = this.findPathsForWords(cells, unsolvedWords)

      if (solution) {
        console.log(
          "[Wend] Found path solution for registry words using local DFS pathfinder."
        )
      } else {
        console.warn(
          "[Wend] Local DFS pathfinder failed to map registry words to grid."
        )
      }
    }

    if (!solution) {
      // Identify available (non-hole, non-locked) cells
      const availableCells = cells.filter((c) => !c.isHole && !c.isLocked)
      const unsolvedLengths = wordLengths.filter((_, i) => !solvedFlags[i])
      const totalRequired = unsolvedLengths.reduce((a, b) => a + b, 0)

      console.log(
        `[Wend] Available cells: ${availableCells.length}, Unsolved word lengths: [${unsolvedLengths}], Total required: ${totalRequired}`
      )

      if (availableCells.length !== totalRequired) {
        console.warn(
          `[Wend] Available cell count (${availableCells.length}) != required (${totalRequired})`
        )
      }

      // Ask AI for solution
      solution = await this.solveWithAI(
        cells,
        gridCols,
        gridRows,
        unsolvedLengths
      )
    }

    if (!solution || solution.length === 0) {
      throw new Error(
        "AI could not find a valid solution for this Wend puzzle."
      )
    }

    console.log(
      `[Wend] Final Solution:`,
      solution.map((w) => `${w.word} → [${w.path}]`)
    )

    // Apply solution
    if (mode === "hint") {
      // Trace only the first word
      if (solution.length > 0) {
        console.log(`[Wend] Hint: tracing word "${solution[0].word}"`)
        await this.tracePath(solution[0].path)
      }
    } else {
      for (const word of solution) {
        console.log(`[Wend] Tracing word "${word.word}" → [${word.path}]`)
        await this.tracePath(word.path)
        await this.sleep(400)
      }
    }

    console.log("[Wend] Done solving!")
  }

  // ---------------------------------------------------------------------------
  // Grid parsing
  // ---------------------------------------------------------------------------

  private parseGrid(): {
    cells: WendCell[]
    gridCols: number
    gridRows: number
  } {
    const grid = this.$('[data-testid="interactive-grid"]')
    if (!grid) {
      throw new Error("Could not find Wend interactive grid.")
    }

    // Read grid dimensions from CSS custom properties
    const style = grid.getAttribute("style") || ""
    let gridCols = 0
    let gridRows = 0

    const colMatch = style.match(/--_125bc5f2:\s*(\d+)/)
    const rowMatch = style.match(/--_61d78eb6:\s*(\d+)/)
    if (colMatch) gridCols = parseInt(colMatch[1], 10)
    if (rowMatch) gridRows = parseInt(rowMatch[1], 10)

    // Fallback: compute from CSS custom properties via getComputedStyle
    if (!gridCols || !gridRows) {
      const cs = getComputedStyle(grid)
      for (const prop of ["--_125bc5f2", "--_61d78eb6"]) {
        const val = parseInt(cs.getPropertyValue(prop).trim(), 10)
        if (val > 0) {
          if (!gridCols) gridCols = val
          else if (!gridRows) gridRows = val
        }
      }
    }

    // Final fallback: infer from cell count
    const cellEls = this.$$("[data-cell-idx]", grid)
    if (!gridCols || !gridRows) {
      const total = cellEls.length
      gridCols = Math.round(Math.sqrt(total))
      gridRows = Math.ceil(total / gridCols)
    }

    const cells: WendCell[] = []
    for (const el of cellEls) {
      const idx = parseInt(el.getAttribute("data-cell-idx") || "0", 10)
      const isHole = el.getAttribute("data-cell-is-hole") === "true"
      const isLocked = el.getAttribute("data-cell-is-locked") === "true"

      let letter = ""
      if (!isHole) {
        // Letter is in a span with specific classes
        const span = el.querySelector("span[class*='_08ba2e12']")
        if (span) {
          letter = (span.textContent || "").trim().toUpperCase()
        }
        // Fallback: look for any span with a single letter
        if (!letter) {
          const spans = el.querySelectorAll("span")
          for (const s of Array.from(spans)) {
            const txt = (s.textContent || "").trim()
            if (txt.length === 1 && /[A-Z]/i.test(txt)) {
              letter = txt.toUpperCase()
              break
            }
          }
        }
      }

      cells.push({
        idx,
        letter,
        row: Math.floor(idx / gridCols),
        col: idx % gridCols,
        isHole,
        isLocked
      })
    }

    return { cells, gridCols, gridRows }
  }

  // ---------------------------------------------------------------------------
  // Word list parsing
  // ---------------------------------------------------------------------------

  private getWordLengths(): number[] {
    const lengths: number[] = []
    let rowIdx = 0
    while (true) {
      const row = this.$(`[data-testid="wend-word-list-row-${rowIdx}"]`)
      if (!row) break

      // Count slot elements inside this row
      let slotIdx = 0
      while (
        this.$(`[data-testid="wend-word-list-slot-${rowIdx}-${slotIdx}"]`, row)
      ) {
        slotIdx++
      }
      if (slotIdx > 0) lengths.push(slotIdx)
      rowIdx++
    }
    return lengths
  }

  private getSolvedWordFlags(): boolean[] {
    const flags: boolean[] = []
    let rowIdx = 0
    while (true) {
      const row = this.$(`[data-testid="wend-word-list-row-${rowIdx}"]`)
      if (!row) break
      flags.push(row.getAttribute("data-locked") === "true")
      rowIdx++
    }
    return flags
  }

  // ---------------------------------------------------------------------------
  // AI Solver
  // ---------------------------------------------------------------------------

  private async solveWithAI(
    cells: WendCell[],
    cols: number,
    rows: number,
    wordLengths: number[]
  ): Promise<WendWordSolution[]> {
    const available = cells.filter((c) => !c.isHole && !c.isLocked)

    // Build a visual grid representation
    let gridStr = ""
    for (let r = 0; r < rows; r++) {
      const rowLetters: string[] = []
      for (let c = 0; c < cols; c++) {
        const cell = cells.find((cl) => cl.row === r && cl.col === c)
        if (!cell || cell.isHole) {
          rowLetters.push(".")
        } else if (cell.isLocked) {
          rowLetters.push(cell.letter.toLowerCase()) // lowercase = locked/used
        } else {
          rowLetters.push(cell.letter)
        }
      }
      gridStr += `${rowLetters.join(" ")}\n`
    }

    // Build cell reference list
    const cellRef = available
      .map((c) => `  idx=${c.idx} (row ${c.row}, col ${c.col}): "${c.letter}"`)
      .join("\n")

    const prompt = `You are solving a "Wend" word puzzle. Find hidden English words on a letter grid.

GRID (${rows}x${cols}, "." = hole, lowercase = already used/locked, UPPERCASE = available):
${gridStr}
AVAILABLE CELLS:
${cellRef}

RULES:
- Find exactly ${wordLengths.length} English words with these lengths: [${wordLengths.join(", ")}]
- Each word must follow a path of ORTHOGONALLY ADJACENT cells (up/down/left/right only, NO diagonals)
- Each available cell must be used in exactly one word (perfect cover)
- Only use UPPERCASE/available cells listed above
- Two cells are adjacent if they differ by exactly 1 in row OR column (not both)

ADJACENCY: Cell at (r1,c1) is adjacent to (r2,c2) if |r1-r2| + |c1-c2| = 1 and neither is a hole.

Return ONLY a JSON object in this exact format:
{
  "words": [
    {"word": "EXAMPLE", "path": [idx1, idx2, ...]}
  ]
}
The "words" array must contain EXACTLY ${wordLengths.length} objects, one for each word, sorted by word length ascending.

Think step by step. You must solve the ENTIRE grid, finding all ${wordLengths.length} words to use up all ${available.length} available cells. Verify adjacency for every consecutive pair in each path. Verify every available cell is used exactly once.`

    console.log("[Wend] Sending puzzle to AI...")
    const raw = await askAI(prompt, true)
    console.log("[Wend] AI raw response:", raw)

    // Parse response
    const parsed = this.parseAIResponse(raw, cells, wordLengths)
    if (parsed) return parsed

    // Retry with stronger instructions
    console.warn("[Wend] First AI attempt failed validation, retrying...")
    const retryRaw = await askAI(
      prompt +
        "\n\nIMPORTANT: Your previous answer was invalid. Double-check that:\n1. Every path has ONLY orthogonally adjacent consecutive cells\n2. ALL available cells are used exactly once\n3. All words are common English words\n4. Word lengths match exactly: [" +
        wordLengths.join(", ") +
        "]\n5. You must return ALL " +
        wordLengths.length +
        " words inside the \"words\" array of the JSON object.",
      true
    )
    console.log("[Wend] AI retry response:", retryRaw)

    const retryParsed = this.parseAIResponse(retryRaw, cells, wordLengths)
    if (retryParsed) return retryParsed

    throw new Error(
      "AI could not produce a valid solution after retries. The puzzle may require manual solving."
    )
  }

  private parseAIResponse(
    raw: string,
    cells: WendCell[],
    wordLengths: number[]
  ): WendWordSolution[] | null {
    try {
      let jsonStr = raw.trim()

      // Strip markdown code blocks if present
      jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/```$/, "").trim()

      let words: unknown
      try {
        words = JSON.parse(jsonStr)
      } catch {
        // Fallback: try finding first [ and last ]
        const bracketStart = jsonStr.indexOf("[")
        const bracketEnd = jsonStr.lastIndexOf("]")
        if (bracketStart !== -1 && bracketEnd !== -1) {
          try {
            words = JSON.parse(jsonStr.slice(bracketStart, bracketEnd + 1))
          } catch {
            // Also try fallback for object { and }
            const braceStart = jsonStr.indexOf("{")
            const braceEnd = jsonStr.lastIndexOf("}")
            if (braceStart !== -1 && braceEnd !== -1) {
              try {
                words = JSON.parse(jsonStr.slice(braceStart, braceEnd + 1))
              } catch {
                return null
              }
            } else {
              return null
            }
          }
        } else {
          // Try fallback for object { and }
          const braceStart = jsonStr.indexOf("{")
          const braceEnd = jsonStr.lastIndexOf("}")
          if (braceStart !== -1 && braceEnd !== -1) {
            try {
              words = JSON.parse(jsonStr.slice(braceStart, braceEnd + 1))
            } catch {
              return null
            }
          } else {
            return null
          }
        }
      }

      // If it parsed as a single object, check if it has "words" property or "word"/"path"
      if (words && typeof words === "object" && !Array.isArray(words)) {
        const wordsObj = words as Record<string, unknown>
        if ("words" in wordsObj && Array.isArray(wordsObj.words)) {
          words = wordsObj.words
        } else if ("word" in wordsObj && "path" in wordsObj) {
          words = [wordsObj]
        }
      }

      if (!Array.isArray(words)) {
        console.warn("[Wend] Parsed response is not an array")
        return null
      }

      // Ensure every element of the array is an object with word: string and path: number[]
      const validSolutions: WendWordSolution[] = []
      for (const item of words) {
        if (
          item &&
          typeof item === "object" &&
          typeof item.word === "string" &&
          Array.isArray(item.path) &&
          item.path.every((x: unknown) => typeof x === "number")
        ) {
          validSolutions.push(item)
        }
      }

      if (validSolutions.length !== wordLengths.length) {
        console.warn(
          `[Wend] Expected ${wordLengths.length} valid word solutions, got ${validSolutions.length}`
        )
        return null
      }

      // Sort by word length to match expected order
      const sortedLengths = [...wordLengths].sort((a, b) => a - b)
      validSolutions.sort((a, b) => a.path.length - b.path.length)

      // Validate each word
      const usedCells = new Set<number>()
      for (let i = 0; i < validSolutions.length; i++) {
        const w = validSolutions[i]

        if (w.path.length !== sortedLengths[i]) {
          console.warn(
            `[Wend] Word "${w.word}" path length ${w.path.length} != expected ${sortedLengths[i]}`
          )
          return null
        }

        // Check path validity
        for (let j = 0; j < w.path.length; j++) {
          const idx = w.path[j]
          const cell = cells.find((c) => c.idx === idx)
          if (!cell || cell.isHole || cell.isLocked) {
            console.warn(`[Wend] Invalid cell idx ${idx} in word "${w.word}"`)
            return null
          }

          if (usedCells.has(idx)) {
            console.warn(
              `[Wend] Cell ${idx} used multiple times in word "${w.word}"`
            )
            return null
          }
          usedCells.add(idx)

          // Check adjacency with previous cell
          if (j > 0) {
            const prevIdx = w.path[j - 1]
            const prevCell = cells.find((c) => c.idx === prevIdx)
            if (!prevCell) return null

            const dr = Math.abs(cell.row - prevCell.row)
            const dc = Math.abs(cell.col - prevCell.col)
            if (dr + dc !== 1) {
              console.warn(
                `[Wend] Non-adjacent cells ${prevIdx}→${idx} in word "${w.word}" (dr=${dr}, dc=${dc})`
              )
              return null
            }
          }

          // Verify letter matches
          if (cell.letter !== w.word[j]?.toUpperCase()) {
            console.warn(
              `[Wend] Letter mismatch at path[${j}]: cell has "${cell.letter}", word expects "${w.word[j]}"`
            )
            return null
          }
        }
      }

      // Verify all available cells are used
      const availableCount = cells.filter(
        (c) => !c.isHole && !c.isLocked
      ).length
      if (usedCells.size !== availableCount) {
        console.warn(
          `[Wend] Used ${usedCells.size} cells but ${availableCount} available`
        )
        return null
      }

      console.log("[Wend] AI solution validated successfully!")
      return validSolutions
    } catch (err) {
      console.warn("[Wend] Failed to parse AI response:", err)
      return null
    }
  }

  // ---------------------------------------------------------------------------
  // Path tracing (UI interaction)
  // ---------------------------------------------------------------------------

  private async tracePath(path: number[]): Promise<void> {
    if (path.length === 0) return

    const cellEl = (idx: number) => this.$(`[data-cell-idx="${idx}"]`)

    // mousedown on first cell
    const firstEl = cellEl(path[0])
    if (firstEl) {
      firstEl.dispatchEvent(this.createMouseEvent("mousedown", 1))
    }
    await this.sleep(60)

    // mousemove through intermediate cells
    for (let i = 1; i < path.length; i++) {
      const el = cellEl(path[i])
      if (el) {
        el.dispatchEvent(this.createMouseEvent("mousemove", 1))
        el.dispatchEvent(this.createMouseEvent("mouseenter", 1))
        el.dispatchEvent(this.createMouseEvent("mouseover", 1))
      }
      await this.sleep(50)
    }

    // mouseup on last cell
    const lastEl = cellEl(path[path.length - 1])
    if (lastEl) {
      lastEl.dispatchEvent(this.createMouseEvent("mouseup", 0))
      lastEl.dispatchEvent(this.createMouseEvent("click", 0))
    }
  }

  private findPathsForWords(
    cells: WendCell[],
    words: string[]
  ): WendWordSolution[] | null {
    const available = cells.filter((c) => !c.isHole && !c.isLocked)
    const cellMap = new Map(available.map((c) => [c.idx, c]))

    const findWordPaths = (
      word: string,
      currentIdx: number,
      charIndex: number,
      currentPath: number[],
      used: Set<number>
    ): number[][] => {
      if (charIndex === word.length) {
        return [currentPath]
      }

      const results: number[][] = []
      const char = word[charIndex]

      if (charIndex === 0) {
        for (const cell of available) {
          if (!used.has(cell.idx) && cell.letter === char) {
            used.add(cell.idx)
            const paths = findWordPaths(word, cell.idx, 1, [cell.idx], used)
            results.push(...paths)
            used.delete(cell.idx)
          }
        }
      } else {
        const currCell = cellMap.get(currentIdx)
        if (currCell) {
          const neighbors = [
            { r: currCell.row - 1, c: currCell.col },
            { r: currCell.row + 1, c: currCell.col },
            { r: currCell.row, c: currCell.col - 1 },
            { r: currCell.row, c: currCell.col + 1 }
          ]

          for (const n of neighbors) {
            const cell = available.find((c) => c.row === n.r && c.col === n.c)
            if (cell && !used.has(cell.idx) && cell.letter === char) {
              used.add(cell.idx)
              const paths = findWordPaths(
                word,
                cell.idx,
                charIndex + 1,
                [...currentPath, cell.idx],
                used
              )
              results.push(...paths)
              used.delete(cell.idx)
            }
          }
        }
      }
      return results
    }

    const backtrack = (
      wordIndex: number,
      used: Set<number>,
      solution: WendWordSolution[]
    ): WendWordSolution[] | null => {
      if (wordIndex === words.length) {
        if (used.size === available.length) {
          return solution
        }
        return null
      }

      const word = words[wordIndex]
      const paths = findWordPaths(word, -1, 0, [], used)

      for (const path of paths) {
        for (const idx of path) used.add(idx)
        solution.push({ word, path })

        const res = backtrack(wordIndex + 1, used, solution)
        if (res) return res

        solution.pop()
        for (const idx of path) used.delete(idx)
      }

      return null
    }

    return backtrack(0, new Set<number>(), [])
  }
}
