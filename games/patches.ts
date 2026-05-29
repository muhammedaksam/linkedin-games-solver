import { BaseSolver } from "~games/base"
import { fetchReactBoardState } from "~games/react-bridge"

interface Clue {
  id: number
  r: number
  c: number
  size: number | null
  type: "square" | "tall" | "wide" | "any"
  validRects?: Rect[]
  placedRect?: Rect
}

interface Rect {
  r: number
  c: number
  w: number
  h: number
  clueId: number
}

export class PatchesSolver extends BaseSolver {
  readonly name = "Patches"

  detect(): boolean {
    const url = new URL(window.location.href)
    return (
      url.pathname.includes("/patches") ||
      (this.$$("[data-cell-idx]").length > 0 &&
        this.$$("[data-cell-idx]").some(
          (cell) =>
            cell.querySelector("[data-shape]") ||
            cell.querySelector('[data-testid^="patches-clue-number-"]')
        ))
    )
  }

  async solve(): Promise<void> {
    let W = 0
    let H = 0
    let clues: Clue[] = []
    let reactSuccess = false
    let reactSolution: Rect[] | undefined = undefined

    try {
      console.log("[Patches] Attempting React Fiber state extraction...")
      const boardState = await fetchReactBoardState("patches")
      if (boardState && boardState.clues && boardState.clues.length > 0) {
        W = boardState.gridCols
        H = boardState.gridRows
        clues = boardState.clues.map((c) => ({
          id: c.idx,
          r: c.r,
          c: c.c,
          size: c.size,
          type: c.type
        }))

        if (boardState.solution && boardState.solution.length > 0) {
          const directSolution: Rect[] = []
          for (const cellIdxes of boardState.solution) {
            let minR = Infinity,
              maxR = -Infinity
            let minC = Infinity,
              maxC = -Infinity
            for (const idx of cellIdxes) {
              const r = Math.floor(idx / W)
              const c = idx % W
              if (r < minR) minR = r
              if (r > maxR) maxR = r
              if (c < minC) minC = c
              if (c > maxC) maxC = c
            }

            // Find which clue's ID is inside this region
            const clue = clues.find((c) => cellIdxes.includes(c.id))
            if (clue) {
              directSolution.push({
                r: minR,
                c: minC,
                w: maxC - minC + 1,
                h: maxR - minR + 1,
                clueId: clue.id
              })
            }
          }
          if (directSolution.length === clues.length) {
            reactSolution = directSolution
            console.log("[Patches] Direct solution mapped from React state!")
          }
        }

        reactSuccess = true
        console.log(
          `[Patches] React Extraction Successful! W=${W}, H=${H}, clues=${clues.length}`
        )
      }
    } catch (err) {
      console.warn(
        "[Patches] React Fiber state extraction failed, falling back to DOM parsing:",
        err.message || err
      )
    }

    if (!reactSuccess) {
      const parsed = this.parseBoard()
      if (!parsed) {
        throw new Error("Could not parse Patches board correctly.")
      }
      W = parsed.W
      H = parsed.H
      clues = parsed.clues
      console.log(`[Patches] DOM Board size: ${W}x${H}`)
      console.log(`[Patches] DOM Clues found:`, clues)
    }

    const solution = reactSolution || this.solvePatches(W, H, clues)
    if (!solution) {
      throw new Error(
        "No non-overlapping rectangle solution found for Patches puzzle!"
      )
    }

    console.log(`[Patches] Solution found:`, solution)

    for (const rect of solution) {
      await this.simulateDrag(rect, W)
      await this.sleep(200)
    }

    console.log("[Patches] Done solving!")
  }

  private parseBoard(): { W: number; H: number; clues: Clue[] } | null {
    const cells = this.$$("[data-cell-idx]")
    if (!cells.length) return null

    const total = cells.length
    const W = Math.round(Math.sqrt(total))
    const H = Math.floor(total / W)

    const clues: Clue[] = []

    cells.forEach((cell, idx) => {
      const r = Math.floor(idx / W)
      const c = idx % W

      const clueNumberEl = cell.querySelector(
        '[data-testid^="patches-clue-number-"]'
      )
      const shapeEl = cell.querySelector("[data-shape]")

      if (shapeEl || clueNumberEl) {
        let type: Clue["type"]
        const shapeAttr = shapeEl ? shapeEl.getAttribute("data-shape") : null

        switch (shapeAttr) {
          case "PatchesShapeConstraint_HORIZONTAL_RECT":
            type = "wide"
            break
          case "PatchesShapeConstraint_VERTICAL_RECT":
            type = "tall"
            break
          case "PatchesShapeConstraint_SQUARE":
            type = "square"
            break
          default:
            type = "any"
        }

        const text = clueNumberEl?.textContent
        const size = text ? parseInt(text, 10) : null

        clues.push({ id: idx, r, c, size, type })
      }
    })

    return { W, H, clues }
  }

