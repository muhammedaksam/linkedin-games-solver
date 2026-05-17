import { BaseSolver } from "./base";
import { PatchesSolver } from "./patches";
import { QueensSolver } from "./queens";
import { SudokuSolver } from "./sudoku";
import { TangoSolver } from "./tango";
import { ZipSolver } from "./zip";

// List of all solvers adhering to the solver principal
export const SOLVERS: BaseSolver[] = [
  new SudokuSolver(),
  new TangoSolver(),
  new QueensSolver(),
  new ZipSolver(),
  new PatchesSolver(),
];

/**
 * Automatically detects the currently active game solver on the page.
 */
export function detectActiveSolver(): BaseSolver | null {
  for (const solver of SOLVERS) {
    if (solver.detect()) {
      return solver;
    }
  }
  return null;
}

export { BaseSolver };
export { PatchesSolver, QueensSolver, SudokuSolver, TangoSolver, ZipSolver };
