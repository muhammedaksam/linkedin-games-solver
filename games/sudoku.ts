import { BaseSolver } from "./base";

interface RegionInfo {
  map: number[][];
  regions: number;
  ok: boolean;
  kind: string;
  sizes?: number[];
}

export class SudokuSolver extends BaseSolver {
  readonly name = "Sudoku";

  detect(): boolean {
    return (
      window.location.href.includes("/sudoku") ||
      (this.$$("[data-cell-idx]").length > 0 &&
        (!!this.$(".sudoku-cell") ||
          this.$$("[data-cell-idx]").some((cell) => cell.className.includes("sudoku-cell"))))
    );
  }

  async solve(mode: "full" | "hint" = "full"): Promise<void> {
    const N = this.inferN();
    const regionInfo = this.inferRegions(N);

    console.log(`[Sudoku] Detected ${N}x${N} board. Region method: ${regionInfo.kind}`);
    console.log(`[Sudoku] Region count: ${regionInfo.regions}`);

    // Parse only the original/locked given clues to ensure we solve the correct, pristine puzzle
    const givenGrid = this.parseGivenBoard(N);
    const solved = this.cloneBoard(givenGrid);
    const ok = this.solveMRV(solved, regionInfo.map);

    if (!ok) {
      console.table(givenGrid);
      throw new Error("No Sudoku solution found! (Could be a parsing mismatch or region inference error.)");
    }

    console.log("[Sudoku] Solved grid successfully!");
    console.table(solved);

    if (mode === "hint") {
      const errorCells: HTMLElement[] = [];
      const userPlaced = Array.from({ length: N }, () => Array<number>(N).fill(0));

      // 1. Scan the board to check all user-placed inputs
      for (let idx = 0; idx < N * N; idx++) {
        const r = Math.floor(idx / N);
        const c = idx % N;
        const cell = this.$(`[data-cell-idx="${idx}"]`);
        if (!cell) continue;

        const isGiven =
          cell.getAttribute("aria-disabled") === "true" ||
          cell.classList.contains("sudoku-cell--given") ||
          cell.className.includes("given");

        if (!isGiven) {
          const text = (cell.innerText || cell.textContent || "").trim();
          const match = text.match(/\b([1-9][0-9]*)\b/);
          const v = match ? Number(match[1]) : 0;

          if (v !== 0) {
            userPlaced[r][c] = v;
            // If the user's filled digit does not match the solution, it's a mistake!
            if (v !== solved[r][c]) {
              errorCells.push(cell);
            }
          }
        }
      }

      // 2. If errors exist, flash them red and stop
      if (errorCells.length > 0) {
        for (const cell of errorCells) {
          cell.style.transition = "background-color 200ms, outline 200ms, border-color 200ms";
          cell.style.backgroundColor = "rgba(220, 38, 38, 0.4)"; // Tailwind red-600
          cell.style.outline = "2px solid #ef4444";
          cell.style.outlineOffset = "-2px";
          cell.style.borderColor = "#dc2626";

          setTimeout(() => {
            cell.style.backgroundColor = "";
            cell.style.outline = "";
            cell.style.outlineOffset = "";
            cell.style.borderColor = "";
          }, 3500);
        }
        throw new Error("Mistake detected! Correct the highlighted cell(s) first.");
      }

      // 3. Find the first empty cell and fill it with its correct digit
      let placedHint = false;
      for (let idx = 0; idx < N * N; idx++) {
        const r = Math.floor(idx / N);
        const c = idx % N;

        if (givenGrid[r][c] === 0 && userPlaced[r][c] === 0) {
          const val = solved[r][c];
          if (val) {
            console.log(`[Sudoku] Placing a single hint digit ${val} at cell index: ${idx}`);
            await this.fillCell(idx, val);
            placedHint = true;
            break; // Stop after a single hint placement!
          }
        }
      }

      if (!placedHint) {
        console.log("[Sudoku] All cell values are already correctly placed!");
      }
    } else {
      // Full Auto-Solve Mode: Place all missing solution digits
      const originalCurrent = this.parseBoard(N);
      for (let idx = 0; idx < N * N; idx++) {
        const r = Math.floor(idx / N);
        const c = idx % N;

        if (originalCurrent[r][c] !== 0) continue; // Skip existing numbers

        const val = solved[r][c];
        if (!val) continue;

        await this.fillCell(idx, val);
        await this.sleep(35);
      }
    }

    console.log("[Sudoku] Done solving!");
  }

