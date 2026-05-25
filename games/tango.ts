import { BaseSolver } from "./base"
import { fetchReactBoardState, type ReactTangoBoard } from "./react-bridge"

interface EdgeConstraint {
  a: number
  b: number
  type: "eq" | "neq"
}

interface AdjConstraint {
  other: number
  type: "eq" | "neq"
}

export class TangoSolver extends BaseSolver {
  readonly name = "Tango"

  detect(): boolean {
    return (
      window.location.href.includes("/tango") ||
      (this.$$('[data-testid^="cell-"]').length > 0 &&
        (!!this.$('[data-testid="cell-zero"]') ||
          !!this.$('[data-testid="cell-one"]') ||
          !!this.$('svg[data-testid="edge-equal"]') ||
          !!this.$('svg[data-testid="edge-cross"]')))
    )
  }

  async solve(): Promise<void> {
    let N = 6
    let edges: EdgeConstraint[] = []
    let g: number[][] = []
    let reactSuccess = false

    try {
      console.log("[Tango] Attempting React Fiber state extraction...")
      const boardState: ReactTangoBoard = await fetchReactBoardState("tango")
      if (
        boardState &&
        boardState.cells &&
        boardState.cells.length > 0 &&
        boardState.constraints
      ) {
        N = boardState.size
        g = Array.from({ length: N }, () => Array<number>(N).fill(-1))

        // 1. Populate grid values from React
        for (const cell of boardState.cells) {
          const r = Math.floor(cell.idx / N)
          const c = cell.idx % N
          g[r][c] = cell.value
        }

        // 2. Populate constraints from React
        edges = boardState.constraints
        reactSuccess = true
        console.log(
          `[Tango] React Extraction Successful! N=${N}, constraints=${edges.length}`
        )
      }
    } catch (err: any) {
      console.warn(
        "[Tango] React Fiber state extraction failed, falling back to layout DOM parsing:",
        err.message || err
      )
    }

    if (!reactSuccess) {
      N = this.inferN()
      if (N % 2 !== 0) {
        throw new Error(
          `Tango expects an even board dimension N. Detected N: ${N}`
        )
      }

      console.log(`[Tango] Detected ${N}x${N} board`)

      edges = this.parseEdges(N)
      g = Array.from({ length: N }, () => Array<number>(N).fill(-1))
      for (let idx = 0; idx < N * N; idx++) {
        const el = this.cellElByIdx(idx)
        if (!el) continue
        const r = Math.floor(idx / N)
        const c = idx % N
        g[r][c] = this.readCellValue(el)
      }
    }

    const adj = this.buildAdjMap(N, edges)

    console.log(`[Tango] Edge constraints found: ${edges.length}`)
    console.table(g)

    const solved = this.solveTango(g, N, adj)
    if (!solved) {
      throw new Error("No consistent Sun/Moon solution found for Tango puzzle!")
    }

    console.log("[Tango] Solved grid successfully! (0=Sun, 1=Moon)")
    console.table(solved)

    // Write values back to UI
    for (let idx = 0; idx < N * N; idx++) {
      const el = this.cellElByIdx(idx)
      if (!el || this.isLocked(el)) continue

      const cur = this.readCellValue(el)
      const r = Math.floor(idx / N)
      const c = idx % N
      const want = solved[r][c]

      if (cur === want) continue
      await this.setCellUI(idx, want)
      await this.sleep(35)
    }

    console.log("[Tango] Done solving!")
  }

  private cellElByIdx(idx: number): HTMLElement | null {
    return this.$(`[data-testid="cell-${idx}"], #tango-cell-${idx}`)
  }

  private readCellValue(cellEl: HTMLElement | null): number {
    if (!cellEl) return -1
    if (cellEl.querySelector('[data-testid="cell-zero"]')) return 0
    if (cellEl.querySelector('[data-testid="cell-one"]')) return 1
    return -1
  }

  private isLocked(cellEl: HTMLElement | null): boolean {
    return cellEl?.getAttribute("aria-disabled") === "true"
  }

  private inferN(): number {
    const grid = this.$('[data-testid="interactive-grid"]')
    if (!grid) {
      throw new Error("Could not find Tango grid element.")
    }
    const raw = getComputedStyle(grid).getPropertyValue("--f08abb51").trim()
    const N = Number(raw)
    if (Number.isFinite(N) && N > 0) return N

    // Fallback: Infer from total count of cells
    const cells = this.$$('[data-testid^="cell-"][data-cell-idx]')
    const total = cells.length
    const guess = Math.round(Math.sqrt(total))
    if (guess * guess !== total) {
      throw new Error(
        `Failed to infer Tango grid size from total cells: ${total}`
      )
    }
    return guess
  }

