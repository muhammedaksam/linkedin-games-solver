import { describe, expect, it } from "vitest"

import { TangoSolver } from "./tango"

describe("Tango Solver Engine", () => {
  it("should successfully solve a standard 6x6 grid with edge constraints", () => {
    const solver = new TangoSolver()
    const N = 6

    // -1 = empty, 0 = Sun, 1 = Moon
    const g = [
      [0, -1, -1, -1, -1, -1],
      [-1, -1, 1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1],
      [-1, 0, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, 1]
    ]

    // EdgeConstraint: a: cell index, b: cell index, type: "eq" | "neq"
    const edgeConstraints = [
      { a: 0, b: 1, type: "neq" as const }, // g[0][0] != g[0][1]
      { a: 6, b: 12, type: "eq" as const } // g[1][0] == g[2][0]
    ]

    const adj = solver.buildAdjMap(N, edgeConstraints)
    const solved = solver.solveTango(g, N, adj)

    expect(solved).not.toBeNull()
    if (solved) {
      // Check size and values
      expect(solved.length).toBe(6)
      expect(solved[0][0]).toBe(0)
      expect(solved[1][2]).toBe(1)
      expect(solved[4][1]).toBe(0)
      expect(solved[5][5]).toBe(1)

      // Edge constraints verification in solved grid
      expect(solved[0][0]).not.toBe(solved[0][1])
      expect(solved[1][0]).toBe(solved[2][0])

      // Triple checks (no 3 identical symbols in a row/col)
      for (let r = 0; r < N; r++) {
        for (let c = 0; c + 2 < N; c++) {
          const val = solved[r][c]
          expect(val).not.toBe(-1)
          expect(val === solved[r][c + 1] && val === solved[r][c + 2]).toBe(
            false
          )
        }
      }
      for (let c = 0; c < N; c++) {
        for (let r = 0; r + 2 < N; r++) {
          const val = solved[r][c]
          expect(val).not.toBe(-1)
          expect(val === solved[r + 1][c] && val === solved[r + 2][c]).toBe(
            false
          )
        }
      }

      // Line count check (exactly N/2 Sun and Moon in each row and col)
      for (let r = 0; r < N; r++) {
        const zeros = solved[r].filter((x) => x === 0).length
        const ones = solved[r].filter((x) => x === 1).length
        expect(zeros).toBe(3)
        expect(ones).toBe(3)
      }
    }
  })

  it("should return null for contradictory edge constraints", () => {
    const solver = new TangoSolver()
    const N = 6
    const g = Array.from({ length: N }, () => Array<number>(N).fill(-1))

    // Contradiction: cell 0 == cell 1 AND cell 0 != cell 1
    const edgeConstraints = [
      { a: 0, b: 1, type: "eq" as const },
      { a: 0, b: 1, type: "neq" as const }
    ]

    const adj = solver.buildAdjMap(N, edgeConstraints)
    const solved = solver.solveTango(g, N, adj)
    expect(solved).toBeNull()
  })
})
