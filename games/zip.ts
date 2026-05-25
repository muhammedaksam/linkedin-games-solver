import { BaseSolver } from "./base"
import { fetchReactBoardState } from "./react-bridge"

export class ZipSolver extends BaseSolver {
  readonly name = "Zip"

  detect(): boolean {
    return (
      window.location.href.includes("/zip") ||
      (this.$$("[data-cell-idx]").length > 0 &&
        this.$$("[data-cell-idx]").some((cell) =>
          cell.querySelector('[data-cell-content="true"]')
        ))
    )
  }

  async solve(): Promise<void> {
    let N = 6
    let checkpoints = new Map<number, number>()
    let walls = new Set<string>()
    let reactSuccess = false

    try {
      console.log("[Zip] Attempting React Fiber state extraction...")
      const boardState = await fetchReactBoardState("zip")
      if (boardState && boardState.checkpoints && boardState.checkpoints.length > 0) {
        N = boardState.size
        checkpoints = new Map<number, number>()
        for (const cp of boardState.checkpoints) {
          checkpoints.set(cp.value, cp.idx)
        }

        // Walls can be mapped from React if present, otherwise fall back to DOM wall detection
        if (boardState.walls && boardState.walls.length > 0) {
          walls = new Set<string>()
          for (const w of boardState.walls) {
            const min = Math.min(w.a, w.b)
            const max = Math.max(w.a, w.b)
            walls.add(`${min}-${max}`)
          }
        } else {
          walls = this.getWalls(N)
        }

        reactSuccess = true
        console.log(
          `[Zip] React Extraction Successful! N=${N}, checkpoints=${checkpoints.size}, walls=${walls.size}`
        )
      }
    } catch (err: any) {
      console.warn(
        "[Zip] React Fiber state extraction failed, falling back to DOM parsing:",
        err.message || err
      )
    }

    if (!reactSuccess) {
      N = this.inferN()
      checkpoints = this.getCheckpoints()
      walls = this.getWalls(N)
    }

    console.log(`[Zip] Checkpoints:`, Array.from(checkpoints.entries()))
    console.log(`[Zip] Walls:`, Array.from(walls))

    const solution = this.solveZip(N, checkpoints, walls)
    if (!solution) {
      throw new Error("No solution path found for Zip puzzle!")
    }

    console.log(`[Zip] Solution Path:`, JSON.stringify(solution))
    await this.drawPath(solution)
    console.log("[Zip] Done solving!")
  }

  private inferN(): number {
    const cells = this.$$("[data-cell-idx]")
    if (cells.length === 0) {
      throw new Error("No cells with [data-cell-idx] found.")
    }
    const maxIdx = Math.max(
      ...cells.map((c) => parseInt(c.getAttribute("data-cell-idx") || "0", 10))
    )
    return Math.round(Math.sqrt(maxIdx + 1))
  }

  private getCheckpoints(): Map<number, number> {
    const map = new Map<number, number>() // value -> idx
    const cells = this.$$("[data-cell-idx]")
    for (const c of cells) {
      const idx = parseInt(c.getAttribute("data-cell-idx") || "0", 10)
      const content = c.querySelector('[data-cell-content="true"]')
      if (content) {
        const text = (content.textContent || "").replace(/[^0-9]/g, "").trim()
        const val = parseInt(text, 10)
        if (!Number.isNaN(val)) {
          map.set(val, idx)
        }
      }
    }
    return map
  }

  private getWalls(N: number): Set<string> {
    const walls = new Set<string>()
    const cells = this.$$("[data-cell-idx]")

    for (const c of cells) {
      const idx = parseInt(c.getAttribute("data-cell-idx") || "0", 10)
      const r = Math.floor(idx / N)
      const col = idx % N

      const children = Array.from(c.children) as HTMLElement[]
      for (let i = 1; i < children.length; i++) {
        const child = children[i]

        // Skip known non-wall elements (numbers, SVGs, hint arrows, path overlays)
        if (
          child.tagName.toLowerCase() !== "div" ||
          child.children.length > 0 ||
          (child.textContent || "").trim() !== "" ||
          child.hasAttribute("data-cell-content") ||
          child.getAttribute("data-testid") === "filled-cell" ||
          child.hasAttribute("data-cell-hint-arrow")
        ) {
          continue
        }

        let neighbor = -1

        // Strategy 2: Future-proof computed CSS / Pseudo-element detection (Completely Class-Name Free!)
        for (const pseudo of ["", "::before", "::after"]) {
          const s = window.getComputedStyle(
            child,
            pseudo === "" ? undefined : pseudo
          )
          if (!s || s.display === "none" || s.visibility === "hidden") continue

          const bg = s.backgroundColor || ""
          const hasBg =
            bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" && bg !== ""

          const borderTop = parseFloat(s.borderTopWidth || "0")
          const borderBottom = parseFloat(s.borderBottomWidth || "0")
          const borderLeft = parseFloat(s.borderLeftWidth || "0")
          const borderRight = parseFloat(s.borderRightWidth || "0")

          // 1. Direct Border Check (Element or Pseudo-element)
          if (borderBottom > 0 && r < N - 1) {
            neighbor = idx + N
            break
          }
          if (borderLeft > 0 && col > 0) {
            neighbor = idx - 1
            break
          }
          if (borderRight > 0 && col < N - 1) {
            neighbor = idx + 1
            break
          }
          if (borderTop > 0 && r > 0) {
            neighbor = idx - N
            break
          }

          // 2. Background/Size Positioning Check (Pseudo-element or absolute nested shapes)
          if (hasBg) {
            const w = parseFloat(s.width || "0")
            const h = parseFloat(s.height || "0")

            // Thin horizontal line
            if (h > 0 && h < 10 && w > 20) {
              if (s.top === "0px" && r > 0) {
                neighbor = idx - N
                break
              }
              if (
                (s.bottom === "0px" || parseFloat(s.top || "0") > 20) &&
                r < N - 1
              ) {
                neighbor = idx + N
                break
              }
            }
            // Thin vertical line
            if (w > 0 && w < 10 && h > 20) {
              if (s.left === "0px" && col > 0) {
                neighbor = idx - 1
                break
              }
              if (
                (s.right === "0px" || parseFloat(s.left || "0") > 20) &&
                col < N - 1
              ) {
                neighbor = idx + 1
                break
              }
            }
          }
        }

        if (neighbor !== -1 && neighbor >= 0 && neighbor < N * N) {
          const min = Math.min(idx, neighbor)
          const max = Math.max(idx, neighbor)
          walls.add(`${min}-${max}`)
        }
      }
    }
    return walls
  }