  private parseEdges(N: number): EdgeConstraint[] {
    const constraints: EdgeConstraint[] = []
    const seen = new Set<string>()

    const idxToRC = (idx: number): [number, number] => [
      Math.floor(idx / N),
      idx % N
    ]
    const rcToIdx = (r: number, c: number): number => r * N + c

    for (let idx = 0; idx < N * N; idx++) {
      const cell = this.cellElByIdx(idx)
      if (!cell) continue

      const eqSvgs = this.$$('svg[data-testid="edge-equal"]', cell).map(
        (s) => ({ svg: s, type: "eq" as const })
      )
      const neqSvgs = this.$$('svg[data-testid="edge-cross"]', cell).map(
        (s) => ({ svg: s, type: "neq" as const })
      )
      const edgeSvgs = [...eqSvgs, ...neqSvgs]
      if (!edgeSvgs.length) continue

      const cellRect = cell.getBoundingClientRect()
      const cellCx = cellRect.left + cellRect.width / 2
      const cellCy = cellRect.top + cellRect.height / 2

      const [r, c] = idxToRC(idx)

      for (const { svg, type } of edgeSvgs) {
        const rct = svg.getBoundingClientRect()
        const ex = rct.left + rct.width / 2
        const ey = rct.top + rct.height / 2

        const dx = ex - cellCx
        const dy = ey - cellCy

        let nr = r
        let nc = c

        if (Math.abs(dx) >= Math.abs(dy)) {
          nc = c + (dx >= 0 ? 1 : -1)
        } else {
          nr = r + (dy >= 0 ? 1 : -1)
        }

        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
        const j = rcToIdx(nr, nc)

        const a = Math.min(idx, j)
        const b = Math.max(idx, j)
        const key = `${a}-${b}-${type}`
        if (seen.has(key)) continue
        seen.add(key)

        constraints.push({ a, b, type })
      }
    }

    return constraints
  }

  private buildAdjMap(
    N: number,
    constraints: EdgeConstraint[]
  ): AdjConstraint[][] {
    const adj = Array.from({ length: N * N }, () => [] as AdjConstraint[])
    for (const c of constraints) {
      adj[c.a].push({ other: c.b, type: c.type })
      adj[c.b].push({ other: c.a, type: c.type })
    }
    return adj
  }

  private clone(grid: number[][]): number[][] {
    return grid.map((row) => row.slice())
  }

  private isConsistent(
    g: number[][],
    N: number,
    adj: AdjConstraint[][]
  ): boolean {
    const countVals = (arr: number[]) => {
      let z = 0,
        o = 0,
        e = 0
      for (const v of arr) {
        if (v === 0) z++
        else if (v === 1) o++
        else e++
      }
      return { z, o, e }
    }

    const violatesTriples = (arr: number[]): boolean => {
      for (let i = 0; i + 2 < arr.length; i++) {
        const a = arr[i],
          b = arr[i + 1],
          c = arr[i + 2]
        if (a !== -1 && a === b && b === c) return true
      }
      return false
    }

    const checkLineCounts = (arr: number[]): boolean => {
      const half = N / 2
      const { z, o } = countVals(arr)
      return z <= half && o <= half
    }

    // Row & Col checks
    for (let r = 0; r < N; r++) {
      const row = g[r]
      if (!checkLineCounts(row) || violatesTriples(row)) return false
    }
    for (let c = 0; c < N; c++) {
      const col = g.map((row) => row[c])
      if (!checkLineCounts(col) || violatesTriples(col)) return false
    }

    // Edge constraint checks
    for (let idx = 0; idx < N * N; idx++) {
      const r = Math.floor(idx / N)
      const c = idx % N
      const v = g[r][c]
      if (v === -1) continue

      for (const { other, type } of adj[idx]) {
        const rr = Math.floor(other / N)
        const cc = other % N
        const ov = g[rr][cc]
        if (ov === -1) continue
        if (type === "eq" && ov !== v) return false
        if (type === "neq" && ov === v) return false
      }
    }

    return true
  }

