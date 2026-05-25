import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/games/*"],
  world: "MAIN",
  run_at: "document_start"
}

// Check to prevent double-initialization
if (
  !(window as unknown as Record<string, unknown>).__SOLVER_LOGGER_INITIALIZED__
) {
  ;(
    window as unknown as Record<string, unknown>
  ).__SOLVER_LOGGER_INITIALIZED__ = true

  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const sendToIsolated = (type: string, args: unknown[]) => {
    // Safely serialize arguments to string to avoid circular references and exceptions
    const serialized = args.map((arg) => {
      try {
        if (arg === null) return "null"
        if (arg === undefined) return "undefined"
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}\n${arg.stack || ""}`
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg)
        }
        return String(arg)
      } catch {
        return `[Unserializable Object: ${String(arg)}]`
      }
    })

    window.postMessage(
      {
        source: "linkedin-games-solver-logger",
        type,
        logs: serialized,
        timestamp: new Date().toLocaleTimeString()
      },
      "*"
    )
  }

  console.log = (...args) => {
    originalLog.apply(console, args)
    sendToIsolated("log", args)
  }

  console.error = (...args) => {
    originalError.apply(console, args)
    sendToIsolated("error", args)
  }

  console.warn = (...args) => {
    originalWarn.apply(console, args)
    sendToIsolated("warn", args)
  }

  console.info = (...args) => {
    originalInfo.apply(console, args)
    sendToIsolated("info", args)
  }

  // React Fiber Extraction Bridge
  window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (
      event.data?.source === "linkedin-games-solver-content" &&
      event.data?.action === "EXTRACT_REACT_STATE"
    ) {
      try {
        const data = extractReactState(event.data.gameName)
        window.postMessage(
          {
            source: "linkedin-games-solver-main",
            action: "REACT_STATE_EXTRACTED",
            requestId: event.data.requestId,
            success: true,
            data
          },
          "*"
        )
      } catch (err: any) {
        window.postMessage(
          {
            source: "linkedin-games-solver-main",
            action: "REACT_STATE_EXTRACTED",
            requestId: event.data.requestId,
            success: false,
            error: err.message || String(err)
          },
          "*"
        )
      }
    }
  })

  // LinkedIn Games Internal Protobuf/React Schemas
  interface LotkaEdge {
    $type?: string
    startIdx?: number
    endIdx?: number
    isEqual?: boolean
    [key: string]: any
  }

  interface LotkaGamePuzzle {
    $type?: string
    gridSize?: number
    presetCellIdxes?: number[]
    edges?: LotkaEdge[]
    solution?: string[]
    [key: string]: any
  }

  interface LotkaGameState {
    $type?: string
    cellValues?: string[]
    [key: string]: any
  }

  interface GridPosition {
    $type?: string
    row: number
    col: number
  }

  interface QueensGameColorRow {
    $type?: string
    colors: number[]
  }

  interface QueensGamePuzzle {
    $type?: string
    gridSize?: number
    solution?: GridPosition[]
    colorGrid?: QueensGameColorRow[]
    [key: string]: any
  }

  interface QueenGameCellGuess {
    $type?: string
    gridPosition: GridPosition
    queensGameCellType:
      | "QueensGameCellType_CLEARED"
      | "QueensGameCellType_QUEEN"
      | string
  }

  interface QueensGameState {
    $type?: string
    guesses?: QueenGameCellGuess[]
    [key: string]: any
  }

  interface TrailWall {
    $type?: string
    startIdx?: number
    endIdx?: number
    [key: string]: any
  }

  interface TrailGamePuzzle {
    $type?: string
    gridSize?: number
    orderedSequence?: number[]
    solution?: number[]
    walls?: TrailWall[]
    wallHints?: any[]
    orderedSequencePositions?: any[]
    [key: string]: any
  }

  interface TrailSegment {
    $type?: string
    cells?: number[]
  }

  interface TrailGameState {
    $type?: string
    trailSegments?: TrailSegment[]
    [key: string]: any
  }

  interface PatchesClueCell {
    $type?: string
    cellIdx: number
    shapeConstraint:
      | "PatchesShapeConstraint_UNKNOWN"
      | "PatchesShapeConstraint_SQUARE"
      | "PatchesShapeConstraint_HORIZONTAL_RECT"
      | "PatchesShapeConstraint_VERTICAL_RECT"
      | string
    numberConstraint?: number
  }

  interface PatchesRegion {
    $type?: string
    cellIdxes: number[]
  }

  interface PatchesGamePuzzle {
    $type?: string
    gridRows: number
    gridCols: number
    clueCells: PatchesClueCell[]
    solution: PatchesRegion[]
  }

  interface PatchesGameState {
    $type?: string
    drawnRegions: any[]
  }

  interface LinkedInGameObj {
    $type?: string
    gameUrn?: string
    puzzle?: {
      $case?: string
      lotkaGamePuzzle?: LotkaGamePuzzle
      queensGamePuzzle?: QueensGamePuzzle
      trailGamePuzzle?: TrailGamePuzzle
      patchesGamePuzzle?: PatchesGamePuzzle
      [key: string]: any
    }
    gameState?: {
      $type?: string
      mostRecentGameState?: {
        $case?: string
        lotkaGameState?: LotkaGameState
        queensGameState?: QueensGameState
        trailGameState?: TrailGameState
        patchesGameState?: PatchesGameState
        [key: string]: any
      }
      completionAttributes?: any
      [key: string]: any
    }
    cells?: any[]
    edges?: any[]
    constraints?: any[]
    [key: string]: any
  }

  const extractReactState = (
    gameName: "queens" | "tango" | "zip" | "patches" | string
  ): any => {
    if (
      gameName === "sudoku" ||
      gameName === "pinpoint" ||
      gameName === "crossclimb"
    ) {
      throw new Error(
        `React Fiber state extraction is not implemented/supported for Ember-based game: ${gameName}`
      )
    }

    // 1. Locate board root element dynamically
    let gridEl = document.querySelector(
      '[data-testid="interactive-grid"]'
    ) as HTMLElement
    if (!gridEl) {
      const selectors = [
        '[data-sudoku-grid="true"]',
        ".crossclimb__grid",
        ".pinpoint__board",
        ".game-board",
        '[data-testid^="patches-"]',
        'main [class*="game"]',
        "main"
      ]
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLElement
        if (el) {
          gridEl = el
          break
        }
      }
    }

    if (!gridEl) {
      throw new Error(
        "Game board element not found in DOM (tried selectors for interactive-grid, sudoku, crossclimb, pinpoint, game-board)."
      )
    }

    // 2. Identify random React internal property key
    const fiberKey = Object.keys(gridEl).find(
      (key) =>
        key.startsWith("__reactFiber$") || key.startsWith("__reactContainer$")
    )
    if (!fiberKey) {
      throw new Error(
        "React Fiber keys not found on board element. Check if React is loaded."
      )
    }

    const fiber = (gridEl as any)[fiberKey]

    // Helper to deep traverse props/state looking for keys
    const findValueInFibers = (startFiber: any, keyName: string): any => {
      let curr = startFiber
      while (curr) {
        // Inspect props
        if (curr.memoizedProps && curr.memoizedProps[keyName] !== undefined) {
          return curr.memoizedProps[keyName]
        }
        // Inspect state
        if (curr.memoizedState) {
          let stateNode = curr.memoizedState
          while (stateNode) {
            if (
              stateNode.memoizedState &&
              stateNode.memoizedState[keyName] !== undefined
            ) {
              return stateNode.memoizedState[keyName]
            }
            stateNode = stateNode.next
          }
        }
        curr = curr.return
      }
      return null
    }

    // 3. Search return tree for a "game" prop object (which contains complete clean models)
    let currFiber = fiber
    let gameObj: LinkedInGameObj | null = null
    while (currFiber) {
      if (
        currFiber.memoizedProps &&
        currFiber.memoizedProps.game &&
        typeof currFiber.memoizedProps.game === "object"
      ) {
        gameObj = currFiber.memoizedProps.game
        break
      }
      currFiber = currFiber.return
    }

    if (gameObj) {
      console.log(
        "[Test] Found parent React game state object! Properties:",
        Object.keys(gameObj)
      )
      if (gameObj.puzzle) {
        console.log(
          "[Test]   - game.puzzle properties:",
          Object.keys(gameObj.puzzle)
        )
        const puzzleCase = gameObj.puzzle.$case
        if (puzzleCase && gameObj.puzzle[puzzleCase]) {
          console.log(
            `[Test]   - game.puzzle.${puzzleCase} properties:`,
            Object.keys(gameObj.puzzle[puzzleCase])
          )
          console.log(
            `[Test]   - ${puzzleCase} JSON:`,
            JSON.stringify(gameObj.puzzle[puzzleCase])
          )
        }
      }
      if (gameObj.gameState) {
        console.log(
          "[Test]   - game.gameState properties:",
          Object.keys(gameObj.gameState)
        )
        if (gameObj.gameState.mostRecentGameState) {
          console.log(
            "[Test]   - game.gameState.mostRecentGameState properties:",
            Object.keys(gameObj.gameState.mostRecentGameState)
          )
          const stateCase = gameObj.gameState.mostRecentGameState.$case
          if (stateCase && gameObj.gameState.mostRecentGameState[stateCase]) {
            console.log(
              `[Test]   - mostRecentGameState.${stateCase} properties:`,
              Object.keys(gameObj.gameState.mostRecentGameState[stateCase])
            )
            console.log(
              `[Test]   - ${stateCase} JSON:`,
              JSON.stringify(gameObj.gameState.mostRecentGameState[stateCase])
            )
          }
        }
      }
    }

    // Generic fallback helper to pull key from game object, then recursively up the fiber tree
    const getBoardProperty = (keyName: string): any => {
      if (gameObj) {
        if (gameObj[keyName] !== undefined) return gameObj[keyName]

        // lotkaGamePuzzle
        if (
          gameObj.puzzle &&
          gameObj.puzzle.lotkaGamePuzzle &&
          gameObj.puzzle.lotkaGamePuzzle[keyName] !== undefined
        ) {
          return gameObj.puzzle.lotkaGamePuzzle[keyName]
        }

        // mostRecentGameState
        if (
          gameObj.gameState &&
          gameObj.gameState.mostRecentGameState &&
          gameObj.gameState.mostRecentGameState[keyName] !== undefined
        ) {
          return gameObj.gameState.mostRecentGameState[keyName]
        }

        if (gameObj.puzzle && gameObj.puzzle[keyName] !== undefined)
          return gameObj.puzzle[keyName]
        if (gameObj.gameState && gameObj.gameState[keyName] !== undefined)
          return gameObj.gameState[keyName]
        if (gameObj.board && gameObj.board[keyName] !== undefined)
          return gameObj.board[keyName]
        if (gameObj.grid && gameObj.grid[keyName] !== undefined)
          return gameObj.grid[keyName]
      }
      return findValueInFibers(fiber, keyName)
    }

    // Multi-level robust board N size inference
    const getBoardSize = (): number => {
      const sizeVal =
        getBoardProperty("boardSize") ||
        getBoardProperty("size") ||
        getBoardProperty("width") ||
        getBoardProperty("gridCols")

      if (typeof sizeVal === "number" && sizeVal > 0) return sizeVal

      // Parse from computed custom variables (style="--_28d16da7: 6;")
      const inlineStyle = gridEl.getAttribute("style") || ""
      const matches = inlineStyle.match(/--[\w-]+:\s*(\d+)/g)
      if (matches) {
        for (const m of matches) {
          const val = parseInt(m.split(":")[1], 10)
          if (val > 0 && val < 20) return val
        }
      }

      const cellsCount = gridEl.querySelectorAll(
        '[data-testid^="cell-"]'
      ).length
      if (cellsCount > 0) {
        return Math.round(Math.sqrt(cellsCount))
      }
      return 6
    }

    // Generic cells array lookup
    const getCellsArray = (): any[] | null => {
      if (gameObj) {
        if (Array.isArray(gameObj.cells)) return gameObj.cells

        // Nested under puzzle.lotkaGamePuzzle
        if (gameObj.puzzle && gameObj.puzzle.lotkaGamePuzzle) {
          const l = gameObj.puzzle.lotkaGamePuzzle
          if (Array.isArray(l.cells)) return l.cells
          if (l.board && Array.isArray(l.board.cells)) return l.board.cells
          if (l.grid && Array.isArray(l.grid.cells)) return l.grid.cells
          if (Array.isArray(l.board)) return l.board
          if (Array.isArray(l.grid)) return l.grid
        }

        // Nested under gameState.mostRecentGameState
        if (gameObj.gameState && gameObj.gameState.mostRecentGameState) {
          const m = gameObj.gameState.mostRecentGameState
          if (Array.isArray(m.cells)) return m.cells
          if (m.board && Array.isArray(m.board.cells)) return m.board.cells
          if (m.grid && Array.isArray(m.grid.cells)) return m.grid.cells
          if (Array.isArray(m.board)) return m.board
          if (Array.isArray(m.grid)) return m.grid
        }

        // Nested under puzzle
        if (gameObj.puzzle) {
          if (Array.isArray(gameObj.puzzle.cells)) return gameObj.puzzle.cells
          if (gameObj.puzzle.board && Array.isArray(gameObj.puzzle.board.cells))
            return gameObj.puzzle.board.cells
          if (gameObj.puzzle.grid && Array.isArray(gameObj.puzzle.grid.cells))
            return gameObj.puzzle.grid.cells
          if (Array.isArray(gameObj.puzzle.board)) return gameObj.puzzle.board
          if (Array.isArray(gameObj.puzzle.grid)) return gameObj.puzzle.grid
        }

        // Nested under gameState
        if (gameObj.gameState) {
          if (Array.isArray(gameObj.gameState.cells))
            return gameObj.gameState.cells
          if (
            gameObj.gameState.board &&
            Array.isArray(gameObj.gameState.board.cells)
          )
            return gameObj.gameState.board.cells
          if (
            gameObj.gameState.grid &&
            Array.isArray(gameObj.gameState.grid.cells)
          )
            return gameObj.gameState.grid.cells
          if (Array.isArray(gameObj.gameState.board))
            return gameObj.gameState.board
          if (Array.isArray(gameObj.gameState.grid))
            return gameObj.gameState.grid
        }

        if (gameObj.board && Array.isArray(gameObj.board.cells))
          return gameObj.board.cells
        if (gameObj.grid && Array.isArray(gameObj.grid.cells))
          return gameObj.grid.cells
      }
      const raw = findValueInFibers(fiber, "cells")
      if (Array.isArray(raw)) return raw
      return null
    }

    // 4. Compile schemas by game type
    if (gameName === "queens") {
      let boardSize = getBoardSize()
      let cells: any[] | null = null

      const queensPuzzle = gameObj?.puzzle?.queensGamePuzzle
      const queensState =
        gameObj?.gameState?.mostRecentGameState?.queensGameState

      if (
        queensPuzzle &&
        queensPuzzle.gridSize &&
        Array.isArray(queensPuzzle.colorGrid)
      ) {
        boardSize = queensPuzzle.gridSize
        const N = boardSize
        const guesses = queensState?.guesses || []

        cells = Array.from({ length: N * N }, (_, idx) => {
          const row = Math.floor(idx / N)
          const col = idx % N
          const regionId =
            queensPuzzle.colorGrid?.[row]?.colors?.[col] !== undefined
              ? queensPuzzle.colorGrid[row].colors[col]
              : 0

          // Find if there is a player guess for this position
          const guess = guesses.find(
            (g: any) =>
              g.gridPosition &&
              g.gridPosition.row === row &&
              g.gridPosition.col === col
          )

          let state = -1
          if (guess) {
            if (guess.queensGameCellType === "QueensGameCellType_QUEEN") {
              state = 1
            } else if (
              guess.queensGameCellType === "QueensGameCellType_CLEARED" ||
              guess.queensGameCellType === "QueensGameCellType_MARKER"
            ) {
              state = 0
            }
          }

          return {
            idx,
            regionId,
            state,
            isGiven: false
          }
        })
      }

      // If we couldn't extract using the queens schema, fall back to the generic arrays
      if (!cells) {
        const rawCells = getCellsArray()
        if (rawCells) {
          cells = rawCells.map((cell: any, idx: number) => ({
            idx,
            regionId:
              cell.regionId !== undefined
                ? cell.regionId
                : cell.colorId !== undefined
                  ? cell.colorId
                  : cell.color,
            state:
              cell.state !== undefined
                ? cell.state
                : cell.hasQueen
                  ? 1
                  : cell.hasMarker
                    ? 0
                    : -1,
            isGiven: !!cell.isGiven
          }))
        }
      }

      if (cells && cells.length > 0) {
        return {
          game: "queens",
          boardSize,
          cells
        }
      }

      throw new Error(
        "Unable to locate 'cells' array in Queens React Fiber tree."
      )
    }

    if (gameName === "tango") {
      let size = getBoardSize()
      let cells: any[] | null = null
      let constraints: any[] | null = null

      const lotkaPuzzle = gameObj?.puzzle?.lotkaGamePuzzle
      const lotkaState = gameObj?.gameState?.mostRecentGameState?.lotkaGameState

      if (lotkaPuzzle && lotkaPuzzle.gridSize) {
        size = lotkaPuzzle.gridSize
        const presetCellIdxes = lotkaPuzzle.presetCellIdxes || []
        const cellValues = lotkaState?.cellValues || []
        cells = Array.from({ length: size * size }, (_, idx) => {
          const rawVal = cellValues[idx] || ""
          let val = -1
          if (rawVal.includes("ZERO")) val = 0
          else if (rawVal.includes("ONE")) val = 1

          return {
            idx,
            value: val,
            isGiven: presetCellIdxes.includes(idx)
          }
        })

        if (Array.isArray(lotkaPuzzle.edges)) {
          constraints = lotkaPuzzle.edges.map((e: any) => ({
            a: e.startIdx !== undefined ? e.startIdx : e.from,
            b: e.endIdx !== undefined ? e.endIdx : e.to,
            type:
              e.isEqual === true || e.type === "equal" || e.type === "eq"
                ? "eq"
                : "neq"
          }))
        }
      }

      // If we couldn't extract using the lotka schema, fall back to the generic arrays
      if (!cells) {
        const rawCells = getCellsArray()
        if (rawCells) {
          cells = rawCells.map((cell: any, idx: number) => ({
            idx,
            value: cell.value !== undefined ? cell.value : -1,
            isGiven: !!cell.isGiven
          }))
        }
      }

      if (!constraints) {
        // Look for edges/constraints array
        const getTangoConstraints = (): any[] | null => {
          if (gameObj) {
            if (Array.isArray(gameObj.constraints)) return gameObj.constraints
            if (Array.isArray(gameObj.edges)) return gameObj.edges

            // Nested under puzzle.lotkaGamePuzzle
            if (gameObj.puzzle && gameObj.puzzle.lotkaGamePuzzle) {
              const l = gameObj.puzzle.lotkaGamePuzzle
              if (Array.isArray(l.constraints)) return l.constraints
              if (Array.isArray(l.edges)) return l.edges
              if (l.board && Array.isArray(l.board.constraints))
                return l.board.constraints
              if (l.board && Array.isArray(l.board.edges)) return l.board.edges
            }

            // Nested under puzzle
            if (gameObj.puzzle) {
              if (Array.isArray(gameObj.puzzle.constraints))
                return gameObj.puzzle.constraints
              if (Array.isArray(gameObj.puzzle.edges))
                return gameObj.puzzle.edges
              if (
                gameObj.puzzle.board &&
                Array.isArray(gameObj.puzzle.board.constraints)
              )
                return gameObj.puzzle.board.constraints
              if (
                gameObj.puzzle.board &&
                Array.isArray(gameObj.puzzle.board.edges)
              )
                return gameObj.puzzle.board.edges
            }

            // Nested under gameState.mostRecentGameState
            if (gameObj.gameState && gameObj.gameState.mostRecentGameState) {
              const m = gameObj.gameState.mostRecentGameState
              if (Array.isArray(m.constraints)) return m.constraints
              if (Array.isArray(m.edges)) return m.edges
            }

            // Nested under gameState
            if (gameObj.gameState) {
              if (Array.isArray(gameObj.gameState.constraints))
                return gameObj.gameState.constraints
              if (Array.isArray(gameObj.gameState.edges))
                return gameObj.gameState.edges
            }

            if (gameObj.board && Array.isArray(gameObj.board.constraints))
              return gameObj.board.constraints
            if (gameObj.grid && Array.isArray(gameObj.grid.constraints))
              return gameObj.grid.constraints
            if (gameObj.board && Array.isArray(gameObj.board.edges))
              return gameObj.board.edges
            if (gameObj.grid && Array.isArray(gameObj.grid.edges))
              return gameObj.grid.edges
          }
          const raw =
            findValueInFibers(fiber, "constraints") ||
            findValueInFibers(fiber, "edges")
          if (Array.isArray(raw)) return raw
          return null
        }

        const rawConstraints = getTangoConstraints()
        if (rawConstraints) {
          constraints = rawConstraints.map((c: any) => ({
            a:
              c.cellA !== undefined
                ? c.cellA
                : c.startIdx !== undefined
                  ? c.startIdx
                  : c.from,
            b:
              c.cellB !== undefined
                ? c.cellB
                : c.endIdx !== undefined
                  ? c.endIdx
                  : c.to,
            type:
              c.isEqual === true || c.type === "equal" || c.type === "eq"
                ? "eq"
                : "neq"
          }))
        }
      }

      return {
        game: "tango",
        size,
        cells,
        constraints
      }
    }

    if (gameName === "zip") {
      let size = getBoardSize()
      let checkpoints: any[] = []
      let walls: any[] = []

      const trailPuzzle = gameObj?.puzzle?.trailGamePuzzle

      if (trailPuzzle && trailPuzzle.gridSize) {
        size = trailPuzzle.gridSize
        if (Array.isArray(trailPuzzle.orderedSequence)) {
          checkpoints = trailPuzzle.orderedSequence.map(
            (idx: number, idxInSeq: number) => ({
              value: idxInSeq + 1,
              idx
            })
          )
        }

        if (Array.isArray(trailPuzzle.walls)) {
          walls = trailPuzzle.walls
            .map((w: any) => {
              const a =
                w.startIdx !== undefined
                  ? w.startIdx
                  : w.from !== undefined
                    ? w.from
                    : w.cellA
              const b =
                w.endIdx !== undefined
                  ? w.endIdx
                  : w.to !== undefined
                    ? w.to
                    : w.cellB
              if (a !== undefined && b !== undefined) {
                return { a, b }
              }
              return null
            })
            .filter(Boolean)
        }
      }

      return {
        game: "zip",
        size,
        checkpoints,
        walls
      }
    }

    if (gameName === "patches") {
      const patchesPuzzle = gameObj?.puzzle?.patchesGamePuzzle
      if (!patchesPuzzle) {
        throw new Error(
          "Unable to locate 'patchesGamePuzzle' in Patches React Fiber tree."
        )
      }

      const gridRows = patchesPuzzle.gridRows || 6
      const gridCols = patchesPuzzle.gridCols || 6
      const clueCells = patchesPuzzle.clueCells || []

      const clues = clueCells.map((clue: PatchesClueCell) => {
        const idx = clue.cellIdx
        const r = Math.floor(idx / gridCols)
        const c = idx % gridCols
        const size =
          clue.numberConstraint && clue.numberConstraint > 0
            ? clue.numberConstraint
            : null

        let type: "square" | "tall" | "wide" | "any"
        switch (clue.shapeConstraint) {
          case "PatchesShapeConstraint_HORIZONTAL_RECT":
            type = "wide"
            break
          case "PatchesShapeConstraint_VERTICAL_RECT":
            type = "tall"
            break
          case "PatchesShapeConstraint_SQUARE":
            type = "square"
            break
          default:
            type = "any"
        }

        return {
          idx,
          r,
          c,
          size,
          type
        }
      })

      const solution = patchesPuzzle.solution
        ? patchesPuzzle.solution.map((r: PatchesRegion) => r.cellIdxes)
        : undefined

      return {
        game: "patches",
        gridRows,
        gridCols,
        clues,
        solution
      }
    }

    throw new Error(
      `State extraction not implemented yet for game: ${gameName}`
    )
  }

  // Expose direct console test function
  ;(window as any).testReactExtraction = (gameName: string) => {
    try {
      console.log(`[Test] Running React Fiber extraction for '${gameName}'...`)
      const state = extractReactState(gameName)
      console.log(`[Test] Extraction Successful:`, state)
      return state
    } catch (err: any) {
      console.error(`[Test] Extraction Failed:`, err.message || err)
    }
  }
}
