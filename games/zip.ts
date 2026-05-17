import { BaseSolver } from "./base"

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
    const N = this.inferN()
    console.log(`[Zip] Detected N: ${N}`)

    const checkpoints = this.getCheckpoints()
    const walls = this.getWalls(N)

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
      const cellRect = c.getBoundingClientRect()
      const r = Math.floor(idx / N)
      const col = idx % N

      const children = Array.from(c.children) as HTMLElement[]
      for (let i = 1; i < children.length; i++) {
        const child = children[i]
        if (child.hasAttribute("data-cell-content")) continue
        if (child.getAttribute("data-testid") === "filled-cell") continue

        let neighbor = -1

        // 1. High-fidelity class name detection
        const hasClass = (el: HTMLElement, cls: string) =>
          el.classList.contains(cls) ||
          Array.from(el.classList).some((cname) => cname.includes(cls))

        if (hasClass(child, "_75450fd6")) {
          neighbor = idx + N // Bottom wall
        } else if (hasClass(child, "_91b41d39")) {
          neighbor = idx - 1 // Left wall
        } else if (hasClass(child, "ba9aa30f")) {
          neighbor = idx + 1 // Right wall
        }

        // 2. Geometric/CSS fallback
        if (neighbor === -1) {
          const styles = [
            window.getComputedStyle(child),
            window.getComputedStyle(child, "::before"),
            window.getComputedStyle(child, "::after")
          ]

          let width = 0,
            height = 0
          let top = "",
            left = ""

          const wRect = child.getBoundingClientRect()
          if (wRect && wRect.width > 0 && wRect.height > 0) {
            width = wRect.width
            height = wRect.height
          }

          for (const cs of styles) {
            let w = parseFloat(cs.width) || 0
            let h = parseFloat(cs.height) || 0

            const borderTop = parseFloat(cs.borderTopWidth) || 0
            const borderBottom = parseFloat(cs.borderBottomWidth) || 0
            const borderLeft = parseFloat(cs.borderLeftWidth) || 0
            const borderRight = parseFloat(cs.borderRightWidth) || 0

            if (borderTop > 0 || borderBottom > 0) {
              h = Math.max(h, borderTop, borderBottom)
              w = Math.max(w, parseFloat(cs.width) || cellRect.width)
            }
            if (borderLeft > 0 || borderRight > 0) {
              w = Math.max(w, borderLeft, borderRight)
              h = Math.max(h, parseFloat(cs.height) || cellRect.height)
            }

            if (w > 0 && h > 0 && (w > width || h > height)) {
              width = w
              height = h
              top = cs.top
              left = cs.left
            }
          }

          if (width > 0 && height > 0) {
            const wcX = wRect ? wRect.left + wRect.width / 2 : 0
            const wcY = wRect ? wRect.top + wRect.height / 2 : 0
            const ccX = cellRect.left + cellRect.width / 2
            const ccY = cellRect.top + cellRect.height / 2

            if (width > height) {
              // Horizontal wall
              if (wRect && wRect.width > 0 && wRect.height > 0) {
                if (wcY < ccY && r > 0) neighbor = idx - N
                else if (r < N - 1) neighbor = idx + N
              } else {
                if ((top === "0px" || parseFloat(top) < 10) && r > 0)
                  neighbor = idx - N
                else if (r < N - 1) neighbor = idx + N
              }
            } else if (height > width) {
              // Vertical wall
              if (wRect && wRect.width > 0 && wRect.height > 0) {
                if (wcX < ccX && col > 0) neighbor = idx - 1
                else if (col < N - 1) neighbor = idx + 1
              } else {
                if ((left === "0px" || parseFloat(left) < 10) && col > 0)
                  neighbor = idx - 1
                else if (col < N - 1) neighbor = idx + 1
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
