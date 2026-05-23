import { BaseSolver } from "./base";

export class QueensSolver extends BaseSolver {
  readonly name = "Queens";

  detect(): boolean {
    if (window.location.href.includes("/queens")) return true;

    // Fallback: check for interactive grid with colored region cells
    const grid = this.$('[data-testid="interactive-grid"]');
    if (!grid) return false;

    // Queens boards have colored cells; check for any known color class
    // or the presence of queen-svg elements
    const cells = this.$$('[data-testid^="cell-"]', grid);
    return cells.length > 0 && (
      cells.some((c) => c.querySelector('[data-testid="queen-svg"]')) ||
      cells.some((c) => {
        const classes = c.className;
        // Check for known color classes from LinkedIn's Queens game
        return QueensSolver.KNOWN_COLOR_CLASSES
          ? Array.from(QueensSolver.KNOWN_COLOR_CLASSES).some((cc) => classes.includes(cc))
          : false;
      })
    );
  }

  async solve(mode: "full" | "hint" = "full"): Promise<void> {
    // Reset per-board caches
    QueensSolver._commonClasses = null;

    const N = this.inferN();
    const { regionOf, regionCount, givenQueens } = this.buildPuzzle(N);

    console.log(`[Queens] Detected: ${N}x${N} board`);
    console.log(`[Queens] Regions detected: ${regionCount}`);
    console.log(`[Queens] Given queens: ${givenQueens.size}`);

    if (regionCount !== N) {
      console.warn(
        `Region count (${regionCount}) != N (${N}). Solver expects exactly N regions.`
      );
    }

    // Solve from absolute scratch (empty given set) to get the true unique board solution
    const solution = this.solveQueens(N, regionOf, new Set<number>());
    if (!solution) {
      throw new Error("No solution found (or region detection mismatch).");
    }

    console.log("[Queens] Solution coordinates:", Array.from(solution).sort((a, b) => a - b));

    if (mode === "hint") {
      // 1. Gather all current user-placed Queens on the grid
      const userQueens = new Set<number>();
      const errorCells: HTMLElement[] = [];

      for (let idx = 0; idx < N * N; idx++) {
        const el = this.$(`[data-testid="cell-${idx}"][data-cell-idx="${idx}"]`);
        if (el && this.readCellState(el) === 1) {
          userQueens.add(idx);
          // If this Queen is not in the true solution, it's a mistake!
          if (!solution.has(idx)) {
            errorCells.push(el);
          }
        }
      }

      // 2. If there are incorrect choices, flash them red and report the error
      if (errorCells.length > 0) {
        for (const el of errorCells) {
          el.style.transition = "background-color 200ms, outline 200ms, border-color 200ms";
          el.style.backgroundColor = "rgba(220, 38, 38, 0.4)"; // Tailwind red-600
          el.style.outline = "2px solid #ef4444";
          el.style.outlineOffset = "-2px";
          el.style.borderColor = "#dc2626";

          setTimeout(() => {
            el.style.backgroundColor = "";
            el.style.outline = "";
            el.style.outlineOffset = "";
            el.style.borderColor = "";
          }, 3500);
        }
        throw new Error("Mistake detected! Correct the highlighted cell(s) first.");
      }

      // 3. Find the first solution coordinate that doesn't have a Queen yet
      let placedHint = false;
      for (const idx of solution) {
        if (!userQueens.has(idx)) {
          console.log(`[Queens] Placing a single hint Queen at coordinate: ${idx}`);
          await this.setQueenUI(idx);
          placedHint = true;
          break; // Stop after one hint placement!
        }
      }

      if (!placedHint) {
        console.log("[Queens] All queens are already correctly placed!");
      }
    } else {
      // Full Auto-Solve Mode: Place all missing solution Queens
      for (const idx of solution) {
        await this.setQueenUI(idx);
        // Small delay to let the UI register the state snappily
        await this.sleep(60);
      }
    }

    console.log("[Queens] Done solving!");
  }

