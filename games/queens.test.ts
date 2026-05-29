import { describe, expect, it } from "vitest"

import { QueensSolver } from "~games/queens"

describe("Queens Solver Engine", () => {
  it("should successfully solve a standard 8x8 Queens board", () => {
    const solver = new QueensSolver()
    const N = 8

    // Create a simple region map (each row r is region r)
    // This is valid as region count = N (8 regions)
    const regionOf = new Array<number>(N * N)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        regionOf[r * N + c] = r
      }
    }

    const solution = solver.solveQueens(N, regionOf, new Set<number>())
    expect(solution).not.toBeNull()
    if (solution) {
      expect(solution.size).toBe(8)

      // Verify no column, row, region, or adjacent overlaps
      const rows = new Set<number>()
      const cols = new Set<number>()
      const regions = new Set<number>()
      const solutionList = Array.from(solution)

      for (const idx of solutionList) {
        const r = Math.floor(idx / N)
        const c = idx % N
        const reg = regionOf[idx]

        expect(rows.has(r)).toBe(false)
        expect(cols.has(c)).toBe(false)
        expect(regions.has(reg)).toBe(false)

        rows.add(r)
        cols.add(c)
        regions.add(reg)

        // Adjacent 8-neighborhood check
        for (const other of solutionList) {
          if (other === idx) continue
          const or = Math.floor(other / N)
          const oc = other % N
          const rowDiff = Math.abs(or - r)
          const colDiff = Math.abs(oc - c)
          // Queens cannot touch in 8-way neighbors
          expect(rowDiff <= 1 && colDiff <= 1).toBe(false)
        }
      }
    }
  })

  it("should solve with a pre-placed given queen", () => {
    const solver = new QueensSolver()
    const N = 6

    // 6x6 region map
    const regionOf = new Array<number>(N * N)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        regionOf[r * N + c] = r
      }
    }

    // Force a queen at coordinate 0 (row 0, col 0)
    const givenQueens = new Set<number>([0])

    const solution = solver.solveQueens(N, regionOf, givenQueens)
    expect(solution).not.toBeNull()
    if (solution) {
      expect(solution.size).toBe(6)
      expect(solution.has(0)).toBe(true)
    }
  })

  it("should return null for unsolvable Given Queens constraints", () => {
    const solver = new QueensSolver()
    const N = 6

    const regionOf = new Array<number>(N * N)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        regionOf[r * N + c] = r
      }
    }

    // Force two given queens in the same row / region (contradiction)
    const givenQueens = new Set<number>([0, 1])

    const solution = solver.solveQueens(N, regionOf, givenQueens)
    expect(solution).toBeNull()
  })
})