  private solveZip(
    N: number,
    checkpoints: Map<number, number>,
    walls: Set<string>
  ): number[] | null {
    const total = N * N
    const sortedVals = Array.from(checkpoints.keys()).sort((a, b) => a - b)
    if (!sortedVals.length) return null

    const startVal = sortedVals[0]
    const startIdx = checkpoints.get(startVal) ?? 0

    const adj = Array.from({ length: total }, (_, i) => {
      const r = Math.floor(i / N)
      const c = i % N
      const neighbors: number[] = []

      const canMove = (neighbor: number) => {
        const min = Math.min(i, neighbor)
        const max = Math.max(i, neighbor)
        return !walls.has(`${min}-${max}`)
      }

      if (r > 0 && canMove(i - N)) neighbors.push(i - N)
      if (r < N - 1 && canMove(i + N)) neighbors.push(i + N)
      if (c > 0 && canMove(i - 1)) neighbors.push(i - 1)
      if (c < N - 1 && canMove(i + 1)) neighbors.push(i + 1)

      return neighbors
    })

    const visited = new Array<boolean>(total).fill(false)
    const path: number[] = []
    let solution: number[] | null = null

    const dfs = (curr: number, nextCpValIdx: number) => {
      if (solution) return

      path.push(curr)
      visited[curr] = true
      const pathLen = path.length

      const nextCpVal = sortedVals[nextCpValIdx]

      for (const [val, idx] of checkpoints) {
        if (idx === curr) {
          if (val === nextCpVal) {
            nextCpValIdx++
          } else if (val !== startVal) {
            visited[curr] = false
            path.pop()
            return
          }
        }
      }

      if (pathLen === total) {
        solution = [...path]
        return
      }

      const neighbors = adj[curr].filter((n) => !visited[n])

      // Heuristic: Sort neighbors closer to the next checkpoint target
      const realNextCpVal = sortedVals[nextCpValIdx]
      if (realNextCpVal !== undefined && checkpoints.has(realNextCpVal)) {
        const t = checkpoints.get(realNextCpVal) ?? 0
        const tr = Math.floor(t / N),
          tc = t % N
        neighbors.sort((a, b) => {
          const ar = Math.floor(a / N),
            ac = a % N
          const br = Math.floor(b / N),
            bc = b % N
          const da = Math.abs(ar - tr) + Math.abs(ac - tc)
          const db = Math.abs(br - tr) + Math.abs(bc - tc)
          return da - db
        })
      }

      for (const n of neighbors) {
        let validStep = true
        const realNextVal = sortedVals[nextCpValIdx]
        for (const [v, idx] of checkpoints) {
          if (idx === n && v !== realNextVal) {
            validStep = false
            break
          }
        }

        if (validStep) {
          dfs(n, nextCpValIdx)
          if (solution) return
        }
      }

      visited[curr] = false
      path.pop()
    }

    dfs(startIdx, 1)
    return solution
  }

  private async drawPath(solution: number[]): Promise<void> {
    if (solution.length === 0) return

    const cellEl = (idx: number) => this.$(`[data-cell-idx="${idx}"]`)

    const firstEl = cellEl(solution[0])
    if (firstEl) {
      firstEl.dispatchEvent(this.createMouseEvent("mousedown", 1))
    }
    await this.sleep(50)

    for (let i = 1; i < solution.length; i++) {
      const el = cellEl(solution[i])
      if (el) {
        el.dispatchEvent(this.createMouseEvent("mousemove", 1))
        el.dispatchEvent(this.createMouseEvent("mouseenter", 1))
        el.dispatchEvent(this.createMouseEvent("mouseover", 1))
      }
      await this.sleep(40)
    }

    const lastEl = cellEl(solution[solution.length - 1])
    if (lastEl) {
      lastEl.dispatchEvent(this.createMouseEvent("mouseup", 0))
      lastEl.dispatchEvent(this.createMouseEvent("click", 0))
    }
  }
}