  private parseGivenBoard(N: number): number[][] {
    const b = Array.from({ length: N }, () => Array<number>(N).fill(0));
    for (let idx = 0; idx < N * N; idx++) {
      const r = Math.floor(idx / N);
      const c = idx % N;

      const cell = this.$(`[data-cell-idx="${idx}"]`);
      if (!cell) continue;

      const isGiven =
        cell.getAttribute("aria-disabled") === "true" ||
        cell.classList.contains("sudoku-cell--given") ||
        cell.className.includes("given");

      if (isGiven) {
        const text = (cell.innerText || cell.textContent || "").trim();
        const match = text.match(/\b([1-9][0-9]*)\b/);
        const v = match ? Number(match[1]) : 0;
        b[r][c] = v >= 1 && v <= N ? v : 0;
      }
    }
    return b;
  }

  private inferN(): number {
    const total = this.$$("[data-cell-idx]").length;
    if (total === 0) {
      throw new Error("No cells with [data-cell-idx] found.");
    }
    const N = Math.round(Math.sqrt(total));
    if (N * N !== total) {
      throw new Error(`Grid is not square? Total cells: ${total}`);
    }
    return N;
  }

  private parseBoard(N: number): number[][] {
    const b = Array.from({ length: N }, () => Array<number>(N).fill(0));
    for (let idx = 0; idx < N * N; idx++) {
      const r = Math.floor(idx / N);
      const c = idx % N;

      const cell = this.$(`[data-cell-idx="${idx}"]`);
      if (!cell) continue;

      const text = (cell.innerText || cell.textContent || "").trim();
      const match = text.match(/\b([1-9][0-9]*)\b/);
      const v = match ? Number(match[1]) : 0;
      b[r][c] = v >= 1 && v <= N ? v : 0;
    }
    return b;
  }

  private inferRegions(N: number): RegionInfo {
    const wall = this.regionMapFromWalls(N);
    if (wall.ok) return wall;

    const sq = this.regionMapDefault(N);
    if (sq) return sq;

    throw new Error(
      `Could not infer valid subgrid regions. BFS wall flood fill yielded ${wall.regions} regions.`
    );
  }

  private regionMapDefault(N: number): RegionInfo | null {
    const root = Math.sqrt(N);
    if (Number.isInteger(root)) {
      const R = root;
      const C = root;
      const map = Array.from({ length: N }, () => Array<number>(N).fill(-1));
      let id = 0;

      for (let br = 0; br < N; br += R) {
        for (let bc = 0; bc < N; bc += C) {
          for (let r = br; r < br + R; r++) {
            for (let c = bc; c < bc + C; c++) {
              map[r][c] = id;
            }
          }
          id++;
        }
      }
      return { map, regions: id, ok: true, kind: `${R}x${C} subgrids` };
    }
    return null;
  }

