import { BaseSolver } from "~games/base"
import { CrossclimbSolver } from "~games/crossclimb"
import { PatchesSolver } from "~games/patches"
import { PinpointSolver } from "~games/pinpoint"
import { QueensSolver } from "~games/queens"
import { SudokuSolver } from "~games/sudoku"
import { TangoSolver } from "~games/tango"
import { ZipSolver } from "~games/zip"

// List of all solvers adhering to the solver principal
export const SOLVERS: BaseSolver[] = [
  new SudokuSolver(),
  new TangoSolver(),
  new QueensSolver(),
  new ZipSolver(),
  new PatchesSolver(),
  new CrossclimbSolver(),
  new PinpointSolver()
]

/**
 * Automatically detects the currently active game solver on the page.
 */
export function detectActiveSolver(): BaseSolver | null {
  for (const solver of SOLVERS) {
    if (solver.detect()) {
      return solver
    }
  }
  return null
}

export { BaseSolver }
export {
  CrossclimbSolver,
  PatchesSolver,
  PinpointSolver,
  QueensSolver,
  SudokuSolver,
  TangoSolver,
  ZipSolver
}