  private solvePatches(W: number, H: number, clues: Clue[]): Rect[] | null {
    const grid = Array.from({ length: H }, () =>
      Array<number | null>(W).fill(null)
    )
    let solution: Rect[] | null = null

    // Helper to generate all valid rectangles containing the clue's cell
    const getValidRects = (clue: Clue): Rect[] => {
      const rects: Rect[] = []
      const maxSize = clue.size || W * H

      for (let width = 1; width <= W; width++) {
        for (let height = 1; height <= H; height++) {
          const area = width * height

          if (clue.size && area !== clue.size) continue
          if (!clue.size && area > maxSize) continue

          if (clue.type === "square" && width !== height) continue
          if (clue.type === "tall" && height <= width) continue
          if (clue.type === "wide" && width <= height) continue

          // Determine bounding box coordinates that encompass (clue.r, clue.c)
          for (
            let r = Math.max(0, clue.r - height + 1);
            r <= Math.min(H - height, clue.r);
            r++
          ) {
            for (
              let c = Math.max(0, clue.c - width + 1);
              c <= Math.min(W - width, clue.c);
              c++
            ) {
              rects.push({ r, c, w: width, h: height, clueId: clue.id })
            }
          }
        }
      }
      return rects
    }

    const cluesWithRects = clues.map((c) => ({
      ...c,
      validRects: getValidRects(c)
    }))

    const solve = (clueIdx: number) => {
      if (solution) return
      if (clueIdx === clues.length) {
        // Confirm everything is covered (no null cells)
        for (let i = 0; i < H; i++) {
          for (let j = 0; j < W; j++) {
            if (grid[i][j] === null) return
          }
        }
        solution = cluesWithRects
          .map((c) => c.placedRect)
          .filter((rect): rect is Rect => !!rect)
        return
      }

      const clue = cluesWithRects[clueIdx]
      for (const rect of clue.validRects) {
        // Validate overlaps
        let overlap = false
        for (let i = rect.r; i < rect.r + rect.h; i++) {
          for (let j = rect.c; j < rect.c + rect.w; j++) {
            if (grid[i][j] !== null) overlap = true
          }
        }

        if (!overlap) {
          // Place
          for (let i = rect.r; i < rect.r + rect.h; i++) {
            for (let j = rect.c; j < rect.c + rect.w; j++) {
              grid[i][j] = clue.id
            }
          }
          clue.placedRect = rect

          solve(clueIdx + 1)
          if (solution) return

          // Backtrack / Undo
          for (let i = rect.r; i < rect.r + rect.h; i++) {
            for (let j = rect.c; j < rect.c + rect.w; j++) {
              grid[i][j] = null
            }
          }
        }
      }
    }

    solve(0)
    return solution
  }

  private async simulateDrag(rect: Rect, W: number): Promise<void> {
    const getCell = (r: number, c: number) =>
      this.$(`[data-cell-idx="${r * W + c}"]`)

    const startCell = getCell(rect.r, rect.c)
    const endCell = getCell(rect.r + rect.h - 1, rect.c + rect.w - 1)

    if (!startCell || !endCell) return

    startCell.dispatchEvent(this.createMouseEvent("mousedown", 1))
    await this.sleep(50)

    for (let r = rect.r; r <= rect.r + rect.h - 1; r++) {
      for (let c = rect.c; c <= rect.c + rect.w - 1; c++) {
        if (r === rect.r && c === rect.c) continue // Start cell is already active
        const cell = getCell(r, c)
        if (cell) {
          cell.dispatchEvent(this.createMouseEvent("mousemove", 1))
          cell.dispatchEvent(this.createMouseEvent("mouseenter", 1))
          cell.dispatchEvent(this.createMouseEvent("mouseover", 1))
          await this.sleep(50)
        }
      }
    }

    endCell.dispatchEvent(this.createMouseEvent("mouseup", 0))
    endCell.dispatchEvent(this.createMouseEvent("click", 0))
  }
}