  private regionMapFromWalls(N: number): RegionInfo {
    const total = N * N;
    const reg = Array.from({ length: N }, () => Array<number>(N).fill(-1));
    let regionId = 0;

    const idxToRC = (idx: number): [number, number] => [Math.floor(idx / N), idx % N];
    const rcToIdx = (r: number, c: number): number => r * N + c;
    const inBounds = (r: number, c: number): boolean => r >= 0 && r < N && c >= 0 && c < N;

    for (let start = 0; start < total; start++) {
      const [sr, sc] = idxToRC(start);
      if (reg[sr][sc] !== -1) continue;

      // BFS Flood Fill
      const q: number[] = [start];
      reg[sr][sc] = regionId;

      while (q.length) {
        const idx = q.pop();
        if (idx === undefined) continue;
        const [r, c] = idxToRC(idx);

        const neighbors: [number, number, string][] = [
          [r, c + 1, "R"],
          [r, c - 1, "L"],
          [r + 1, c, "D"],
          [r - 1, c, "U"],
        ];

        for (const [nr, nc, dir] of neighbors) {
          if (!inBounds(nr, nc)) continue;
          const nidx = rcToIdx(nr, nc);
          if (reg[nr][nc] !== -1) continue;
          if (this.hasWallBetween(idx, nidx, dir)) continue;

          reg[nr][nc] = regionId;
          q.push(nidx);
        }
      }
      regionId++;
    }

    const counts = new Map<number, number>();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        counts.set(reg[r][c], (counts.get(reg[r][c]) ?? 0) + 1);
      }
    }

    const sizes = Array.from(counts.values());
    const ok = sizes.length === N && sizes.every((s) => s === N);

    return {
      map: reg,
      regions: sizes.length,
      ok,
      kind: "wall overlay flood-fill",
      sizes,
    };
  }

  private hasWallBetween(aIdx: number, bIdx: number, direction: string): boolean {
    const a = this.$(`[data-cell-idx="${aIdx}"]`);
    const b = this.$(`[data-cell-idx="${bIdx}"]`);
    if (!a || !b) return true;

    const aCls = a.classList;
    const bCls = b.classList;

    if (direction === "R") {
      return aCls.contains("sudoku-cell-wall-right") || bCls.contains("sudoku-cell-wall-left");
    }
    if (direction === "L") {
      return aCls.contains("sudoku-cell-wall-left") || bCls.contains("sudoku-cell-wall-right");
    }
    if (direction === "D") {
      return aCls.contains("sudoku-cell-wall-bottom") || bCls.contains("sudoku-cell-wall-top");
    }
    if (direction === "U") {
      return aCls.contains("sudoku-cell-wall-top") || bCls.contains("sudoku-cell-wall-bottom");
    }
    return true;
  }

  private cloneBoard(b: number[][]): number[][] {
    return b.map((row) => row.slice());
  }

  private isValid(b: number[][], regionOf: number[][], r: number, c: number, val: number): boolean {
    const N = b.length;

    // Row check
    for (let cc = 0; cc < N; cc++) {
      if (b[r][cc] === val) return false;
    }

    // Col check
    for (let rr = 0; rr < N; rr++) {
      if (b[rr][c] === val) return false;
    }

    // Region check
    const rid = regionOf[r][c];
    for (let rr = 0; rr < N; rr++) {
      for (let cc = 0; cc < N; cc++) {
        if (regionOf[rr][cc] === rid && b[rr][cc] === val) return false;
      }
    }

    return true;
  }

  private getCandidates(b: number[][], regionOf: number[][], r: number, c: number): number[] {
    const N = b.length;
    const cand: number[] = [];
    for (let v = 1; v <= N; v++) {
      if (this.isValid(b, regionOf, r, c, v)) {
        cand.push(v);
      }
    }
    return cand;
  }

  private solveMRV(b: number[][], regionOf: number[][]): boolean {
    const N = b.length;

    let bestR = -1;
    let bestC = -1;
    let bestCand: number[] | null = null;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (b[r][c] !== 0) continue;

        const cand = this.getCandidates(b, regionOf, r, c);
        if (cand.length === 0) return false; // Dead end

        if (!bestCand || cand.length < bestCand.length) {
          bestR = r;
          bestC = c;
          bestCand = cand;
          if (cand.length === 1) break;
        }
      }
      if (bestCand && bestCand.length === 1) break;
    }

    if (bestCand === null) return true; // Solved!

    for (const v of bestCand) {
      b[bestR][bestC] = v;
      if (this.solveMRV(b, regionOf)) return true;
      b[bestR][bestC] = 0; // Backtrack
    }

    return false;
  }

  private getNumberButton(v: number): HTMLButtonElement | null {
    return Array.from(document.querySelectorAll("button")).find((b) => {
      return b.textContent?.trim() === String(v) && !b.hasAttribute("data-cell-idx");
    }) as HTMLButtonElement | null;
  }

  private focusBoard(): void {
    const grid = this.$('[data-sudoku-grid="true"]') || this.$(".sudoku-grid");
    if (grid) {
      grid.focus();
    }
  }

  private typeKey(key: string): void {
    const target = document.activeElement || document.body;
    const keyCode = key.charCodeAt(0);
    const opts = {
      key,
      code: `Digit${key}`,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    };
    target.dispatchEvent(new KeyboardEvent("keydown", opts));
    target.dispatchEvent(new KeyboardEvent("keypress", opts));
    target.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  private async fillCell(idx: number, val: number): Promise<void> {
    const c = this.$(`[data-cell-idx="${idx}"]`);
    if (!c) throw new Error(`Missing cell ${idx}`);

    // Click cell to select
    this.click(c);
    await this.sleep(20);

    const btn = this.getNumberButton(val);
    if (btn) {
      this.click(btn);
      return;
    }

    // Keyboard entry fallback
    this.focusBoard();
    this.typeKey(String(val));
  }
}