  private inferN(): number {
    const grid = this.$('[data-testid="interactive-grid"]');
    if (!grid) {
      throw new Error("Could not find the Queens grid: [data-testid='interactive-grid']");
    }

    // Try known CSS custom property names (LinkedIn obfuscates these and they change)
    const style = getComputedStyle(grid);
    for (const prop of ["--_920a8b85", "--f08abb51"]) {
      const raw = style.getPropertyValue(prop).trim();
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }

    // Also check the inline style attribute directly
    const inlineStyle = grid.getAttribute("style") || "";
    const inlineMatch = inlineStyle.match(/--[\w-]+:\s*(\d+)/);
    if (inlineMatch) {
      const n = Number(inlineMatch[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }

    // Fallback: Infer from total count of cells
    const cells = this.$$('[data-testid^="cell-"][data-cell-idx]');
    const total = cells.length;
    const guess = Math.round(Math.sqrt(total));
    if (guess * guess !== total) {
      throw new Error(`Failed to infer grid size from total cells: ${total}`);
    }
    return guess;
  }

  /**
   * Known CSS classes that LinkedIn uses for cell border/position modifiers.
   * These are NOT color classes and must be excluded when identifying regions.
   */
  private static readonly POSITIONAL_CLASSES = new Set([
    "_28c8856c", // right edge
    "_83040b93", // bottom edge
  ]);

  /**
   * Stable color classes that represent each region (observed from LinkedIn).
   * If a cell has one of these in its classList, that IS the region key.
   * We use these as a first-pass filter; any _remaining_ unknown class that
   * appears exactly on color-cell groups is also accepted.
   */
  private static readonly KNOWN_COLOR_CLASSES = new Set([
    "_64f5839e", // pistachio green (Fıstık yeşili)
    "_8afa9b35", // milk coffee / tan (Sütlü kahve)
    "_507d6304", // light blue (Açık mavi)
    "_9925ef1e", // pastel green (Pastel yeşil)
    "_92a923b3", // bright coral (Parlak mercan)
    "_37804ac2", // light gray (Açık gri)
    "_81688657", // melon / orange (Kavuniçi)
    "bbeafac7",  // lilac (Eflatun)
  ]);

  private getRegionKey(cellEl: HTMLElement | null): string {
    if (!cellEl) return "UNKNOWN";

    // Strategy 1: Try the aria-label.
    // English format: "Light blue color empty cell, row 1, column 5"
    // Turkish format: "Açık mavi renkte boş hücre, 1. satır, 5. sütun"
    // Other locales may vary, but the color name always comes before the first comma.
    const label = (cellEl.getAttribute("aria-label") || "").trim();
    if (label) {
      // English: match "COLOR color ..." before comma
      const enMatch = label.match(/^(.+?)\s+color\s+/i);
      if (enMatch?.[1]) return enMatch[1].trim().toLowerCase();

      // Localized: match "COLOR renkte/renk/colored/..." — take everything
      // before the first comma as the color description, then strip the cell-state
      // words (empty, queen, etc.) to isolate just the color name.
      const beforeComma = label.split(",")[0]?.trim();
      if (beforeComma) {
        // Remove common cell-state descriptors in known locales
        const cleaned = beforeComma
          .replace(
            /\b(renkte|renk|color|empty|boş|hücre|cell|queen|vacía|vacío|vide|leer|空|vazia|vazio)\b/gi,
            ""
          )
          .replace(/\s{2,}/g, " ")
          .trim()
          .toLowerCase();
        if (cleaned.length > 0) return cleaned;
      }
    }

    // Strategy 2: Find the color class from the element's classList.
    // First check known color classes, then look for a class that isn't a
    // common structural/positional modifier.
    const classes = cellEl.className.split(/\s+/);
    for (const cls of classes) {
      if (QueensSolver.KNOWN_COLOR_CLASSES.has(cls)) return cls;
    }

    // Strategy 3: The shared structural classes appear on ALL cells.
    // We collect all cells, find the "common" classes, and this cell's
    // unique non-common, non-positional class is likely the color.
    // For performance, just grab the cell's classes and exclude known structural ones.
    // The 5th class (0-indexed) in the cell typically carries the color after the
    // common structural prefix, but we can't rely on index. Instead, exclude
    // classes shared with ALL cells and positional modifiers.
    if (!QueensSolver._commonClasses) {
      const allCells = this.$$('[data-testid^="cell-"][data-cell-idx]');
      if (allCells.length > 0) {
        const firstClasses = new Set(allCells[0].className.split(/\s+/));
        const common = new Set<string>();
        for (const cls of firstClasses) {
          if (allCells.every((c) => c.classList.contains(cls))) {
            common.add(cls);
          }
        }
        QueensSolver._commonClasses = common;
      } else {
        QueensSolver._commonClasses = new Set();
      }
    }
    const common = QueensSolver._commonClasses;
    if (common) {
      for (const cls of classes) {
        if (
          !common.has(cls) &&
          !QueensSolver.POSITIONAL_CLASSES.has(cls) &&
          cls.length > 0
        ) {
          return cls;
        }
      }
    }

    return "UNKNOWN";
  }

  private static _commonClasses: Set<string> | null = null;

  private isLocked(cellEl: HTMLElement | null): boolean {
    return cellEl?.getAttribute("aria-disabled") === "true";
  }

  // -1 = empty, 0 = X/marker, 1 = Queen
  private readCellState(cellEl: HTMLElement | null): number {
    if (!cellEl) return -1;
    if (cellEl.querySelector('svg[data-testid="queen-svg"]')) return 1;

    const label = (cellEl.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("x")) return 0;
    if ((cellEl.textContent || "").trim().toUpperCase() === "X") return 0;

    if (
      cellEl.querySelector(
        '[data-testid*="x"], [data-testid*="mark"], [aria-label="X"]'
      )
    ) {
      return 0;
    }

    return -1;
  }

  private idxToRC(idx: number, N: number): [number, number] {
    return [Math.floor(idx / N), idx % N];
  }

  private rcToIdx(r: number, c: number, N: number): number {
    return r * N + c;
  }

  private neighbors8(r: number, c: number): [number, number][] {
    const out: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        out.push([r + dr, c + dc]);
      }
    }
    return out;
  }

