import { BaseSolver } from "./base";

export class QueensSolver extends BaseSolver {
  readonly name = "Queens";

  detect(): boolean {
    return (
      window.location.href.includes("/queens") ||
      (!!this.$('[data-testid="interactive-grid"]') &&
        this.$$('[data-testid^="cell-"]').some((cell) =>
          cell.getAttribute("aria-label")?.toLowerCase().includes("color")
        ))
    );
  }

  async solve(): Promise<void> {
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

    const solution = this.solveQueens(N, regionOf, givenQueens);
    if (!solution) {
      throw new Error("No solution found (or region detection mismatch).");
    }

    console.log("[Queens] Solution coordinates:", Array.from(solution).sort((a, b) => a - b));

    // Place Queens
    for (const idx of solution) {
      await this.setQueenUI(idx);
      // Small delay to let the UI register the state
      await this.sleep(150);
    }

    console.log("[Queens] Done solving!");
  }

  private inferN(): number {
    const grid = this.$('[data-testid="interactive-grid"]');
    if (!grid) {
      throw new Error("Could not find the Queens grid: [data-testid='interactive-grid']");
    }

    const raw = getComputedStyle(grid).getPropertyValue("--f08abb51").trim();
    const N = Number(raw);
    if (Number.isFinite(N) && N > 0) return N;

    // Fallback: Infer from total count of cells
    const cells = this.$$('[data-testid^="cell-"][data-cell-idx]');
    const total = cells.length;
    const guess = Math.round(Math.sqrt(total));
    if (guess * guess !== total) {
      throw new Error(`Failed to infer grid size from total cells: ${total}`);
    }
    return guess;
  }

  private getRegionKey(cellEl: HTMLElement | null): string {
    if (!cellEl) return "UNKNOWN";
    const label = (cellEl.getAttribute("aria-label") || "").trim();
    const m = label.match(/color\s+([^,]+)\s*,/i);
    if (m?.[1]) return m[1].trim();

    // Fallback: stable class bucket
    return cellEl.className.split(/\s+/).slice(-1)[0] || "UNKNOWN";
  }

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
      await this.sleep(150);
    }

    console.warn(`[Queens] Could not set Queen UI at idx: ${idx}`);
  }
}