  private propagate(
    g: number[][],
    N: number,
    adj: AdjConstraint[][]
  ): number[][] {
    let changed = true

    const countVals = (arr: number[]) => {
      let z = 0,
        o = 0,
        e = 0
      for (const v of arr) {
        if (v === 0) z++
        else if (v === 1) o++
        else e++
      }
      return { z, o, e }
    }

    const setCell = (idx: number, val: number): boolean => {
      const r = Math.floor(idx / N)
      const c = idx % N
      if (g[r][c] === val) return false
      if (g[r][c] !== -1 && g[r][c] !== val) {
        throw new Error("Contradiction")
      }
      g[r][c] = val
      return true
    }

    const applyTriples = (
      arr: number[],
      writeIdx: (i: number, val: number) => boolean
    ): boolean => {
      let localChanged = false
      for (let i = 0; i < N; i++) {
        if (i + 2 < N) {
          const a = arr[i],
            b = arr[i + 1],
            c = arr[i + 2]
          // XX_ -> O
          if (a !== -1 && a === b && c === -1)
            localChanged = writeIdx(i + 2, 1 - a) || localChanged
          // _XX -> O
          if (a === -1 && b !== -1 && b === c)
            localChanged = writeIdx(i, 1 - b) || localChanged
          // X_X -> O
          if (a !== -1 && c !== -1 && a === c && b === -1)
            localChanged = writeIdx(i + 1, 1 - a) || localChanged
        }
      }
      return localChanged
    }

    while (changed) {
      changed = false

      // 1. Propagate Edge Constraints
      for (let idx = 0; idx < N * N; idx++) {
        const r = Math.floor(idx / N)
        const c = idx % N
        const v = g[r][c]
        if (v === -1) continue

        for (const { other, type } of adj[idx]) {
          const rr = Math.floor(other / N)
          const cc = other % N
          const ov = g[rr][cc]
          if (ov !== -1) continue

          const forced = type === "eq" ? v : 1 - v
          try {
            if (setCell(other, forced)) {
              changed = true
            }
          } catch {
            // Contradiction, handled by solver
          }
        }
      }

      // 2. Row Propagations
      for (let r = 0; r < N; r++) {
        const row = g[r]
        const { z, o, e } = countVals(row)
        const half = N / 2

        if (z === half && e > 0) {
          for (let c = 0; c < N; c++) {
            if (g[r][c] === -1) {
              g[r][c] = 1
              changed = true
            }
          }
        }
        if (o === half && e > 0) {
          for (let c = 0; c < N; c++) {
            if (g[r][c] === -1) {
              g[r][c] = 0
              changed = true
            }
          }
        }

        changed =
          applyTriples(row, (c, val) => {
            const idx = r * N + c
            try {
              return setCell(idx, val)
            } catch {
              return false
            }
          }) || changed
      }

      // 3. Col Propagations
      for (let c = 0; c < N; c++) {
        const col = g.map((row) => row[c])
        const { z, o, e } = countVals(col)
        const half = N / 2

        if (z === half && e > 0) {
          for (let r = 0; r < N; r++) {
            if (g[r][c] === -1) {
              g[r][c] = 1
              changed = true
            }
          }
        }
        if (o === half && e > 0) {
          for (let r = 0; r < N; r++) {
            if (g[r][c] === -1) {
              g[r][c] = 0
              changed = true
            }
          }
        }

        changed =
          applyTriples(col, (r, val) => {
            const idx = r * N + c
            try {
              return setCell(idx, val)
            } catch {
              return false
            }
          }) || changed
      }
    }

    return g
  }

  private chooseMRV(g: number[][], N: number, adj: AdjConstraint[][]) {
    let best = null
    let bestScore = -1

    for (let idx = 0; idx < N * N; idx++) {
      const r = Math.floor(idx / N)
      const c = idx % N
      if (g[r][c] !== -1) continue

      const candidates: number[] = []
      for (const v of [0, 1]) {
        const gg = this.clone(g)
        gg[r][c] = v
        if (this.isConsistent(gg, N, adj)) {
          candidates.push(v)
        }
      }

      if (candidates.length === 0) return { idx, candidates: [] as number[] }

      const degree = adj[idx].length
      const score = (2 - candidates.length) * 100 + degree

      if (score > bestScore) {
        bestScore = score
        best = { idx, candidates }
        if (candidates.length === 1) return best
      }
    }

    return best
  }

  private solveTango(
    g0: number[][],
    N: number,
    adj: AdjConstraint[][]
  ): number[][] | null {
    const dfs = (g: number[][]): number[][] | null => {
      try {
        this.propagate(g, N, adj)
      } catch {
        return null // Contradiction encountered during propagation
      }

      if (!this.isConsistent(g, N, adj)) return null

      let solved = true
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (g[r][c] === -1) solved = false
        }
      }

      if (solved) return g

      const pick = this.chooseMRV(g, N, adj)
      if (!pick) return g
      if (pick.candidates.length === 0) return null

      const r = Math.floor(pick.idx / N)
      const c = pick.idx % N

      for (const v of pick.candidates) {
        const gg = this.clone(g)
        gg[r][c] = v
        const out = dfs(gg)
        if (out) return out
      }

      return null
    }

    return dfs(this.clone(g0))
  }

  private async setCellUI(idx: number, targetVal: number): Promise<void> {
    const el = this.cellElByIdx(idx)
    if (!el || this.isLocked(el)) return

    // Focus/Click
    this.click(el)
    await this.sleep(15)

    // Cycle states until matches: Empty -> Sun -> Moon -> Empty
    for (let tries = 0; tries < 4; tries++) {
      const cur = this.readCellValue(el)
      if (cur === targetVal) return

      this.click(el)
      await this.sleep(20)
    }

    console.warn(
      `[Tango] Could not cycle cell ${idx} to target value: ${targetVal}`
    )
  }
}