  private buildPuzzle(N: number): {
    regionOf: number[];
    regionCount: number;
    givenQueens: Set<number>;
  } {
    const regionOf = new Array<number>(N * N);
    const regions = new Map<string, number>();
    let nextId = 0;
    const givenQueens = new Set<number>();

    for (let idx = 0; idx < N * N; idx++) {
      const el = this.$(`[data-testid="cell-${idx}"][data-cell-idx="${idx}"]`);
      if (!el) {
        throw new Error(`Missing cell idx=${idx}`);
      }

      const key = this.getRegionKey(el);
      if (!regions.has(key)) {
        regions.set(key, nextId++);
      }
      regionOf[idx] = regions.get(key) ?? 0;

      if (this.readCellState(el) === 1 || (this.isLocked(el) && this.readCellState(el) === 1)) {
        givenQueens.add(idx);
      }
    }

    return { regionOf, regionCount: regions.size, givenQueens };
  }

  private solveQueens(N: number, regionOf: number[], givenQueens: Set<number>): Set<number> | null {
    const colUsed = new Array<boolean>(N).fill(false);
    const regionUsed = new Array<boolean>(N).fill(false);
    const queenAt = new Array<number>(N).fill(-1); // queenAt[row] = col
    const queenSet = new Set<number>();

    const markQueen = (r: number, c: number) => {
      const idx = this.rcToIdx(r, c, N);
      queenAt[r] = c;
      colUsed[c] = true;
      regionUsed[regionOf[idx]] = true;
      queenSet.add(idx);
    };

    const unmarkQueen = (r: number, c: number) => {
      const idx = this.rcToIdx(r, c, N);
      queenAt[r] = -1;
      colUsed[c] = false;
      regionUsed[regionOf[idx]] = false;
      queenSet.delete(idx);
    };

    const canPlace = (r: number, c: number): boolean => {
      if (colUsed[c]) return false;
      const idx = this.rcToIdx(r, c, N);
      const reg = regionOf[idx];
      if (regionUsed[reg]) return false;

      // 8-neighborhood adjacency check
      for (const [rr, cc] of this.neighbors8(r, c)) {
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        const nidx = this.rcToIdx(rr, cc, N);
        if (queenSet.has(nidx)) return false;
      }
      return true;
    };

    // Apply pre-existing/given queens
    for (const idx of givenQueens) {
      const [r, c] = this.idxToRC(idx, N);

      // Conflict in row
      if (queenAt[r] !== -1 && queenAt[r] !== c) return null;

      // Other conflicts
      if (!canPlace(r, c) && !(queenAt[r] === c)) return null;

      if (queenAt[r] === -1) {
        markQueen(r, c);
      }
    }

    const candidatesForRow = (r: number): number[] => {
      if (queenAt[r] !== -1) return [queenAt[r]];
      const cand: number[] = [];
      for (let c = 0; c < N; c++) {
        if (canPlace(r, c)) cand.push(c);
      }
      return cand;
    };

    const forwardCheck = (): boolean => {
      for (let r = 0; r < N; r++) {
        if (queenAt[r] !== -1) continue;
        if (candidatesForRow(r).length === 0) return false;
      }
      return true;
    };

    const pickNextRowMRV = (): number => {
      let bestR = -1;
      let bestLen = Infinity;
      for (let r = 0; r < N; r++) {
        if (queenAt[r] !== -1) continue;
        const len = candidatesForRow(r).length;
        if (len < bestLen) {
          bestLen = len;
          bestR = r;
          if (len <= 1) break;
        }
      }
      return bestR;
    };

    const dfs = (): boolean => {
      const r = pickNextRowMRV();
      if (r === -1) return true; // All rows successfully filled

      const cand = candidatesForRow(r);
      for (const c of cand) {
        markQueen(r, c);

        if (forwardCheck() && dfs()) return true;

        unmarkQueen(r, c);
      }
      return false;
    };

    if (!forwardCheck()) return null;
    const solved = dfs();
    if (!solved) return null;

    const result = new Set<number>();
    for (let r = 0; r < N; r++) {
      const c = queenAt[r];
      if (c === -1) return null;
      result.add(this.rcToIdx(r, c, N));
    }
    return result;
  }

  private async setQueenUI(idx: number): Promise<void> {
    const el = this.$(`[data-testid="cell-${idx}"][data-cell-idx="${idx}"]`);
    if (!el || this.isLocked(el)) return;

    // Cycle cell states until Queen is active (normally Empty -> X -> Queen)
    for (let tries = 0; tries < 4; tries++) {
      if (this.readCellState(el) === 1) return;
      this.click(el);
      await this.sleep(60);
    }

    console.warn(`[Queens] Could not set Queen UI at idx: ${idx}`);
  }
}
